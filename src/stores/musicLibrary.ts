import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAuthStore } from './auth'
import type { PlayerTrack, RecentPlayerTrack } from './player/types'

const LIBRARY_STORAGE_KEY = 'your-music:music-library:v2'
const LOCAL_MUSIC_LIMIT = 200

interface StoredLibraryTrack extends PlayerTrack {
  downloadedAt?: number
  favoritedAt?: number
  lastPlayedAt: number
  lastTimeSeconds: number
  playCount: number
}

interface UserLibrarySnapshot {
  downloadedTracks: StoredLibraryTrack[]
  favoriteTracks: StoredLibraryTrack[]
}

type LibraryStoragePayload = Record<string, UserLibrarySnapshot>

export interface LocalMusicTrack extends RecentPlayerTrack {
  downloadedAt?: number
  favoritedAt?: number
  isDownloaded: boolean
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

function normalizeStoredTrack(value: unknown): StoredLibraryTrack | null {
  const track = value as Partial<StoredLibraryTrack>
  const id = String(track.id ?? '').trim()
  const title = String(track.title ?? '').trim()
  const artist = String(track.artist ?? '').trim()

  if (!id || !title || !artist) {
    return null
  }

  return {
    id,
    title,
    artist,
    album: track.album ? String(track.album) : '单曲收藏',
    coverUrl: track.coverUrl ? String(track.coverUrl) : '',
    duration: track.duration ? String(track.duration) : '00:00',
    durationMs: Number.isFinite(track.durationMs) ? Number(track.durationMs) : undefined,
    audioUrl: track.audioUrl ? String(track.audioUrl) : undefined,
    sourceMeta: track.sourceMeta ? { ...track.sourceMeta } : undefined,
    sourceExpiresAt: Number.isFinite(track.sourceExpiresAt) ? Number(track.sourceExpiresAt) : undefined,
    downloadedAt: Number.isFinite(track.downloadedAt) ? Number(track.downloadedAt) : undefined,
    favoritedAt: Number.isFinite(track.favoritedAt) ? Number(track.favoritedAt) : undefined,
    lastPlayedAt: Number.isFinite(track.lastPlayedAt) ? Number(track.lastPlayedAt) : Date.now(),
    lastTimeSeconds: Number.isFinite(track.lastTimeSeconds) ? Number(track.lastTimeSeconds) : 0,
    playCount: Number.isFinite(track.playCount) ? Number(track.playCount) : 0,
  }
}

function normalizeTrackList(value: unknown): StoredLibraryTrack[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()

  return value
    .map((item) => normalizeStoredTrack(item))
    .filter((track): track is StoredLibraryTrack => {
      if (!track || seenIds.has(track.id)) {
        return false
      }

      seenIds.add(track.id)
      return true
    })
    .slice(0, LOCAL_MUSIC_LIMIT)
}

function normalizeSnapshot(value: unknown): UserLibrarySnapshot {
  const snapshot = value as Partial<UserLibrarySnapshot>

  return {
    downloadedTracks: normalizeTrackList(snapshot.downloadedTracks),
    favoriteTracks: normalizeTrackList(snapshot.favoriteTracks),
  }
}

function normalizePayload(value: unknown): LibraryStoragePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([userKey, snapshot]) => [userKey, normalizeSnapshot(snapshot)]),
  )
}

function buildStoredTrack(
  track: PlayerTrack,
  previousTrack?: StoredLibraryTrack | null,
  overrides: Partial<StoredLibraryTrack> = {},
): StoredLibraryTrack {
  const now = Date.now()
  const clonedTrack = clonePlayerTrack(track)

  return {
    ...clonedTrack,
    album: clonedTrack.album || previousTrack?.album || '单曲收藏',
    downloadedAt: overrides.downloadedAt ?? previousTrack?.downloadedAt,
    favoritedAt: overrides.favoritedAt ?? previousTrack?.favoritedAt,
    lastPlayedAt: overrides.lastPlayedAt ?? previousTrack?.lastPlayedAt ?? now,
    lastTimeSeconds: overrides.lastTimeSeconds ?? previousTrack?.lastTimeSeconds ?? 0,
    playCount: overrides.playCount ?? previousTrack?.playCount ?? 0,
  }
}

function upsertTrack(list: StoredLibraryTrack[], track: PlayerTrack, overrides: Partial<StoredLibraryTrack> = {}) {
  const previousTrack = list.find((item) => item.id === track.id) ?? null
  const nextTrack = buildStoredTrack(track, previousTrack, overrides)

  return [
    nextTrack,
    ...list.filter((item) => item.id !== nextTrack.id),
  ].slice(0, LOCAL_MUSIC_LIMIT)
}

function updateTrackTiming(list: StoredLibraryTrack[], trackId: string, lastTimeSeconds = 0) {
  return list.map((track) =>
    track.id === trackId
      ? {
          ...track,
          lastPlayedAt: Date.now(),
          lastTimeSeconds,
          playCount: track.playCount + 1,
        }
      : track,
  )
}

function sortByLibraryTime(a: LocalMusicTrack, b: LocalMusicTrack) {
  const aTime = Math.max(a.downloadedAt ?? 0, a.favoritedAt ?? 0, a.lastPlayedAt ?? 0)
  const bTime = Math.max(b.downloadedAt ?? 0, b.favoritedAt ?? 0, b.lastPlayedAt ?? 0)

  return bTime - aTime
}

function toLocalMusicTrack(
  track: StoredLibraryTrack,
  overrides: Partial<LocalMusicTrack> = {},
): LocalMusicTrack {
  return {
    ...track,
    isDownloaded: overrides.isDownloaded ?? Boolean(track.downloadedAt),
    isFavorite: overrides.isFavorite ?? Boolean(track.favoritedAt),
    downloadedAt: overrides.downloadedAt ?? track.downloadedAt,
    favoritedAt: overrides.favoritedAt ?? track.favoritedAt,
  }
}

