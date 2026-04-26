import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtists, getArtistNames } from '../services/shared.js'
import {
  createRouteHandler,
  getRequiredQueryString,
  HttpError,
  sendOk,
} from '../utils/http.js'
import { getLimit } from '../utils/params.js'

const router = express.Router()

function getBoundedLimit(value, fallback, max) {
  return Math.min(Math.floor(getLimit(value, fallback)), max)
}

function mapPreviewTracks(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((track) => ({
      title: String(track?.first ?? track?.name ?? '').trim(),
      artist: String(track?.second ?? track?.artist ?? '').trim(),
    }))
    .filter((track) => track.title)
    .slice(0, 3)
}

function mapRankingSummary(item) {
  return {
    id: String(item.id ?? '').trim(),
    name: item.name ?? '',
    coverUrl: item.coverImgUrl ?? item.picUrl ?? '',
    description: item.description ?? '',
    updateFrequency: item.updateFrequency ?? '',
    trackCount: Number(item.trackCount ?? 0),
    playCount: Number(item.playCount ?? 0),
    subscribedCount: Number(item.subscribedCount ?? 0),
    updateTime: item.updateTime,
    previewTracks: mapPreviewTracks(item.tracks),
  }
}

function mapRankingTrack(item, fallbackCoverUrl) {
  return {
    id: String(item.id ?? '').trim(),
    name: item.name ?? '',
    coverUrl: item.al?.picUrl ?? item.album?.picUrl ?? fallbackCoverUrl ?? '',
    artists: getArtists(item.ar ?? item.artists),
    artistNames: getArtistNames(item.ar ?? item.artists),
    albumName: item.al?.name ?? item.album?.name ?? '未知专辑',
    duration: item.dt ?? item.duration,
    playable: item.privilege?.st !== -200 && item.noCopyrightR !== 1,
  }
}

router.get('/api/rankings', createRouteHandler(async (req, res) => {
  const limit = getBoundedLimit(req.query.limit, 40, 80)
  const payload = await fetchNcm('/toplist')
  const data = (payload.list ?? [])
    .map(mapRankingSummary)
    .filter((item) => item.id && item.name)
    .slice(0, limit)

  sendOk(res, data)
}))

router.get('/api/rankings/detail', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'ranking id is required')
  const limit = getBoundedLimit(req.query.limit, 100, 200)
  const payload = await fetchNcm('/playlist/detail', {
    id,
    n: limit,
    s: 8,
  })
  const playlist = payload.playlist

  if (!playlist) {
    throw new HttpError(404, 'ranking not found')
  }

  const tracks = (playlist.tracks ?? [])
    .slice(0, limit)
    .map((item) => mapRankingTrack(item, playlist.coverImgUrl))
    .filter((item) => item.id && item.name)

  sendOk(res, {
    ...mapRankingSummary(playlist),
    trackCount: Number(playlist.trackCount ?? tracks.length),
    playCount: Number(playlist.playCount ?? 0),
    subscribedCount: Number(playlist.subscribedCount ?? 0),
    tracks,
  })
}))

export default router
