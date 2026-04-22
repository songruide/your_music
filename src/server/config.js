export const PORT = 3001

export const NCM_BASE_URL = process.env.NCM_API_BASE_URL ?? 'http://127.0.0.1:3000'

export const DEFAULT_SONG_LEVEL = process.env.NCM_SONG_LEVEL ?? 'standard'
export const DEFAULT_BROWSER_BR = Number(process.env.NCM_BROWSER_BR ?? 320000)

export const AUDIO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]

export const VIDEO_RESPONSE_HEADERS = [
  'accept-ranges',
  'cache-control',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
]
