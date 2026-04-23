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

export interface SongLyricPayload {
  id: string
  lyric?: string
  translatedLyric?: string
  noLyric?: boolean
  uncollected?: boolean
}

export function getSongPlaybackSource(id: string, level = 'standard') {
  return request<SongPlaybackSource>('/api/player/song-url', {
    params: {
      id,
      level,
    },
  })
}

export function getSongLyrics(id: string) {
  return request<SongLyricPayload>('/api/player/lyrics', {
    params: {
      id,
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
