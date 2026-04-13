import { request } from '@/utils/request'

export interface SongPlaybackSource {
  id: string
  url: string
  level?: string
  expiresTime?: number
}

export function getSongPlaybackSource(id: string, level = 'standard') {
  return request<SongPlaybackSource>('/api/player/song-url', {
    params: {
      id,
      level,
    },
  })
}
