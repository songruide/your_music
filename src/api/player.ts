import { request } from '@/utils/request'
import type { RecentPlayerTrack } from '@/stores/player/types'
import type { ArtistRef } from '@/types/music'

export interface SongPlaybackSource {
  id: string
  url: string
  bitrate?: number
  fee?: number
  freeTrialInfo?: unknown
  level?: string
  payed?: number
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

export interface SongMetaPayload {
  id: string
  name: string
  artists: ArtistRef[]
  artistNames: string[]
  albumId?: string
  albumName?: string
  coverUrl?: string
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

export function getSongMeta(id: string) {
  return request<SongMetaPayload>('/api/player/song-meta', {
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
