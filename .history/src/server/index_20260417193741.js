import express from "express";
import { Readable } from "node:stream";
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

    // 这里把 limit 上限压到 50，避免一次性拉太多结果导致响应过重。
    const limit = Math.min(getLimit(req.query.limit, 20), 50)
    const payload = await fetchNcm('/search', {
      keywords,
      limit,
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
app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`)
})
