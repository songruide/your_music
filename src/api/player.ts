import { request } from '@/utils/request'

export interface SongPlaybackSource {
  id: string
  url: string
  bitrate?: number
  level?: string
  expiresIn?: number
  sampleRate?: number
  sourceMode?: string
  streamUrl?: string
  type?: string
}

export function getSongPlaybackSource(id: string, level = 'standard') {
  return request<SongPlaybackSource>('/api/player/song-url', {
    params: {
      id,
      level,
    },
  })
}
