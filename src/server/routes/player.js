import express from 'express'
import { AUDIO_RESPONSE_HEADERS, DEFAULT_SONG_LEVEL } from '../config.js'
import { pipeUpstreamStream } from '../services/media.js'
import { buildSongStreamUrl, resolveSongSource } from '../services/player.js'
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
  const { song, sourceMode } = await resolveSongSource(id, level)

  if (!song?.url) {
    throw new HttpError(404, '当前歌曲暂无可用音源')
  }

  sendOk(res, {
    id,
    bitrate: song.br,
    expiresIn: song.expi,
    level: song.level ?? level,
    sampleRate: song.sr,
    sourceMode,
    streamUrl: buildSongStreamUrl(id, level),
    type: song.type,
    url: song.url,
  })
}))

router.get('/api/player/stream', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'song id is required')
  const level = String(req.query.level ?? DEFAULT_SONG_LEVEL)
  const { song } = await resolveSongSource(id, level)

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
