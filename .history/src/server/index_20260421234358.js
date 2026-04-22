import express from "express";
import { Readable } from "node:stream";
const app = express();
const PORT = 3001;
app.use(express.json());
const NCM_BASE_URL = process.env.NCM_API_BASE_URL ?? 'http://127.0.0.1:3000'

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
const DEFAULT_SONG_LEVEL = process.env.NCM_SONG_LEVEL ?? 'standard'
const DEFAULT_BROWSER_BR = Number(process.env.NCM_BROWSER_BR ?? 320000)
const AUDIO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]

function ok(data) {
  return {
    code: 200,
    data,
    message: 'ok',
  }
}
function getLimit(value, total) {
  const limit = Number(value)

  if (!Number.isFinite(limit) || limit <= 0) {
    return total
  }

  return limit
}

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
function mapBannerTargetType(targetType) {
  if (targetType === 1) return 'song'
  if (targetType === 1000) return 'playlist'
  if (targetType === 100) return 'artist'
  return 'unknown'
}
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

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`)
})
