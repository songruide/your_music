export interface PlayerTrackSourceMeta {
  bitrate?: number
  directUrl?: string
  level?: string
  sampleRate?: number
  sourceMode?: string
  streamUrl?: string
  type?: string
}

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  coverUrl: string
  duration: string
  durationMs?: number
  audioUrl?: string
  sourceMeta?: PlayerTrackSourceMeta
  sourceExpiresAt?: number
}

export interface PersistedPlayerState {
  currentIndex: number
  currentTimeSeconds: number
  isMuted: boolean
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
