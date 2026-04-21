import { DEFAULT_VOLUME, PLAYER_STORAGE_KEY } from './constants'
import type { PersistedPlayerState, PlayerTrack } from './types'
import { clamp, sanitizeTrackForPersistence } from './utils'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isPlayerTrack(value: unknown): value is PlayerTrack {
  if (!value || typeof value !== 'object') {
    return false
  }

  const track = value as Partial<PlayerTrack>

  return (
    typeof track.id === 'string' &&
    typeof track.title === 'string' &&
    typeof track.artist === 'string' &&
    typeof track.coverUrl === 'string' &&
    typeof track.duration === 'string'
  )
}

export function readPersistedPlayerState(): PersistedPlayerState | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedPlayerState>
    const queue = Array.isArray(parsed.queue)
      ? parsed.queue.filter(isPlayerTrack).map(sanitizeTrackForPersistence)
      : []
    const volume = typeof parsed.volume === 'number' ? clamp(parsed.volume, 0, 1) : DEFAULT_VOLUME

    return {
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : -1,
      currentTimeSeconds: typeof parsed.currentTimeSeconds === 'number' ? Math.max(parsed.currentTimeSeconds, 0) : 0,
      isMuted: Boolean(parsed.isMuted),
      queue,
      volume,
    }
  } catch {
    return null
  }
}

export function writePersistedPlayerState(payload: PersistedPlayerState) {
  if (!canUseStorage()) {
    return false
  }

  const safePayload: PersistedPlayerState = {
    ...payload,
    queue: payload.queue.map(sanitizeTrackForPersistence),
  }

  window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(safePayload))
  return true
}
