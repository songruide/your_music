import express from 'express'
import { AUDIO_RESPONSE_HEADERS, DEFAULT_SONG_LEVEL } from '../config.js'
import { pipeUpstreamStream } from '../services/media.js'
import { fetchNcm } from '../services/ncm.js'
import { buildSongStreamUrl, resolveSongSource } from '../services/player.js'
import { fetchRecentSongTracks } from '../services/recent.js'
import { getArtists, getArtistNames } from '../services/shared.js'
import { readAuthCookie } from '../utils/auth-cookie.js'
import {
  createRouteHandler,
  getRequiredQueryString,
  HttpError,
  sendOk,
} from '../utils/http.js'

const router = express.Router()

router.get('/api/player/song-url', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'song id is required')
  const level = String(req.query.level ?? DEFAULT_SONG_LEVEL)
  const cookie = readAuthCookie(req)
  const { song, sourceMode } = await resolveSongSource(id, level, { cookie })

  if (!song?.url) {
    throw new HttpError(404, '当前歌曲暂无可用音源')
  }

  sendOk(res, {
    id,
    bitrate: song.br,
    expiresIn: song.expi,
    fee: song.fee,
    freeTrialInfo: song.freeTrialInfo,
    level: song.level ?? level,
    payed: song.payed,
    sampleRate: song.sr,
    sourceMode,
    streamUrl: buildSongStreamUrl(id, level),
    type: song.type,
    url: song.url,
  })
}))

router.get('/api/player/lyrics', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'song id is required')
  const payload = await fetchNcm('/lyric', { id })

  sendOk(res, {
    id,
    lyric: payload?.lrc?.lyric ?? '',
    translatedLyric: payload?.tlyric?.lyric ?? '',
    noLyric: Boolean(payload?.nolyric),
    uncollected: Boolean(payload?.uncollected),
  })
}))

router.get('/api/player/song-meta', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'song id is required')
  const payload = await fetchNcm('/song/detail', { ids: id })
  const song = Array.isArray(payload?.songs) ? payload.songs[0] : null

  if (!song) {
    throw new HttpError(404, 'song not found')
  }

  sendOk(res, {
    id: String(song.id ?? id),
    name: String(song.name ?? '').trim(),
    artists: getArtists(song.ar ?? song.artists),
    artistNames: getArtistNames(song.ar ?? song.artists),
    albumId: String(song.al?.id ?? song.album?.id ?? '').trim() || undefined,
    albumName: song.al?.name ?? song.album?.name ?? '未知专辑',
    coverUrl: song.al?.picUrl ?? song.album?.picUrl ?? '',
  })
}))

router.get('/api/player/recent-songs', createRouteHandler(async (req, res) => {
  const cookie = readAuthCookie(req)

  if (!cookie) {
    throw new HttpError(401, '请先登录后再同步最近播放')
  }

  const tracks = await fetchRecentSongTracks({
    cookie,
    limit: req.query.limit,
    ua: 'pc',
  })

  sendOk(res, tracks)
}))

router.get('/api/player/stream', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'song id is required')
  const level = String(req.query.level ?? DEFAULT_SONG_LEVEL)
  const cookie = readAuthCookie(req)
  const { song } = await resolveSongSource(id, level, { cookie })

  if (!song?.url) {
    throw new HttpError(404, '当前歌曲暂无可用音源')
  }

  await pipeUpstreamStream(req, res, {
    url: song.url,
    responseHeaders: AUDIO_RESPONSE_HEADERS,
    fallbackContentType: song.type === 'mp3' ? 'audio/mpeg' : 'application/octet-stream',
    requestFailedMessage: 'Audio stream request failed',
  })
}))

export default router
