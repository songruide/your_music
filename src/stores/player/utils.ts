import { SOURCE_REFRESH_BUFFER_MS } from './constants'
import type { PlayerTrack } from './types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '00:00'
  }

  const seconds = Math.floor(totalSeconds)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function cloneTrack(track: PlayerTrack): PlayerTrack {
  return { ...track }
}

export function getTrackDurationSeconds(track: PlayerTrack | null | undefined) {
  return track?.durationMs ? track.durationMs / 1000 : 0
}

export function isSourceExpired(expiresAt?: number) {
  return typeof expiresAt === 'number' && Date.now() >= expiresAt - SOURCE_REFRESH_BUFFER_MS
}

export function isPreferredAudioUrl(url?: string) {
  return typeof url === 'string' && url.startsWith('/api/player/stream?')
}

export function sanitizeTrackForPersistence(track: PlayerTrack) {
  const nextTrack = cloneTrack(track)

  if (!isPreferredAudioUrl(nextTrack.audioUrl) || isSourceExpired(nextTrack.sourceExpiresAt)) {
    delete nextTrack.audioUrl
    delete nextTrack.sourceExpiresAt
  }

  return nextTrack
}

export function getSafeTrackTime(track: PlayerTrack | null, nextTimeSeconds: number) {
  const totalSeconds = getTrackDurationSeconds(track)

  if (totalSeconds > 0) {
    return clamp(nextTimeSeconds, 0, totalSeconds)
  }

  return Math.max(nextTimeSeconds, 0)
}
