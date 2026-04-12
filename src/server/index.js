
import express from "express";
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

const banners=[

]
const playlists = [
 
]
const artists = [

  
]

const songs = [

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

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`)
})