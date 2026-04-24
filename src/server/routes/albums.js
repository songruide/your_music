import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtists, getArtistNames } from '../services/shared.js'
import {
  createRouteHandler,
  getRequiredQueryString,
  HttpError,
  sendOk,
} from '../utils/http.js'

const router = express.Router()

router.get('/api/albums/detail', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'album id is required')
  const payload = await fetchNcm('/album', { id })
  const album = payload.album

  if (!album) {
    throw new HttpError(404, 'album not found')
  }

  const songs = (payload.songs ?? [])
    .map((item) => ({
      id: String(item.id ?? ''),
      name: item.name ?? '',
      artists: getArtists(item.ar ?? item.artists ?? album.artists),
      artistNames: getArtistNames(item.ar ?? item.artists ?? album.artists),
      albumName: item.al?.name ?? item.album?.name ?? album.name ?? '未知专辑',
      coverUrl: item.al?.picUrl ?? item.album?.picUrl ?? album.picUrl ?? album.blurPicUrl ?? '',
      duration: item.dt ?? item.duration,
      playable: item.privilege?.st !== -200 && item.noCopyrightR !== 1,
    }))
    .filter((song) => song.id && song.name)

  sendOk(res, {
    id: String(album.id ?? id),
    name: album.name ?? '',
    coverUrl: album.picUrl ?? album.blurPicUrl ?? '',
    description: album.description ?? '',
    publishTime: album.publishTime,
    company: album.company ?? album.companyId ?? '',
    size: Number(album.size ?? songs.length),
    subCount: Number(album.info?.likedCount ?? album.subCount ?? 0),
    shareCount: Number(album.info?.shareCount ?? 0),
    artistNames: getArtistNames(album.artists),
    artists: (album.artists ?? []).map((item) => ({
      id: String(item.id ?? ''),
      name: item.name ?? '',
    })),
    songs,
  })
}))

export default router
