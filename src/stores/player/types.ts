import type { ArtistRef } from '@/types/music'

export interface PlayerTrackSourceMeta {
  bitrate?: number
  directUrl?: string
  fee?: number
  freeTrialInfo?: unknown
  level?: string
  payed?: number
  sampleRate?: number
  sourceMode?: string
  streamUrl?: string
  type?: string
}

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  artists?: ArtistRef[]
  albumId?: string
  album?: string
  coverUrl: string
  duration: string
  durationMs?: number
  audioUrl?: string
  localAudioPath?: string
  localLyricPath?: string
  sourceMeta?: PlayerTrackSourceMeta
  sourceExpiresAt?: number
}

export interface RecentPlayerTrack extends PlayerTrack {
  isFavorite: boolean
  lastPlayedAt: number
  lastTimeSeconds: number
  playCount: number
}

export type PlayerPlayMode = 'single-loop' | 'sequential' | 'list-loop' | 'shuffle'

export interface PersistedPlayerState {
  currentIndex: number
  currentTimeSeconds: number
  isMuted: boolean
  playMode: PlayerPlayMode
  queue: PlayerTrack[]
  volume: number
}

export interface AudioDiagnostics {
  currentSrc: string
  networkState: number
  playbackRate: number
  readyState: number
}

export type PitchAwareAudio = HTMLAudioElement & {
  mozPreservesPitch?: boolean
  preservesPitch?: boolean
  webkitPreservesPitch?: boolean
}
