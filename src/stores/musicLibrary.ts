import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { downloadSong } from '@/api/player'
import { getSongLevelForQuality } from '@/utils/audioQuality'
import { useAuthStore } from './auth'
import { useSettingsStore } from './settings'
import type { PlayerTrack, RecentPlayerTrack } from './player/types'
import type { ArtistRef } from '@/types/music'

const LIBRARY_STORAGE_KEY = 'your-music:music-library:v2'
const LIBRARY_STORAGE_VERSION = 3
const LEGACY_PLAYER_STORAGE_KEY = 'your-music-player'
const GUEST_USER_KEY = 'guest'
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
  legacyPlayerFavoritesMigrated?: boolean
}

interface LibraryStoragePayload {
  users: Record<string, UserLibrarySnapshot>
  version: number
}

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
    return false
  }

  try {
    const serialized = JSON.stringify(value)

    window.localStorage.setItem(key, serialized)

    return window.localStorage.getItem(key) === serialized
  } catch {
    return false
  }
}

function clonePlayerTrack(track: PlayerTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artists: track.artists?.map((artist) => ({ ...artist })),
    albumId: track.albumId,
    album: track.album,
    coverUrl: track.coverUrl,
    duration: track.duration,
    durationMs: track.durationMs,
    audioUrl: track.audioUrl,
    localAudioPath: track.localAudioPath,
    localLyricPath: track.localLyricPath,
    sourceMeta: track.sourceMeta ? { ...track.sourceMeta } : undefined,
    sourceExpiresAt: track.sourceExpiresAt,
  }
}

type DownloadTaskStatus = 'done' | 'downloading' | 'error' | 'queued'

export interface LibraryDownloadTask {
  error?: string
  fileName?: string
  status: DownloadTaskStatus
  trackId: string
}

function normalizeTrackArtists(value: unknown, fallbackArtistLabel: string): ArtistRef[] {
  if (Array.isArray(value)) {
    const artists = value
      .map((artist) => {
        if (!artist || typeof artist !== 'object') {
          return null
        }

        const name = String((artist as Partial<ArtistRef>).name ?? '').trim()

        if (!name) {
          return null
        }

        return {
          id: String((artist as Partial<ArtistRef>).id ?? '').trim(),
          name,
        }
      })
      .filter((artist): artist is ArtistRef => Boolean(artist))

    if (artists.length > 0) {
      return artists
    }
  }

  return fallbackArtistLabel
    .split(/\s*(?:\/|、|,|，)\s*/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: '',
      name,
    }))
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
    artists: normalizeTrackArtists(track.artists, artist),
    albumId: track.albumId ? String(track.albumId).trim() : undefined,
    album: track.album ? String(track.album) : '单曲收藏',
    coverUrl: track.coverUrl ? String(track.coverUrl) : '',
    duration: track.duration ? String(track.duration) : '00:00',
    durationMs: Number.isFinite(track.durationMs) ? Number(track.durationMs) : undefined,
    audioUrl: track.audioUrl ? String(track.audioUrl) : undefined,
    localAudioPath: track.localAudioPath ? String(track.localAudioPath) : undefined,
    localLyricPath: track.localLyricPath ? String(track.localLyricPath) : undefined,
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

function normalizeLegacyFavoriteTrackList(value: unknown): StoredLibraryTrack[] {
  if (!Array.isArray(value)) {
    return []
  }

  const now = Date.now()

  return normalizeTrackList(
    value
      .filter((item) => Boolean(item && typeof item === 'object' && (item as { isFavorite?: unknown }).isFavorite === true))
      .map((item) => {
        const track = item as Partial<StoredLibraryTrack>

        return {
          ...track,
          favoritedAt: Number.isFinite(track.favoritedAt) ? Number(track.favoritedAt) : now,
        }
      }),
  )
}

function readLegacyPlayerFavoriteTracks() {
  const legacyState = readJson<unknown>(LEGACY_PLAYER_STORAGE_KEY, null)

  if (Array.isArray(legacyState)) {
    return normalizeLegacyFavoriteTrackList(legacyState)
  }

  if (!legacyState || typeof legacyState !== 'object') {
    return []
  }

  const state = legacyState as Record<string, unknown>

  return normalizeTrackList([
    ...normalizeLegacyFavoriteTrackList(state.favoriteTracks),
    ...normalizeLegacyFavoriteTrackList(state.recentTracks),
    ...normalizeLegacyFavoriteTrackList(state.queue),
    ...normalizeLegacyFavoriteTrackList(state.tracks),
  ])
}

