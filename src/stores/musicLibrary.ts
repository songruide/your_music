import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { PlayerTrack, RecentPlayerTrack } from './player/types'

const FAVORITE_STORAGE_KEY = 'your-music:favorite-track-ids'
const LOCAL_MUSIC_STORAGE_KEY = 'your-music:local-music-tracks'
const LOCAL_MUSIC_LIMIT = 200

export interface LocalMusicTrack extends RecentPlayerTrack {
  downloadedAt: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)

    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function normalizeFavoriteIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean),
    ),
  )
}

function normalizeLocalTracks(value: unknown): LocalMusicTrack[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()

  return value
    .map((item) => item as Partial<LocalMusicTrack>)
    .filter((track) => {
      const id = String(track.id ?? '').trim()

      if (!id || seenIds.has(id)) {
        return false
      }

      seenIds.add(id)
      return Boolean(track.title && track.artist)
    })
    .map((track) => ({
      id: String(track.id),
      title: String(track.title),
      artist: String(track.artist),
      album: track.album ? String(track.album) : '单曲收藏',
      coverUrl: track.coverUrl ? String(track.coverUrl) : '',
      duration: track.duration ? String(track.duration) : '00:00',
      durationMs: Number.isFinite(track.durationMs) ? Number(track.durationMs) : undefined,
      audioUrl: track.audioUrl ? String(track.audioUrl) : undefined,
      sourceMeta: track.sourceMeta,
      sourceExpiresAt: Number.isFinite(track.sourceExpiresAt) ? Number(track.sourceExpiresAt) : undefined,
      downloadedAt: Number.isFinite(track.downloadedAt) ? Number(track.downloadedAt) : Date.now(),
      isFavorite: Boolean(track.isFavorite),
      lastPlayedAt: Number.isFinite(track.lastPlayedAt) ? Number(track.lastPlayedAt) : Date.now(),
      lastTimeSeconds: Number.isFinite(track.lastTimeSeconds) ? Number(track.lastTimeSeconds) : 0,
      playCount: Number.isFinite(track.playCount) ? Number(track.playCount) : 0,
    }))
    .slice(0, LOCAL_MUSIC_LIMIT)
}

function clonePlayerTrack(track: PlayerTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    coverUrl: track.coverUrl,
    duration: track.duration,
    durationMs: track.durationMs,
    audioUrl: track.audioUrl,
    sourceMeta: track.sourceMeta ? { ...track.sourceMeta } : undefined,
    sourceExpiresAt: track.sourceExpiresAt,
  }
}

export const useMusicLibraryStore = defineStore('music-library', () => {
  const favoriteIds = ref<string[]>(normalizeFavoriteIds(readJson(FAVORITE_STORAGE_KEY, [])))
  const localTracks = ref<LocalMusicTrack[]>(normalizeLocalTracks(readJson(LOCAL_MUSIC_STORAGE_KEY, [])))

  const favoriteIdSet = computed(() => new Set(favoriteIds.value))

  function persistFavorites() {
    writeJson(FAVORITE_STORAGE_KEY, favoriteIds.value)
  }

  function persistLocalTracks() {
    writeJson(LOCAL_MUSIC_STORAGE_KEY, localTracks.value)
  }

  function isFavorite(trackId?: string) {
    return Boolean(trackId && favoriteIdSet.value.has(trackId))
  }

  function isLocalTrack(trackId?: string) {
    return Boolean(trackId && localTracks.value.some((track) => track.id === trackId))
  }

  function syncTrackFavorite(trackId: string, isFavoriteTrack: boolean) {
    localTracks.value = localTracks.value.map((track) =>
      track.id === trackId ? { ...track, isFavorite: isFavoriteTrack } : track,
    )
    persistLocalTracks()
  }

  function toggleFavorite(trackId?: string) {
    if (!trackId) {
      return false
    }

    const nextFavoriteIds = new Set(favoriteIds.value)
    const nextValue = !nextFavoriteIds.has(trackId)

    if (nextValue) {
      nextFavoriteIds.add(trackId)
    } else {
      nextFavoriteIds.delete(trackId)
    }

    favoriteIds.value = Array.from(nextFavoriteIds)
    persistFavorites()
    syncTrackFavorite(trackId, nextValue)

    return nextValue
  }

  function addLocalTrack(track: PlayerTrack) {
    const now = Date.now()
    const clonedTrack = clonePlayerTrack(track)
    const previousTrack = localTracks.value.find((item) => item.id === clonedTrack.id)
    const localTrack: LocalMusicTrack = {
      ...clonedTrack,
      album: clonedTrack.album || '单曲收藏',
      downloadedAt: now,
      isFavorite: isFavorite(clonedTrack.id),
      lastPlayedAt: previousTrack?.lastPlayedAt ?? now,
      lastTimeSeconds: previousTrack?.lastTimeSeconds ?? 0,
      playCount: previousTrack?.playCount ?? 0,
    }

    localTracks.value = [
      localTrack,
      ...localTracks.value.filter((item) => item.id !== clonedTrack.id),
    ].slice(0, LOCAL_MUSIC_LIMIT)
    persistLocalTracks()

    return localTrack
  }

  function removeLocalTrack(trackId: string) {
    localTracks.value = localTracks.value.filter((track) => track.id !== trackId)
    persistLocalTracks()
  }

  function clearLocalTracks() {
    localTracks.value = []
    persistLocalTracks()
  }

  function markLocalTrackPlayed(trackId: string, lastTimeSeconds = 0) {
    localTracks.value = localTracks.value.map((track) =>
      track.id === trackId
        ? {
            ...track,
            lastPlayedAt: Date.now(),
            lastTimeSeconds,
            playCount: track.playCount + 1,
          }
        : track,
    )
    persistLocalTracks()
  }

  return {
    addLocalTrack,
    clearLocalTracks,
    favoriteIds,
    isFavorite,
    isLocalTrack,
    localTracks,
    markLocalTrackPlayed,
    removeLocalTrack,
    toggleFavorite,
  }
})
