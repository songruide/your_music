import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtists, getArtistNames, getSongCoverUrlsByIds } from '../services/shared.js'
import { createRouteHandler, getRequiredQueryString, sendOk } from '../utils/http.js'
import { getLimit, getOffset } from '../utils/params.js'

const router = express.Router()

router.get('/api/search/songs', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
  const limit = Math.min(getLimit(req.query.limit, 40), 60)
  const offset = getOffset(req.query.offset)
  const payload = await fetchNcm('/search', {
    keywords,
    limit,
    offset,
    type: 1,
  })

  const songs = (payload.result?.songs ?? []).map((item) => ({
    id: String(item.id),
    name: item.name ?? '',
    coverUrl: item.album?.picUrl ?? item.al?.picUrl ?? '',
    artists: getArtists(item.artists ?? item.ar),
    artistNames: getArtistNames(item.artists ?? item.ar),
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

  sendOk(res, {
    keyword: keywords,
    total: Number(payload.result?.songCount ?? songs.length),
    songs,
  })
}))

router.get('/api/search/playlists', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
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

  sendOk(res, {
    keyword: keywords,
    total: Number(payload.result?.playlistCount ?? playlists.length),
    playlists,
  })
}))

router.get('/api/search/mvs', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
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

  sendOk(res, {
    keyword: keywords,
    total: Number(payload.result?.mvCount ?? mvs.length),
    mvs,
  })
}))

export default router