export const useMusicLibraryStore = defineStore('music-library', () => {
  const authStore = useAuthStore()
  const payload = ref<LibraryStoragePayload>(normalizePayload(readJson(LIBRARY_STORAGE_KEY, {})))
  const downloadedTracks = ref<StoredLibraryTrack[]>([])
  const favoriteTracks = ref<StoredLibraryTrack[]>([])

  const currentUserKey = computed(() => {
    if (authStore.loggedIn && authStore.profile?.userId) {
      return `user:${authStore.profile.userId}`
    }

    return 'guest'
  })

  const favoriteIdSet = computed(() => new Set(favoriteTracks.value.map((track) => track.id)))
  const downloadedTrackMap = computed(() => new Map(downloadedTracks.value.map((track) => [track.id, track])))
  const favoriteTrackMap = computed(() => new Map(favoriteTracks.value.map((track) => [track.id, track])))

  const downloadedCollection = computed<LocalMusicTrack[]>(() =>
    downloadedTracks.value
      .map((track) =>
        toLocalMusicTrack(track, {
          isDownloaded: true,
          isFavorite: favoriteIdSet.value.has(track.id),
          favoritedAt: favoriteTrackMap.value.get(track.id)?.favoritedAt ?? track.favoritedAt,
        }),
      )
      .sort(sortByLibraryTime),
  )

  const favoriteCollection = computed<LocalMusicTrack[]>(() =>
    favoriteTracks.value
      .map((track) => {
        const downloadedTrack = downloadedTrackMap.value.get(track.id)

        return toLocalMusicTrack(downloadedTrack ?? track, {
          isDownloaded: Boolean(downloadedTrack),
          isFavorite: true,
          downloadedAt: downloadedTrack?.downloadedAt ?? track.downloadedAt,
          favoritedAt: track.favoritedAt ?? downloadedTrack?.favoritedAt,
        })
      })
      .sort(sortByLibraryTime),
  )

  function loadCurrentUserState() {
    const snapshot = payload.value[currentUserKey.value]

    if (!snapshot) {
      downloadedTracks.value = []
      favoriteTracks.value = []
      return
    }

    downloadedTracks.value = normalizeTrackList(snapshot.downloadedTracks)
    favoriteTracks.value = normalizeTrackList(snapshot.favoriteTracks)
  }

  function persistCurrentUserState() {
    payload.value = {
      ...payload.value,
      [currentUserKey.value]: {
        downloadedTracks: downloadedTracks.value,
        favoriteTracks: favoriteTracks.value,
      },
    }

    writeJson(LIBRARY_STORAGE_KEY, payload.value)
  }

  function resolveTrackSeed(trackOrId: PlayerTrack | LocalMusicTrack | string) {
    if (typeof trackOrId !== 'string') {
      return clonePlayerTrack(trackOrId)
    }

    const existingTrack =
      downloadedTracks.value.find((track) => track.id === trackOrId) ??
      favoriteTracks.value.find((track) => track.id === trackOrId)

    if (!existingTrack) {
      return null
    }

    return clonePlayerTrack(existingTrack)
  }

  function isFavorite(trackId?: string) {
    return Boolean(trackId && favoriteIdSet.value.has(trackId))
  }

  function isLocalTrack(trackId?: string) {
    return Boolean(trackId && downloadedTracks.value.some((track) => track.id === trackId))
  }

  function toggleFavorite(trackOrId: PlayerTrack | LocalMusicTrack | string) {
    const trackId = typeof trackOrId === 'string' ? trackOrId : trackOrId.id

    if (!trackId) {
      return false
    }

    const nextValue = !isFavorite(trackId)

    if (nextValue) {
      const sourceTrack = resolveTrackSeed(trackOrId)

      if (!sourceTrack) {
        return false
      }

      favoriteTracks.value = upsertTrack(favoriteTracks.value, sourceTrack, {
        favoritedAt: Date.now(),
      })
      persistCurrentUserState()
      return true
    }

    favoriteTracks.value = favoriteTracks.value.filter((track) => track.id !== trackId)
    persistCurrentUserState()
    return false
  }

  function addLocalTrack(track: PlayerTrack) {
    downloadedTracks.value = upsertTrack(downloadedTracks.value, track, {
      downloadedAt: Date.now(),
    })
    persistCurrentUserState()

    return downloadedTracks.value[0] ?? null
  }

  function removeLocalTrack(trackId: string) {
    if (!trackId) {
      return
    }

    downloadedTracks.value = downloadedTracks.value.filter((track) => track.id !== trackId)
    persistCurrentUserState()
  }

  function clearLocalTracks() {
    downloadedTracks.value = []
    persistCurrentUserState()
  }

  function clearFavoriteTracks() {
    favoriteTracks.value = []
    persistCurrentUserState()
  }

  function markLocalTrackPlayed(trackId: string, lastTimeSeconds = 0) {
    downloadedTracks.value = updateTrackTiming(downloadedTracks.value, trackId, lastTimeSeconds)
    favoriteTracks.value = updateTrackTiming(favoriteTracks.value, trackId, lastTimeSeconds)
    persistCurrentUserState()
  }

  watch(currentUserKey, loadCurrentUserState, { immediate: true })

  return {
    addLocalTrack,
    clearFavoriteTracks,
    clearLocalTracks,
    currentUserKey,
    downloadedCollection,
    favoriteCollection,
    favoriteTracks,
    isFavorite,
    isLocalTrack,
    markLocalTrackPlayed,
    removeLocalTrack,
    toggleFavorite,
  }
})
