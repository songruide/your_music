import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtistNames } from '../services/shared.js'
import {
  createRouteHandler,
  getRequiredQueryString,
  HttpError,
  sendOk,
} from '../utils/http.js'

const router = express.Router()

router.get('/api/playlists/detail', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'playlist id is required')
  const payload = await fetchNcm('/playlist/detail', {
    id,
    n: 1000,
    s: 8,
  })
  const playlist = payload.playlist

  if (!playlist) {
    throw new HttpError(404, 'playlist not found')
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

  sendOk(res, {
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
  })
}))

export default router
