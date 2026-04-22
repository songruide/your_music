import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { createRouteHandler, sendOk } from '../utils/http.js'
import { getLimit } from '../utils/params.js'

const router = express.Router()

function mapBannerTargetType(targetType) {
  if (targetType === 1) return 'song'
  if (targetType === 1000) return 'playlist'
  if (targetType === 100) return 'artist'
  return 'unknown'
}

router.get('/api/home/banners', createRouteHandler(async (req, res) => {
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

  sendOk(res, data)
}))

router.get('/api/home/recommended-playlists', createRouteHandler(async (req, res) => {
  const limit = getLimit(req.query.limit, 12)
  const payload = await fetchNcm('/personalized', { limit })
  const data = (payload.result ?? []).map((item) => ({
    id: String(item.id),
    title: item.name,
    coverUrl: item.picUrl ?? '',
    playCount: item.playCount,
    description: item.copywriter ?? '',
  }))

  sendOk(res, data)
}))

router.get('/api/home/hot-artists', createRouteHandler(async (req, res) => {
  const limit = getLimit(req.query.limit, 10)
  const payload = await fetchNcm('/top/artists', { limit })
  const data = (payload.artists ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
    avatarUrl: item.img1v1Url ?? item.picUrl ?? '',
    musicCount: item.musicSize,
  }))

  sendOk(res, data)
}))

router.get('/api/home/hot-songs', createRouteHandler(async (req, res) => {
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

  sendOk(res, data)
}))

export default router
