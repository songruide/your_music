import { createRequire } from 'node:module'
import { DEFAULT_BROWSER_BR } from '../config.js'
import { fetchNcm } from './ncm.js'

const require = createRequire(import.meta.url)
const ncmEnhanced = require('../../../api-enhanced/main.js')

function getResponseBody(result) {
  return result?.body ?? result ?? {}
}

async function fetchSongUrl(id, level, cookie) {
  if (cookie) {
    const payload = getResponseBody(await ncmEnhanced.song_url_v1({
      cookie,
      id,
      level,
      ua: 'pc',
    }))

    return {
      payload,
      sourceMode: 'song/url/v1(auth)',
    }
  }

  const payload = await fetchNcm('/song/url/v1', { id, level })

  return {
    payload,
    sourceMode: 'song/url/v1',
  }
}

async function fetchBrowserSongUrl(id, cookie) {
  if (cookie) {
    const payload = getResponseBody(await ncmEnhanced.song_url({
      br: DEFAULT_BROWSER_BR,
      cookie,
      id,
      ua: 'pc',
    }))

    return {
      payload,
      sourceMode: 'song/url(auth)',
    }
  }

  const browserPayload = await fetchNcm('/song/url', {
    id,
    br: DEFAULT_BROWSER_BR,
  })

  return {
    payload: browserPayload,
    sourceMode: 'song/url',
  }
}

export async function resolveSongSource(id, level, options = {}) {
  const cookie = String(options.cookie ?? '').trim()
  const attempts = cookie
    ? [() => fetchSongUrl(id, level, cookie), () => fetchBrowserSongUrl(id, cookie)]
    : [() => fetchBrowserSongUrl(id), () => fetchSongUrl(id, level)]
  let song = null
  let sourceMode = ''

  for (const attempt of attempts) {
    const result = await attempt()
    const nextSong = result.payload.data?.[0]

    sourceMode = result.sourceMode
    song = nextSong ?? song

    if (nextSong?.url) {
      break
    }
  }

  return {
    song,
    sourceMode,
  }
}

export function buildSongStreamUrl(id, level) {
  const params = new URLSearchParams({
    id,
    level,
  })

  return `/api/player/stream?${params.toString()}`
}