function mergeTrackLists(primaryTracks: StoredLibraryTrack[], nextTracks: StoredLibraryTrack[]) {
  const seenIds = new Set(primaryTracks.map((track) => track.id))

  return [
    ...primaryTracks,
    ...nextTracks.filter((track) => {
      if (seenIds.has(track.id)) {
        return false
      }

      seenIds.add(track.id)
      return true
    }),
  ].slice(0, LOCAL_MUSIC_LIMIT)
}

function normalizeSnapshot(value: unknown): UserLibrarySnapshot {
  const snapshot = value && typeof value === 'object' ? (value as Partial<UserLibrarySnapshot>) : {}

  return {
    downloadedTracks: normalizeTrackList(snapshot.downloadedTracks),
    favoriteTracks: normalizeTrackList(snapshot.favoriteTracks),
    legacyPlayerFavoritesMigrated: Boolean(snapshot.legacyPlayerFavoritesMigrated),
  }
}

function createEmptySnapshot(options: Pick<UserLibrarySnapshot, 'legacyPlayerFavoritesMigrated'> = {}) {
  return {
    downloadedTracks: [],
    favoriteTracks: [],
    legacyPlayerFavoritesMigrated: Boolean(options.legacyPlayerFavoritesMigrated),
  }
}

function normalizeUserMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([userKey]) => userKey && userKey !== 'version' && userKey !== 'users')
      .map(([userKey, snapshot]) => [userKey, normalizeSnapshot(snapshot)]),
  )
}

