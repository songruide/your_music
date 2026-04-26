import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtists, getArtistNames } from '../services/shared.js'
import { createRouteHandler, sendOk } from '../utils/http.js'
import { getLimit, getOffset } from '../utils/params.js'

const router = express.Router()

function mapBannerTargetType(targetType) {
  if (targetType === 1) return 'song'
  if (targetType === 1000) return 'playlist'
  if (targetType === 100) return 'artist'
  return 'unknown'
}

function hasQueryValue(req, key) {
  return req.query[key] !== undefined && req.query[key] !== null && req.query[key] !== ''
}

function getDiscoverLimit(value, fallback, max) {
  return Math.min(Math.floor(getLimit(value, fallback)), max)
}

function mapPlaylistItem(item) {
  return {
    id: String(item.id ?? ''),
    title: item.name ?? '',
    coverUrl: item.picUrl ?? item.coverImgUrl ?? '',
    playCount: item.playCount,
    description: item.copywriter ?? item.description ?? '',
    trackCount: item.trackCount,
  }
}

function mapHomeSong(item) {
  return {
    id: String(item.id ?? item.song?.id ?? ''),
    name: item.name ?? item.song?.name ?? '',
    coverUrl: item.picUrl ?? item.song?.album?.picUrl ?? item.song?.al?.picUrl ?? item.album?.picUrl ?? item.al?.picUrl ?? '',
    artists: getArtists(item.song?.artists ?? item.song?.ar ?? item.artists ?? item.ar),
    artistNames: getArtistNames(item.song?.artists ?? item.song?.ar ?? item.artists ?? item.ar),
    albumId: String(item.song?.album?.id ?? item.song?.al?.id ?? item.album?.id ?? item.al?.id ?? '').trim() || undefined,
    albumName: item.song?.album?.name ?? item.song?.al?.name ?? item.album?.name ?? item.al?.name ?? '单曲精选',
    duration: item.song?.duration ?? item.song?.dt ?? item.duration ?? item.dt,
    playable: item.privilege?.st !== -200 && item.noCopyrightR !== 1,
  }
}

async function fetchPersonalizedNewSongs(limit, offset = 0) {
  const payload = await fetchNcm('/personalized/newsong', {
    limit: offset + limit,
  })

  return (payload.result ?? [])
    .slice(offset, offset + limit)
    .map(mapHomeSong)
    .filter((item) => item.id && item.name)
}

async function fetchTopSongs(limit, offset, type) {
  const payload = await fetchNcm('/top/song', {
    type,
  })

  return (payload.data ?? [])
    .slice(offset, offset + limit)
    .map(mapHomeSong)
    .filter((item) => item.id && item.name)
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
  const limit = getDiscoverLimit(req.query.limit, 12, 60)
  const offset = getOffset(req.query.offset)

  if (offset > 0 || hasQueryValue(req, 'cat') || hasQueryValue(req, 'order')) {
    const payload = await fetchNcm('/top/playlist', {
      cat: req.query.cat || '全部',
      limit,
      offset,
      order: req.query.order || 'hot',
    })
    const data = (payload.playlists ?? []).map(mapPlaylistItem)

    sendOk(res, data)
    return
  }

  const payload = await fetchNcm('/personalized', { limit })
  const data = (payload.result ?? []).map(mapPlaylistItem)

  sendOk(res, data)
}))

router.get('/api/home/hot-artists', createRouteHandler(async (req, res) => {
  const limit = getDiscoverLimit(req.query.limit, 10, 60)
  const offset = getOffset(req.query.offset)
  const isFilteredList =
    offset > 0 ||
    hasQueryValue(req, 'area') ||
    hasQueryValue(req, 'initial') ||
    hasQueryValue(req, 'type')
  const payload = isFilteredList
    ? await fetchNcm('/artist/list', {
        area: req.query.area ?? -1,
        initial: req.query.initial ?? -1,
        limit,
        offset,
        type: req.query.type ?? -1,
      })
    : await fetchNcm('/top/artists', { limit })
  const data = (payload.artists ?? []).map((item) => ({
    id: String(item.id),
    name: item.name,
    avatarUrl: item.img1v1Url ?? item.picUrl ?? '',
    musicCount: item.musicSize,
    albumCount: item.albumSize,
    mvCount: item.mvSize,
  }))

  sendOk(res, data)
}))

router.get('/api/home/hot-songs', createRouteHandler(async (req, res) => {
  const limit = getDiscoverLimit(req.query.limit, 10, 60)
  const offset = getOffset(req.query.offset)

  if (req.query.source === 'top' || offset > 0) {
    let data = []

    try {
      data = await fetchTopSongs(limit, offset, req.query.type ?? 0)
    } catch {
      data = []
    }

    if (data.length === 0) {
      data = await fetchPersonalizedNewSongs(limit, offset)
    }

    sendOk(res, data)
    return
  }

  const data = await fetchPersonalizedNewSongs(limit)

  sendOk(res, data)
}))

router.get('/api/home/playlist-categories', createRouteHandler(async (req, res) => {
  const payload = await fetchNcm('/playlist/catlist')
  const categories = payload.categories ?? {}
  const tags = Array.isArray(payload.sub) ? payload.sub : []
  const groups = Object.entries(categories).map(([id, name]) => ({
    id,
    name: String(name),
    tags: tags
      .filter((item) => Number(item.category) === Number(id))
      .map((item) => item.name)
      .filter(Boolean),
  }))

  sendOk(res, groups)
}))

export default router
