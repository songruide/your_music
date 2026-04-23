import { request } from '@/utils/request'
import type { RecentPlayerTrack } from '@/stores/player/types'

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

export function getRecentPlaybackSongs(limit = 40) {
  return request<RecentPlayerTrack[]>('/api/player/recent-songs', {
    params: {
      limit,
    },
  })
}
