import type { PlayerPlayMode } from './types'

export const DEFAULT_PLAY_MODE: PlayerPlayMode = 'sequential'
export const DEFAULT_VOLUME = 0.72
export const INTERACTIVE_PERSIST_INTERVAL_MS = 200
export const LOCKED_PLAYBACK_RATE = 1
export const PLAYER_STORAGE_KEY = 'your-music-player'
export const PLAY_MODE_SEQUENCE: PlayerPlayMode[] = ['single-loop', 'sequential', 'list-loop', 'shuffle']
export const PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS = 3
export const SOURCE_REFRESH_BUFFER_MS = 15_000
