import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSongPlaybackSource } from '@/api/player'

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  coverUrl: string
  duration: string
  durationMs?: number
  audioUrl?: string
  sourceExpiresAt?: number
}

interface PersistedPlayerState {
  currentIndex: number
  currentTimeSeconds: number
  isMuted: boolean
  queue: PlayerTrack[]
  volume: number
}

const DEFAULT_VOLUME = 0.72
const PLAYER_STORAGE_KEY = 'your-music-player'
const PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS = 3
const SOURCE_REFRESH_BUFFER_MS = 15_000

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '00:00'
  }

  const seconds = Math.floor(totalSeconds)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function cloneTrack(track: PlayerTrack): PlayerTrack {
  return { ...track }
}

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

function readPersistedState(): PersistedPlayerState | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedPlayerState>
    const queue = Array.isArray(parsed.queue) ? parsed.queue.filter(isPlayerTrack).map(cloneTrack) : []
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

function isSourceExpired(expiresAt?: number) {
  return typeof expiresAt === 'number' && Date.now() >= expiresAt - SOURCE_REFRESH_BUFFER_MS
}

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<PlayerTrack | null>(null)
  const currentTimeSeconds = ref(0)
  const durationSeconds = ref(0)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const isMuted = ref(false)
  const error = ref('')
  const volume = ref(DEFAULT_VOLUME)
  const queue = ref<PlayerTrack[]>([])
  const currentIndex = ref(-1)

  const audio = typeof window !== 'undefined' ? new Audio() : null
  const sourceCache = new Map<string, { expiresAt?: number; url: string }>()
  let audioReady = false
  let requestToken = 0
  let pendingSeekTimeSeconds = 0
  let lastPersistedSecond = -1
  let lastVolumeBeforeMute = DEFAULT_VOLUME

  const currentTime = computed(() => formatTime(currentTimeSeconds.value))
  const durationLabel = computed(() => {
    if (durationSeconds.value > 0) {
      return formatTime(durationSeconds.value)
    }

    return currentTrack.value?.duration ?? '00:00'
  })
  const progressPercent = computed(() => {
    const totalSeconds =
      durationSeconds.value > 0
        ? durationSeconds.value
        : currentTrack.value?.durationMs
          ? currentTrack.value.durationMs / 1000
          : 0

    if (totalSeconds <= 0) {
      return 0
    }

    return clamp((currentTimeSeconds.value / totalSeconds) * 100, 0, 100)
  })
  const volumePercent = computed(() => Math.round((isMuted.value ? 0 : volume.value) * 100))
  const hasPrevious = computed(
    () => Boolean(currentTrack.value) && (currentIndex.value > 0 || currentTimeSeconds.value > 0),
  )
  const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < queue.value.length - 1)

  function applyVolumeState() {
    if (!audio) {
      return
    }

    audio.volume = isMuted.value ? 0 : volume.value
  }

  function persistState(force = false) {
    if (!canUseStorage()) {
      return
    }

    const roundedSeconds = Math.floor(currentTimeSeconds.value)

    if (!force && roundedSeconds <= lastPersistedSecond) {
      return
    }

    const safeQueue = queue.value.map((track) => {
      const nextTrack = cloneTrack(track)

      if (isSourceExpired(nextTrack.sourceExpiresAt)) {
        delete nextTrack.audioUrl
        delete nextTrack.sourceExpiresAt
      }

      return nextTrack
    })

    const payload: PersistedPlayerState = {
      currentIndex: currentIndex.value,
      currentTimeSeconds: currentTimeSeconds.value,
      isMuted: isMuted.value,
      queue: safeQueue,
      volume: volume.value,
    }

    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(payload))
    lastPersistedSecond = roundedSeconds
  }

  function hydrateSourceCache(tracks: PlayerTrack[]) {
    for (const track of tracks) {
      if (!track.audioUrl || isSourceExpired(track.sourceExpiresAt)) {
        continue
      }

      sourceCache.set(track.id, {
        url: track.audioUrl,
        expiresAt: track.sourceExpiresAt,
      })
    }
  }

  function syncDuration() {
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return
    }

    durationSeconds.value = audio.duration
  }

  function restorePendingSeek() {
    if (!audio || pendingSeekTimeSeconds <= 0 || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return
    }

    const nextTime = clamp(pendingSeekTimeSeconds, 0, Math.max(audio.duration - 0.25, 0))

    audio.currentTime = nextTime
    currentTimeSeconds.value = nextTime
    pendingSeekTimeSeconds = 0
  }

  function ensureAudio() {
    if (!audio || audioReady) {
      return
    }

    audio.preload = 'metadata'
    applyVolumeState()

    audio.addEventListener('loadstart', () => {
      isLoading.value = true
      error.value = ''
    })

    audio.addEventListener('timeupdate', () => {
      currentTimeSeconds.value = audio.currentTime

      if (Math.floor(audio.currentTime) >= lastPersistedSecond + 2) {
        persistState()
      }
    })

    audio.addEventListener('loadedmetadata', () => {
      syncDuration()
      restorePendingSeek()
    })

    audio.addEventListener('durationchange', syncDuration)

    audio.addEventListener('canplay', () => {
      isLoading.value = false
      syncDuration()
      restorePendingSeek()
    })

    audio.addEventListener('playing', () => {
      isLoading.value = false
      isPlaying.value = true
      syncDuration()
      persistState(true)
    })

    audio.addEventListener('pause', () => {
      isPlaying.value = false
      isLoading.value = false
      persistState(true)
    })

    audio.addEventListener('waiting', () => {
      isLoading.value = true
    })

    audio.addEventListener('ended', () => {
      currentTimeSeconds.value = 0
      isPlaying.value = false
      persistState(true)
      void playNextTrack()
    })

    audio.addEventListener('error', () => {
      isLoading.value = false
      isPlaying.value = false
      error.value = '当前歌曲播放失败，请稍后再试'
      persistState(true)
    })

    audioReady = true
  }

  function setQueue(tracks: PlayerTrack[], startIndex = 0) {
    queue.value = tracks.map(cloneTrack)
    hydrateSourceCache(queue.value)
    currentIndex.value = queue.value.length === 0 ? -1 : clamp(startIndex, 0, queue.value.length - 1)
  }

  function seekToSeconds(nextSeconds: number) {
    const totalSeconds =
      durationSeconds.value > 0
        ? durationSeconds.value
        : currentTrack.value?.durationMs
          ? currentTrack.value.durationMs / 1000
          : 0

    const safeTime = totalSeconds > 0 ? clamp(nextSeconds, 0, totalSeconds) : Math.max(nextSeconds, 0)

    currentTimeSeconds.value = safeTime

    if (!audio) {
      persistState(true)
      return
    }

    if (audio.src && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = clamp(safeTime, 0, Math.max(audio.duration - 0.25, 0))
    } else {
      pendingSeekTimeSeconds = safeTime
    }

    persistState(true)
  }

  async function resolveTrackSource(track: PlayerTrack) {
    if (track.audioUrl && !isSourceExpired(track.sourceExpiresAt)) {
      return {
        expiresAt: track.sourceExpiresAt,
        url: track.audioUrl,
      }
    }

    const cachedSource = sourceCache.get(track.id)

    if (cachedSource && !isSourceExpired(cachedSource.expiresAt)) {
      track.audioUrl = cachedSource.url
      track.sourceExpiresAt = cachedSource.expiresAt

      return cachedSource
    }

    const source = await getSongPlaybackSource(track.id)
    const expiresAt = source.expiresIn ? Date.now() + source.expiresIn * 1000 : undefined

    track.audioUrl = source.url
    track.sourceExpiresAt = expiresAt

    sourceCache.set(track.id, {
      url: source.url,
      expiresAt,
    })

    return {
      url: source.url,
      expiresAt,
    }
  }

  async function startPlayback(track: PlayerTrack, options: { startTimeSeconds?: number } = {}) {
    ensureAudio()

    if (!audio) {
      error.value = '当前环境不支持音频播放'
      return
    }

    const token = ++requestToken
    const startTimeSeconds = Math.max(options.startTimeSeconds ?? 0, 0)

    currentTrack.value = track
    currentTimeSeconds.value = startTimeSeconds
    durationSeconds.value = track.durationMs ? track.durationMs / 1000 : 0
    error.value = ''
    isLoading.value = true
    pendingSeekTimeSeconds = startTimeSeconds
    persistState(true)

    try {
      const source = await resolveTrackSource(track)

      if (token !== requestToken) {
        return
      }

      if (!source.url) {
        throw new Error('当前歌曲暂无可用音源')
      }

      if (audio.src !== source.url) {
        audio.src = source.url
      }

      restorePendingSeek()
      await audio.play()
    } catch (err) {
      if (token !== requestToken) {
        return
      }

      isLoading.value = false
      isPlaying.value = false
      error.value = err instanceof Error ? err.message : '播放失败，请稍后再试'
      persistState(true)
    }
  }

  async function playTrack(track: PlayerTrack) {
    setQueue([track], 0)

    const [nextTrack] = queue.value

    if (!nextTrack) {
      return
    }

    await startPlayback(nextTrack)
  }

  async function playQueue(tracks: PlayerTrack[], startIndex = 0) {
    setQueue(tracks, startIndex)

    const nextTrack = queue.value[currentIndex.value]

    if (!nextTrack) {
      return
    }

    await startPlayback(nextTrack)
  }

  async function playTrackAtIndex(index: number) {
    if (queue.value.length === 0) {
      return
    }

    const safeIndex = clamp(index, 0, queue.value.length - 1)
    currentIndex.value = safeIndex

    const nextTrack = queue.value[safeIndex]

    if (!nextTrack) {
      return
    }

    await startPlayback(nextTrack)
  }

  async function togglePlay() {
    ensureAudio()

    if (!audio || !currentTrack.value) {
      return
    }

    error.value = ''

    if (isPlaying.value) {
      audio.pause()
      return
    }

    if (
      currentTrack.value.audioUrl &&
      audio.src === currentTrack.value.audioUrl &&
      !isSourceExpired(currentTrack.value.sourceExpiresAt)
    ) {
      try {
        if (Math.abs(audio.currentTime - currentTimeSeconds.value) > 1) {
          audio.currentTime = currentTimeSeconds.value
        }

        await audio.play()
      } catch (err) {
        error.value = err instanceof Error ? err.message : '播放失败，请稍后再试'
      }
      return
    }

    await startPlayback(currentTrack.value, {
      startTimeSeconds: currentTimeSeconds.value,
    })
  }

  async function playPreviousTrack() {
    if (!currentTrack.value) {
      return
    }

    if (currentTimeSeconds.value > PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS || currentIndex.value <= 0) {
      seekToSeconds(0)
      return
    }

    await playTrackAtIndex(currentIndex.value - 1)
  }

  async function playNextTrack() {
    if (!hasNext.value) {
      if (audio) {
        audio.pause()
      }

      seekToSeconds(0)
      return
    }

    await playTrackAtIndex(currentIndex.value + 1)
  }

  function seekToPercent(nextPercent: number) {
    const totalSeconds =
      durationSeconds.value > 0
        ? durationSeconds.value
        : currentTrack.value?.durationMs
          ? currentTrack.value.durationMs / 1000
          : 0

    if (totalSeconds <= 0) {
      return
    }

    seekToSeconds((clamp(nextPercent, 0, 100) / 100) * totalSeconds)
  }

  function setVolume(nextVolume: number) {
    const safeVolume = clamp(nextVolume, 0, 1)

    volume.value = safeVolume

    if (safeVolume > 0) {
      lastVolumeBeforeMute = safeVolume
      isMuted.value = false
    } else {
      isMuted.value = true
    }

    applyVolumeState()
    persistState(true)
  }

  function toggleMute() {
    if (isMuted.value || volume.value <= 0) {
      isMuted.value = false
      volume.value = clamp(lastVolumeBeforeMute || DEFAULT_VOLUME, 0, 1)
    } else {
      lastVolumeBeforeMute = volume.value
      isMuted.value = true
    }

    applyVolumeState()
    persistState(true)
  }

  function restoreState() {
    const persistedState = readPersistedState()

    if (!persistedState) {
      return
    }

    volume.value = persistedState.volume
    lastVolumeBeforeMute = persistedState.volume > 0 ? persistedState.volume : DEFAULT_VOLUME
    isMuted.value = persistedState.isMuted
    queue.value = persistedState.queue.map(cloneTrack)
    hydrateSourceCache(queue.value)
    currentIndex.value = queue.value.length === 0 ? -1 : clamp(persistedState.currentIndex, 0, queue.value.length - 1)
    currentTrack.value = currentIndex.value >= 0 ? queue.value[currentIndex.value] ?? null : null
    durationSeconds.value = currentTrack.value?.durationMs ? currentTrack.value.durationMs / 1000 : 0
    currentTimeSeconds.value =
      currentTrack.value && currentTrack.value.durationMs
        ? clamp(persistedState.currentTimeSeconds, 0, currentTrack.value.durationMs / 1000)
        : 0
    pendingSeekTimeSeconds = currentTimeSeconds.value
  }

  ensureAudio()
  restoreState()
  applyVolumeState()

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      persistState(true)
    })
  }

  return {
    currentIndex,
    currentTime,
    currentTimeSeconds,
    currentTrack,
    durationLabel,
    error,
    hasNext,
    hasPrevious,
    isLoading,
    isMuted,
    isPlaying,
    playNextTrack,
    playPreviousTrack,
    playQueue,
    playTrack,
    progressPercent,
    queue,
    seekToPercent,
    setQueue,
    setVolume,
    toggleMute,
    togglePlay,
    volume,
    volumePercent,
  }
})
