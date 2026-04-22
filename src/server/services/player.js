import { DEFAULT_BROWSER_BR } from '../config.js'
import { fetchNcm } from './ncm.js'

export async function resolveSongSource(id, level) {
  const browserPayload = await fetchNcm('/song/url', {
    id,
    br: DEFAULT_BROWSER_BR,
  })
  let song = browserPayload.data?.[0]
  let sourceMode = 'song/url'

  if (!song?.url) {
    const fallbackPayload = await fetchNcm('/song/url/v1', { id, level })
    song = fallbackPayload.data?.[0]
    sourceMode = 'song/url/v1'
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