function normalizePayload(value: unknown): LibraryStoragePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      users: {},
      version: LIBRARY_STORAGE_VERSION,
    }
  }

  const rawPayload = value as Record<string, unknown>
  const version = Number(rawPayload.version)
  const users = rawPayload.users ? normalizeUserMap(rawPayload.users) : normalizeUserMap(rawPayload)

  return {
    users,
    version: Number.isFinite(version) && version > 0 ? version : 1,
  }
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
  const settingsStore = useSettingsStore()
  const payload = ref<LibraryStoragePayload>(normalizePayload(readJson(LIBRARY_STORAGE_KEY, {})))
  const downloadedTracks = ref<StoredLibraryTrack[]>([])
  const favoriteTracks = ref<StoredLibraryTrack[]>([])
  const legacyPlayerFavoritesMigrated = ref(false)
  const downloadTasks = ref<Record<string, LibraryDownloadTask>>({})
  const persistenceError = ref('')
  const downloadQueue: PlayerTrack[] = []
  const queuedTrackIds = new Set<string>()
  let activeDownloadCount = 0

  const currentUserKey = computed(() => {
    if (authStore.loggedIn && authStore.profile?.userId) {
      return `user:${authStore.profile.userId}`
    }

    return GUEST_USER_KEY
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

  function hasSnapshotContent(snapshot?: UserLibrarySnapshot) {
    return Boolean(snapshot && (snapshot.downloadedTracks.length > 0 || snapshot.favoriteTracks.length > 0))
  }

  function writePayload(nextPayload: LibraryStoragePayload) {
    payload.value = {
      users: nextPayload.users,
      version: LIBRARY_STORAGE_VERSION,
    }

    const isPersisted = writeJson(LIBRARY_STORAGE_KEY, payload.value)
    persistenceError.value = isPersisted ? '' : '收藏保存失败，请检查浏览器本地存储权限。'

    return isPersisted
  }

  function updateStoredSnapshot(userKey: string, snapshot: UserLibrarySnapshot) {
    writePayload({
      users: {
        ...payload.value.users,
        [userKey]: normalizeSnapshot(snapshot),
      },
      version: LIBRARY_STORAGE_VERSION,
    })
  }

  function mergeGuestLibraryIntoAccount(userKey: string) {
    if (userKey === GUEST_USER_KEY) {
      return
    }

    const guestSnapshot = payload.value.users[GUEST_USER_KEY]

    if (!hasSnapshotContent(guestSnapshot)) {
      return
    }

    const accountSnapshot = normalizeSnapshot(payload.value.users[userKey])

    writePayload({
      users: {
        ...payload.value.users,
        [userKey]: {
          downloadedTracks: mergeTrackLists(accountSnapshot.downloadedTracks, guestSnapshot.downloadedTracks),
          favoriteTracks: mergeTrackLists(accountSnapshot.favoriteTracks, guestSnapshot.favoriteTracks),
          legacyPlayerFavoritesMigrated:
            accountSnapshot.legacyPlayerFavoritesMigrated || guestSnapshot.legacyPlayerFavoritesMigrated,
        },
        [GUEST_USER_KEY]: createEmptySnapshot({
          legacyPlayerFavoritesMigrated: guestSnapshot.legacyPlayerFavoritesMigrated,
        }),
      },
      version: LIBRARY_STORAGE_VERSION,
    })
  }

  function loadCurrentUserState() {
    const userKey = currentUserKey.value

    mergeGuestLibraryIntoAccount(userKey)

    const snapshot = normalizeSnapshot(payload.value.users[userKey])

    downloadedTracks.value = snapshot.downloadedTracks
    favoriteTracks.value = snapshot.favoriteTracks
    legacyPlayerFavoritesMigrated.value = Boolean(snapshot.legacyPlayerFavoritesMigrated)
    migrateLegacyPlayerFavorites()
  }

  function persistCurrentUserState() {
    updateStoredSnapshot(currentUserKey.value, {
      downloadedTracks: downloadedTracks.value,
      favoriteTracks: favoriteTracks.value,
      legacyPlayerFavoritesMigrated: legacyPlayerFavoritesMigrated.value,
    })
  }

  function migrateLegacyPlayerFavorites() {
    if (legacyPlayerFavoritesMigrated.value) {
      return
    }

    const legacyFavorites = readLegacyPlayerFavoriteTracks()

    legacyPlayerFavoritesMigrated.value = true

    if (legacyFavorites.length > 0) {
      favoriteTracks.value = mergeTrackLists(favoriteTracks.value, legacyFavorites)
    }

    persistCurrentUserState()
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

  function isDownloadingTrack(trackId?: string) {
    return Boolean(trackId && ['downloading', 'queued'].includes(downloadTasks.value[trackId]?.status ?? ''))
  }

  function setDownloadTask(task: LibraryDownloadTask) {
    downloadTasks.value = {
      ...downloadTasks.value,
      [task.trackId]: task,
    }
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

  function buildDownloadTrack(track: PlayerTrack) {
    return {
      album: track.album,
      artist: track.artist,
      artists: track.artists?.map((artist) => ({ ...artist })),
      coverUrl: track.coverUrl,
      duration: track.duration,
      durationMs: track.durationMs,
      id: track.id,
      title: track.title,
    }
  }

  async function runDownloadTask(track: PlayerTrack) {
    activeDownloadCount += 1
    setDownloadTask({
      status: 'downloading',
      trackId: track.id,
    })

    try {
      const result = await downloadSong({
        directory: settingsStore.downloadDir,
        includeLyrics: Boolean(settingsStore.toggles.downloadLyrics),
        level: getSongLevelForQuality(settingsStore.quality),
        nameFormat: settingsStore.nameFormat,
        track: buildDownloadTrack(track),
      })
      const nextTrack: PlayerTrack = {
        ...track,
        audioUrl: `/api/player/local-file?${new URLSearchParams({
          id: track.id,
          path: result.audioPath,
        }).toString()}`,
        localAudioPath: result.audioPath,
        localLyricPath: result.lyricPath,
        sourceMeta: {
          ...(track.sourceMeta ?? {}),
          bitrate: result.bitrate,
          level: result.level,
          sourceMode: 'local-download',
          type: result.type,
        },
        sourceExpiresAt: undefined,
      }

      addLocalTrack(nextTrack)
      setDownloadTask({
        fileName: result.fileName,
        status: 'done',
        trackId: track.id,
      })
    } catch (error) {
      setDownloadTask({
        error: error instanceof Error ? error.message : '下载失败',
        status: 'error',
        trackId: track.id,
      })
    } finally {
      activeDownloadCount = Math.max(0, activeDownloadCount - 1)
      runNextDownloadTasks()
    }
  }

  function runNextDownloadTasks() {
    const limit = Math.max(Number(settingsStore.downloadTaskCount) || 1, 1)

    while (activeDownloadCount < limit && downloadQueue.length > 0) {
      const nextTrack = downloadQueue.shift()

      if (!nextTrack) {
        break
      }

      queuedTrackIds.delete(nextTrack.id)
      void runDownloadTask(nextTrack)
    }
  }

  function downloadLocalTrack(track: PlayerTrack) {
    if (!track.id || isDownloadingTrack(track.id)) {
      return
    }

    if (isLocalTrack(track.id)) {
      setDownloadTask({
        status: 'done',
        trackId: track.id,
      })
      return
    }

    if (!queuedTrackIds.has(track.id)) {
      queuedTrackIds.add(track.id)
      downloadQueue.push(track)
    }

    setDownloadTask({
      status: 'queued',
      trackId: track.id,
    })
    runNextDownloadTasks()
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
    downloadLocalTrack,
    downloadTasks,
    downloadedCollection,
    favoriteCollection,
    favoriteTracks,
    isFavorite,
    isDownloadingTrack,
    isLocalTrack,
    markLocalTrackPlayed,
    persistenceError,
    removeLocalTrack,
    toggleFavorite,
  }
})
