import express from "express";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
// 这是项目自己的轻量后端，用来把前端页面和 NCM 服务衔接起来。
// 这一层的意义主要有两个：
// 1. 统一把上游接口转换成前端更好用的数据结构
// 2. 代理音频流，避免前端直接暴露和依赖上游音源地址
const app = express();
const PORT = 3001;
app.use(express.json());
const NCM_BASE_URL = process.env.NCM_API_BASE_URL ?? 'http://127.0.0.1:3000'

// fetchNcm 是访问上游 NCM 接口的统一入口。
// 它负责拼 URL、附带 query 参数，并把非 2xx 响应转成异常，
// 这样每个业务接口就能专心做“参数校验 + 数据映射”。
async function fetchNcm(path, params = {}) {
  const url = new URL(path, NCM_BASE_URL)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`)
  }

  return response.json()
}

// 默认音质与浏览器接口码率设置。
// 这里抽成常量后，后续要从环境变量切换音质策略会更方便。
const DEFAULT_SONG_LEVEL = process.env.NCM_SONG_LEVEL ?? 'standard'
const DEFAULT_BROWSER_BR = Number(process.env.NCM_BROWSER_BR ?? 320000)
// 代理音频流时，只透传和流媒体播放相关的关键响应头。
// 这样既能保留 range/缓存等能力，又避免无关头部污染响应。
const AUDIO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]
const VIDEO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]
const MV_COLLECTIONS = [
  {
    key: 'all',
    label: '全部',
    badge: '精选',
    description: '热门 MV 一次看全，适合先逛一圈找今天的第一支视频。',
    endpoint: '/mv/all',
    getParams(limit) {
      return {
        area: '全部',
        limit,
        offset: 0,
        order: '最热',
        type: '全部',
      }
    },
  },
  {
    key: 'official',
    label: '官方',
    badge: '官方版',
    description: '更完整的主视觉和叙事表达，适合看完整制作感。',
    endpoint: '/mv/all',
    getParams(limit) {
      return {
        area: '全部',
        limit,
        offset: 0,
        order: '最热',
        type: '官方版',
      }
    },
  },
  {
    key: 'live',
    label: '现场',
    badge: '现场版',
    description: '收一点现场呼吸感，把舞台和掌声都带回来。',
    endpoint: '/mv/all',
    getParams(limit) {
      return {
        area: '全部',
        limit,
        offset: 0,
        order: '最热',
        type: '现场版',
      }
    },
  },
  {
    key: 'exclusive',
    label: '网易出品',
    badge: '网易出品',
    description: '平台精选企划和独家内容，更适合慢慢挑着看。',
    endpoint: '/mv/exclusive/rcmd',
    getParams(limit) {
      return {
        limit,
        offset: 0,
      }
    },
  },
]
const MV_COLLECTION_MAP = Object.fromEntries(MV_COLLECTIONS.map((item) => [item.key, item]))

// 统一成功响应格式，让前端 request 工具可以稳定地解包 data。
function ok(data) {
  return {
    code: 200,
    data,
    message: 'ok',
  }
}
// 把 limit 参数做一层兜底：非法值直接退回默认值。
// 这样各个列表接口就不用重复写 Number() 和边界判断了。
function getLimit(value, total) {
  const limit = Number(value)

  if (!Number.isFinite(limit) || limit <= 0) {
    return total
  }

  return limit
}

function getOffset(value) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset < 0) {
    return 0
  }

  return Math.floor(offset)
}

function getMvCollectionKey(value) {
  const key = String(value ?? '').trim()

  return MV_COLLECTION_MAP[key] ? key : 'all'
}

function getMvItemsFromPayload(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.result)) {
    return payload.result
  }

  if (Array.isArray(payload?.mvs)) {
    return payload.mvs
  }

  return []
}

function getMvCoverUrl(item) {
  return item.cover ?? item.coverUrl ?? item.picUrl ?? item.imgurl16v9 ?? item.imgurl ?? ''
}

function getMvDuration(item) {
  const duration = Number(item.duration ?? item.durationms ?? item.playTimeLength ?? item.durationMs)

  return Number.isFinite(duration) && duration > 0 ? duration : undefined
}

function getMvPlayCount(item) {
  const playCount = Number(item.playCount ?? item.playTime ?? item.playCountNum)

  return Number.isFinite(playCount) && playCount > 0 ? playCount : undefined
}

function getMvResolutionEntries(detail) {
  const brs = detail?.brs

  if (!brs || typeof brs !== 'object') {
    return []
  }

  return Object.keys(brs)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => right - left)
    .map((value) => ({
      label: `${value}p`,
      value,
    }))
}

function getPreferredMvResolution(detail, requestedResolution) {
  const availableResolutions = getMvResolutionEntries(detail)

  if (availableResolutions.length === 0) {
    return requestedResolution
  }

  const numericRequestedResolution = Number(requestedResolution)

  if (availableResolutions.some((item) => item.value === numericRequestedResolution)) {
    return numericRequestedResolution
  }

  return availableResolutions[0]?.value ?? requestedResolution
}

function getDefaultMvResolution(detail) {
  return getMvResolutionEntries(detail)[0]?.value ?? 1080
}

async function resolveMvSource(id, resolution) {
  const payload = await fetchNcm('/mv/url', {
    id,
    r: resolution,
  })
  const source = payload.data ?? {}

  return {
    expiresIn: source.expi,
    requestedResolution: resolution,
    resolution: Number(source.r ?? resolution) || resolution,
    type: source.type,
    url: source.url ?? '',
  }
}

function normalizeFeaturedMvItem(item, collection) {
  const artistNames = getArtistNames(item.artists ?? item.artistName ?? item.artistNames)
  const title = String(item.name ?? item.title ?? '').trim()
  const id = String(item.id ?? item.vid ?? '').trim()

  return {
    id,
    title,
    artistNames,
    badge: collection.badge,
    coverUrl: getMvCoverUrl(item),
    duration: getMvDuration(item),
    playCount: getMvPlayCount(item),
    subtitle: String(item.copywriter ?? collection.description ?? '').trim(),
  }
}

function getArtistNames(value) {
  if (Array.isArray(value)) {
    return value
      .map((artist) => {
        if (typeof artist === 'string') {
          return artist
        }

        return artist?.name
      })
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

async function getSongCoverUrlsByIds(ids) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))

  if (uniqueIds.length === 0) {
    return new Map()
  }

  const payload = await fetchNcm('/song/detail', {
    ids: uniqueIds.join(','),
  })
  const coverUrlMap = new Map()

  for (const song of payload.songs ?? []) {
    const coverUrl = song.al?.picUrl ?? song.album?.picUrl ?? ''

    if (coverUrl) {
      coverUrlMap.set(String(song.id), coverUrl)
    }
  }

  return coverUrlMap
}

// 解析歌曲播放源时先尝试 /song/url，再回退到 /song/url/v1。
// 这么做是为了尽量兼容不同歌曲、不同上游接口在音源可用性上的差异。
async function resolveSongSource(id, level) {
  const browserPayload = await fetchNcm('/song/url', {
    id,
    br: DEFAULT_BROWSER_BR,
  })
  let song = browserPayload.data?.[0]
  let sourceMode = 'song/url'

  if (!song?.url) {
    const fallbackPayload = await fetchNcm('/song/url/v1', { id, level })
    song = fallbackPayload.data?.[0]
    sourceMode = 'song/url/v1'
  }

  return {
    song,
    sourceMode,
  }
}

// 前端播放器不直接用上游 song.url，而是统一走我们自己的 stream 代理地址。
// 这样后续如果上游换源、补鉴权、做日志，都不用改前端。
function buildStreamUrl(id, level) {
  const params = new URLSearchParams({
    id,
    level,
  })

  return `/api/player/stream?${params.toString()}`
}

app.get('/api/health', (req, res) => {
  res.json(ok({ status: 'running' }))
})
// banner 的 targetType 是上游定义的数字，
// 这里翻译成更易读的业务枚举，前端拿到后更容易做跳转判断。
function mapBannerTargetType(targetType) {
  if (targetType === 1) return 'song'
  if (targetType === 1000) return 'playlist'
  if (targetType === 100) return 'artist'
  return 'unknown'
}
// 首页 banner：从上游取数据，再裁切并映射成前端展示结构。
app.get('/api/home/banners', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 5)
    const payload = await fetchNcm('/banner', { type: 0 })

    const data = (payload.banners ?? []).slice(0, limit).map((item) => ({
      id: String(item.targetId ?? ''),
      title: item.typeTitle ?? '推荐内容',
      imageUrl: item.imageUrl ?? '',
      subtitle: '',
      badge: item.typeTitle ?? '',
      targetId: item.targetId ? String(item.targetId) : undefined,
      targetType: mapBannerTargetType(item.targetType),
    }))

    res.json(ok(data))
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})
// 首页推荐歌单：这里把接口字段压平，前端就不需要知道上游的 result/picUrl/copywriter 这些细节。
app.get('/api/home/recommended-playlists', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 12)
    const payload = await fetchNcm('/personalized', { limit })

    const data = (payload.result ?? []).map((item) => ({
      id: String(item.id),
      title: item.name,
      coverUrl: item.picUrl ?? '',
      playCount: item.playCount,
      description: item.copywriter ?? '',
    }))

    res.json(ok(data))
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

// 歌单详情页接口。
// 这里把封面、创建者、统计信息和歌曲列表统一整理成前端可直接渲染的结构。
app.get('/api/playlists/detail', async (req, res) => {
  try {
    const id = String(req.query.id ?? '').trim()

    if (!id) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'playlist id is required',
      })
      return
    }

    const payload = await fetchNcm('/playlist/detail', {
      id,
      n: 1000,
      s: 8,
    })
    const playlist = payload.playlist

    if (!playlist) {
      res.status(404).json({
        code: 404,
        data: null,
        message: 'playlist not found',
      })
      return
    }

    const tracks = (playlist.tracks ?? []).map((item) => ({
      id: String(item.id),
      name: item.name ?? '',
      coverUrl: item.al?.picUrl ?? item.album?.picUrl ?? playlist.coverImgUrl ?? '',
      artistNames: getArtistNames(item.ar ?? item.artists),
      albumName: item.al?.name ?? item.album?.name ?? '未知专辑',
      duration: item.dt ?? item.duration,
      playable: item.privilege?.st !== -200 && item.noCopyrightR !== 1,
    }))

    res.json(
      ok({
        id: String(playlist.id),
        name: playlist.name ?? '',
        coverUrl: playlist.coverImgUrl ?? '',
        description: playlist.description ?? '',
        tags: Array.isArray(playlist.tags) ? playlist.tags.filter(Boolean) : [],
        trackCount: Number(playlist.trackCount ?? tracks.length),
        playCount: Number(playlist.playCount ?? 0),
        subscribedCount: Number(playlist.subscribedCount ?? 0),
        commentCount: Number(playlist.commentCount ?? 0),
        shareCount: Number(playlist.shareCount ?? 0),
        createTime: playlist.createTime,
        updateTime: playlist.updateTime,
        trackUpdateTime: playlist.trackUpdateTime,
        creator: {
          id: playlist.creator?.userId ? String(playlist.creator.userId) : '',
          nickname: playlist.creator?.nickname ?? '未知创建者',
          avatarUrl: playlist.creator?.avatarUrl ?? '',
        },
        tracks,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})


// 首页热门歌手。
app.get('/api/home/hot-artists', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 10)
    const payload = await fetchNcm('/top/artists', { limit })

    const data = (payload.artists ?? []).map((item) => ({
      id: String(item.id),
      name: item.name,
      avatarUrl: item.img1v1Url ?? item.picUrl ?? '',
      musicCount: item.musicSize,
    }))

    res.json(ok(data))
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})


// 首页热门单曲。
// 这里把歌曲数据整理成前端可直接消费的结构，并先默认标记为可播放。
app.get('/api/home/hot-songs', async (req, res) => {
  try {
    const limit = getLimit(req.query.limit, 10)
    const payload = await fetchNcm('/personalized/newsong', { limit })

    const data = (payload.result ?? []).map((item) => ({
      id: String(item.id ?? item.song?.id ?? ''),
      name: item.name ?? item.song?.name ?? '',
      coverUrl: item.picUrl ?? item.song?.album?.picUrl ?? item.song?.al?.picUrl ?? '',
      artistNames: (item.song?.artists ?? item.song?.ar ?? []).map((artist) => artist.name),
      duration: item.song?.duration ?? item.song?.dt,
      playable: true,
    }))

    res.json(ok(data))
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

// 搜索歌曲接口。
// 这个接口是“搜索页最小闭环”的后端支撑：
// 传关键词进来，返回总数和歌曲列表出去。
app.get('/api/search/songs', async (req, res) => {
  try {
    const keywords = String(req.query.keywords ?? '').trim()

    // 没关键词就没有搜索意义，直接返回 400。
    if (!keywords) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'keywords is required',
      })
      return
    }

    // 单曲列表采用更大的页容量，桌面端更接近完整曲库表格的观感。
    const limit = Math.min(getLimit(req.query.limit, 40), 60)
    const offset = getOffset(req.query.offset)
    const payload = await fetchNcm('/search', {
      keywords,
      limit,
      offset,
      type: 1,
    })

    // 这里的 map 做了一个“后端适配层”工作：
    // 把上游搜索结果整理成前端搜索页需要的字段集合。
    const songs = (payload.result?.songs ?? []).map((item) => ({
      id: String(item.id),
      name: item.name ?? '',
      coverUrl: item.album?.picUrl ?? item.al?.picUrl ?? '',
      artistNames: (item.artists ?? item.ar ?? []).map((artist) => artist.name).filter(Boolean),
      albumName: item.album?.name ?? item.al?.name ?? '未知专辑',
      duration: item.duration ?? item.dt,
      playable: true,
    }))
    const missingCoverSongIds = songs.filter((song) => !song.coverUrl).map((song) => song.id)

    if (missingCoverSongIds.length > 0) {
      const coverUrlMap = await getSongCoverUrlsByIds(missingCoverSongIds)

      for (const song of songs) {
        if (!song.coverUrl) {
          song.coverUrl = coverUrlMap.get(song.id) ?? ''
        }
      }
    }

    res.json(
      ok({
        keyword: keywords,
        total: Number(payload.result?.songCount ?? songs.length),
        songs,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

app.get('/api/search/playlists', async (req, res) => {
  try {
    const keywords = String(req.query.keywords ?? '').trim()

    if (!keywords) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'keywords is required',
      })
      return
    }

    const limit = Math.min(getLimit(req.query.limit, 18), 30)
    const offset = getOffset(req.query.offset)
    const payload = await fetchNcm('/search', {
      keywords,
      limit,
      offset,
      type: 1000,
    })

    const playlists = (payload.result?.playlists ?? []).map((item) => ({
      id: String(item.id),
      name: item.name ?? '',
      coverUrl: item.coverImgUrl ?? item.picUrl ?? '',
      creatorName: item.creator?.nickname ?? '未知创建者',
      description: item.description ?? '',
      playCount: item.playCount,
      trackCount: item.trackCount,
    }))

    res.json(
      ok({
        keyword: keywords,
        total: Number(payload.result?.playlistCount ?? playlists.length),
        playlists,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

app.get('/api/search/mvs', async (req, res) => {
  try {
    const keywords = String(req.query.keywords ?? '').trim()

    if (!keywords) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'keywords is required',
      })
      return
    }

    const limit = Math.min(getLimit(req.query.limit, 18), 30)
    const offset = getOffset(req.query.offset)
    const payload = await fetchNcm('/search', {
      keywords,
      limit,
      offset,
      type: 1004,
    })

    const mvs = (payload.result?.mvs ?? []).map((item) => ({
      id: String(item.id),
      name: item.name ?? '',
      artistNames: getArtistNames(item.artists ?? item.artistName ?? item.artistNames),
      coverUrl: item.cover ?? item.imgurl ?? '',
      duration: item.duration,
      playCount: item.playCount,
    }))

    res.json(
      ok({
        keyword: keywords,
        total: Number(payload.result?.mvCount ?? mvs.length),
        mvs,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

app.get('/api/mvs/featured', async (req, res) => {
  try {
    const collectionKey = getMvCollectionKey(req.query.collection)
    const collection = MV_COLLECTION_MAP[collectionKey]
    const limit = Math.min(getLimit(req.query.limit, 12), 24)
    const payload = await fetchNcm(collection.endpoint, collection.getParams(limit))
    const items = getMvItemsFromPayload(payload)
      .map((item) => normalizeFeaturedMvItem(item, collection))
      .filter((item) => item.id && item.title)
      .slice(0, limit)

    res.json(
      ok({
        categories: MV_COLLECTIONS.map(({ key, label, description }) => ({
          key,
          label,
          description,
        })),
        collection: {
          key: collection.key,
          label: collection.label,
          description: collection.description,
        },
        items,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

app.get('/api/mvs/detail', async (req, res) => {
  try {
    const id = String(req.query.id ?? '').trim()

    if (!id) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'mv id is required',
      })
      return
    }

    const payload = await fetchNcm('/mv/detail', {
      mvid: id,
    })
    const detail = payload.data

    if (!detail) {
      res.status(404).json({
        code: 404,
        data: null,
        message: 'mv not found',
      })
      return
    }

    const availableResolutions = getMvResolutionEntries(detail)

    res.json(
      ok({
        id: String(detail.id ?? id),
        title: detail.name ?? '',
        coverUrl: getMvCoverUrl(detail),
        artistName: detail.artistName ?? (getArtistNames(detail.artists).join(' / ') || '未知歌手'),
        artistNames: getArtistNames(detail.artists ?? detail.artistName),
        description: detail.desc ?? '',
        duration: getMvDuration(detail),
        playCount: getMvPlayCount(detail),
        publishTime: detail.publishTime ?? '',
        shareCount: Number(detail.shareCount ?? 0),
        commentCount: Number(detail.commentCount ?? 0),
        subscribedCount: Number(detail.subCount ?? detail.subscribedCount ?? 0),
        availableResolutions,
        defaultResolution: getDefaultMvResolution(detail),
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

app.get('/api/mvs/source', async (req, res) => {
  try {
    const id = String(req.query.id ?? '').trim()

    if (!id) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'mv id is required',
      })
      return
    }

    const detailPayload = await fetchNcm('/mv/detail', {
      mvid: id,
    })
    const detail = detailPayload.data

    if (!detail) {
      res.status(404).json({
        code: 404,
        data: null,
        message: 'mv not found',
      })
      return
    }

    const requestedResolution = Number(req.query.r ?? getDefaultMvResolution(detail)) || getDefaultMvResolution(detail)
    const safeResolution = getPreferredMvResolution(detail, requestedResolution)
    const source = await resolveMvSource(id, safeResolution)

    if (!source.url) {
      res.status(404).json({
        code: 404,
        data: null,
        message: '当前 MV 暂无可用视频地址',
      })
      return
    }

    res.json(
      ok({
        expiresIn: source.expiresIn,
        id,
        requestedResolution: source.requestedResolution,
        resolution: source.resolution,
        streamUrl: `/api/mvs/stream?id=${encodeURIComponent(id)}&r=${encodeURIComponent(String(source.resolution))}`,
        type: source.type,
        url: source.url,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

app.get('/api/mvs/stream', async (req, res) => {
  try {
    const id = String(req.query.id ?? '').trim()

    if (!id) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'mv id is required',
      })
      return
    }

    const detailPayload = await fetchNcm('/mv/detail', {
      mvid: id,
    })
    const detail = detailPayload.data

    if (!detail) {
      res.status(404).json({
        code: 404,
        data: null,
        message: 'mv not found',
      })
      return
    }

    const requestedResolution = Number(req.query.r ?? getDefaultMvResolution(detail)) || getDefaultMvResolution(detail)
    const safeResolution = getPreferredMvResolution(detail, requestedResolution)
    const source = await resolveMvSource(id, safeResolution)

    if (!source.url) {
      res.status(404).json({
        code: 404,
        data: null,
        message: '当前 MV 暂无可用视频地址',
      })
      return
    }

    const upstreamHeaders = new Headers()

    if (req.headers.range) {
      upstreamHeaders.set('Range', req.headers.range)
    }

    const upstreamResponse = await fetch(source.url, {
      headers: upstreamHeaders,
      redirect: 'follow',
    })

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      throw new Error(`Video stream request failed: ${upstreamResponse.status}`)
    }

    for (const headerName of VIDEO_RESPONSE_HEADERS) {
      const headerValue = upstreamResponse.headers.get(headerName)

      if (headerValue) {
        res.setHeader(headerName, headerValue)
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') ?? 'bytes')

    if (!res.getHeader('content-type')) {
      res.setHeader('Content-Type', 'video/mp4')
    }

    res.status(upstreamResponse.status)

    if (!upstreamResponse.body) {
      res.end()
      return
    }

    Readable.fromWeb(upstreamResponse.body).pipe(res)
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

// 提供给播放器 store 的“获取歌曲音源”接口。
// 返回的不只是 url，还包括码率、音质等级、采样率等调试和展示信息。
app.get('/api/player/song-url', async (req, res) => {
  try {
    const id = String(req.query.id ?? '').trim()

    if (!id) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'song id is required',
      })
      return
    }

    const level = String(req.query.level ?? DEFAULT_SONG_LEVEL)
    const { song, sourceMode } = await resolveSongSource(id, level)

    if (!song?.url) {
      res.status(404).json({
        code: 404,
        data: null,
        message: '当前歌曲暂无可用音源',
      })
      return
    }

    res.json(
      ok({
        id,
        bitrate: song.br,
        expiresIn: song.expi,
        level: song.level ?? level,
        sampleRate: song.sr,
        sourceMode,
        streamUrl: buildStreamUrl(id, level),
        type: song.type,
        url: song.url,
      }),
    )
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

// 实际音频流代理接口。
// 前端 audio 标签最终播放的是这个地址，而不是上游直链。
app.get('/api/player/stream', async (req, res) => {
  try {
    const id = String(req.query.id ?? '').trim()

    if (!id) {
      res.status(400).json({
        code: 400,
        data: null,
        message: 'song id is required',
      })
      return
    }

    const level = String(req.query.level ?? DEFAULT_SONG_LEVEL)
    const { song } = await resolveSongSource(id, level)

    if (!song?.url) {
      res.status(404).json({
        code: 404,
        data: null,
        message: '当前歌曲暂无可用音源',
      })
      return
    }

    // 如果浏览器带了 Range 头，就继续透传给上游，
    // 这样拖动进度条、断点请求时依然能正常工作。
    const upstreamHeaders = new Headers()

    if (req.headers.range) {
      upstreamHeaders.set('Range', req.headers.range)
    }

    const upstreamResponse = await fetch(song.url, {
      headers: upstreamHeaders,
      redirect: 'follow',
    })

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      throw new Error(`Audio stream request failed: ${upstreamResponse.status}`)
    }

    // 只把播放真正依赖的响应头拷贝回来。
    for (const headerName of AUDIO_RESPONSE_HEADERS) {
      const headerValue = upstreamResponse.headers.get(headerName)

      if (headerValue) {
        res.setHeader(headerName, headerValue)
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') ?? 'bytes')

    if (!res.getHeader('content-type')) {
      res.setHeader('Content-Type', song.type === 'mp3' ? 'audio/mpeg' : 'application/octet-stream')
    }

    res.status(upstreamResponse.status)

    // 某些极端情况下上游可能没有 body，这时直接结束响应，避免 pipe 报错。
    if (!upstreamResponse.body) {
      res.end()
      return
    }

    // 把 Web ReadableStream 转成 Node 可读流后再 pipe 给浏览器。
    Readable.fromWeb(upstreamResponse.body).pipe(res)
  } catch (error) {
    res.status(500).json({
      code: 500,
      data: null,
      message: error instanceof Error ? error.message : 'server error',
    })
  }
})

// 启动本地接口服务。
const isDirectRun =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`)
  })
}

export default app
