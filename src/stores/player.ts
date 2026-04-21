import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSongPlaybackSource, type SongPlaybackSource } from '@/api/player'
import { throttle } from '@/utils/timing'
import {
  applyAudioVolume,
  createAudioDiagnostics,
  lockAudioPlaybackSettings,
  readAudioDurationSeconds,
  restoreAudioSeek,
} from './player/audio'
import {
  DEFAULT_VOLUME,
  INTERACTIVE_PERSIST_INTERVAL_MS,
  LOCKED_PLAYBACK_RATE,
  PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS,
} from './player/constants'
import { readPersistedPlayerState, writePersistedPlayerState } from './player/persistence'
import type { AudioDiagnostics, PersistedPlayerState, PlayerTrack } from './player/types'
import {
  clamp,
  cloneTrack,
  formatTime,
  getSafeTrackTime,
  getTrackDurationSeconds,
  isSourceExpired,
} from './player/utils'

export type { PlayerTrack, PlayerTrackSourceMeta } from './player/types'

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<PlayerTrack | null>(null)
  const currentTimeSeconds = ref(0)
  const durationSeconds = ref(0)
  const debugEnabled = ref(false)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const isMuted = ref(false)
  const error = ref('')
  const volume = ref(DEFAULT_VOLUME)
  const queue = ref<PlayerTrack[]>([])
  const currentIndex = ref(-1)

  const audio = typeof window !== 'undefined' ? new Audio() : null
  const audioDiagnostics = ref<AudioDiagnostics>(createAudioDiagnostics(audio))
  const sourceCache = new Map<string, { expiresAt?: number; url: string }>()
  let audioReady = false
  let requestToken = 0
  let pendingSeekTimeSeconds = 0
  let lastPersistedSecond = -1
  let lastVolumeBeforeMute = DEFAULT_VOLUME

  const currentTime = computed(() => formatTime(currentTimeSeconds.value))
  const knownDurationSeconds = computed(() => {
    if (durationSeconds.value > 0) {
      return durationSeconds.value
    }

    return getTrackDurationSeconds(currentTrack.value)
  })
  const durationLabel = computed(() => {
    if (durationSeconds.value > 0) {
      return formatTime(durationSeconds.value)
    }

    return currentTrack.value?.duration ?? '00:00'
  })
  const progressPercent = computed(() => {
    const totalSeconds = knownDurationSeconds.value

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
  const debugSnapshot = computed(() => ({
    audioCurrentSrc: audioDiagnostics.value.currentSrc,
    bitrate: currentTrack.value?.sourceMeta?.bitrate,
    currentTimeSeconds: Number(currentTimeSeconds.value.toFixed(2)),
    currentTrackId: currentTrack.value?.id ?? '',
    directUrl: currentTrack.value?.sourceMeta?.directUrl ?? '',
    durationSeconds: Number(durationSeconds.value.toFixed(2)),
    expiresAt: currentTrack.value?.sourceExpiresAt,
    level: currentTrack.value?.sourceMeta?.level ?? '',
    networkState: audioDiagnostics.value.networkState,
    playbackRate: audioDiagnostics.value.playbackRate,
    readyState: audioDiagnostics.value.readyState,
    resolvedAudioUrl: currentTrack.value?.audioUrl ?? '',
    sampleRate: currentTrack.value?.sourceMeta?.sampleRate,
    sourceMode: currentTrack.value?.sourceMeta?.sourceMode ?? '',
    streamUrl: currentTrack.value?.sourceMeta?.streamUrl ?? '',
    type: currentTrack.value?.sourceMeta?.type ?? '',
  }))

  function applyVolumeState() {
    applyAudioVolume(audio, isMuted.value, volume.value)
  }

  function applyPlaybackSettings() {
    lockAudioPlaybackSettings(audio)
  }

  function syncAudioDiagnostics() {
    audioDiagnostics.value = createAudioDiagnostics(audio)
  }

  function assignSourceMeta(track: PlayerTrack, source: SongPlaybackSource) {
    track.sourceMeta = {
      bitrate: source.bitrate,
      directUrl: source.url,
      level: source.level,
      sampleRate: source.sampleRate,
      sourceMode: source.sourceMode,
      streamUrl: source.streamUrl,
      type: source.type,
    }
  }

  function persistState(force = false) {
    const roundedSeconds = Math.floor(currentTimeSeconds.value)

    if (!force && roundedSeconds <= lastPersistedSecond) {
      return
    }

    const payload: PersistedPlayerState = {
      currentIndex: currentIndex.value,
      currentTimeSeconds: currentTimeSeconds.value,
      isMuted: isMuted.value,
      queue: queue.value,
      volume: volume.value,
    }

    if (writePersistedPlayerState(payload)) {
      lastPersistedSecond = roundedSeconds
    }
  }

  // 进度条和音量滑杆会在拖动时连续触发，保留即时反馈，
  // 但把本地持久化频率压低，避免频繁写 localStorage。
  const persistInteractiveState = throttle(() => {
    persistState(true)
  }, INTERACTIVE_PERSIST_INTERVAL_MS)

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
    const nextDurationSeconds = readAudioDurationSeconds(audio)

    if (nextDurationSeconds === null) {
      return
    }

    durationSeconds.value = nextDurationSeconds
  }

  function syncTrackPlaybackState(track: PlayerTrack | null, nextTimeSeconds = 0) {
    currentTrack.value = track
    durationSeconds.value = getTrackDurationSeconds(track)
    currentTimeSeconds.value = getSafeTrackTime(track, nextTimeSeconds)
    pendingSeekTimeSeconds = currentTimeSeconds.value
  }

  function getTrackAtIndex(index: number) {
    if (index < 0) {
      return null
    }

    return queue.value[index] ?? null
  }

  function clearPlaybackState() {
    currentIndex.value = -1
    syncTrackPlaybackState(null)
    error.value = ''
    isLoading.value = false
    isPlaying.value = false
  }

  function restorePendingSeek() {
    const nextTime = restoreAudioSeek(audio, pendingSeekTimeSeconds)

    if (nextTime === null) {
      return
    }

    currentTimeSeconds.value = nextTime
    pendingSeekTimeSeconds = 0
  }

  function ensureAudio() {
    if (!audio || audioReady) {
      return
    }

    audio.preload = 'metadata'
    applyPlaybackSettings()
    applyVolumeState()

    audio.addEventListener('loadstart', () => {
      isLoading.value = true
      error.value = ''
      syncAudioDiagnostics()
    })

    audio.addEventListener('timeupdate', () => {
      currentTimeSeconds.value = audio.currentTime
      syncAudioDiagnostics()

      if (Math.floor(audio.currentTime) >= lastPersistedSecond + 2) {
        persistState()
      }
    })

    audio.addEventListener('loadedmetadata', () => {
      applyPlaybackSettings()
      syncDuration()
      restorePendingSeek()
      syncAudioDiagnostics()
    })

    audio.addEventListener('durationchange', syncDuration)

    audio.addEventListener('canplay', () => {
      isLoading.value = false
      applyPlaybackSettings()
      syncDuration()
      restorePendingSeek()
      syncAudioDiagnostics()
    })

    audio.addEventListener('playing', () => {
      isLoading.value = false
      isPlaying.value = true
      applyPlaybackSettings()
      syncDuration()
      syncAudioDiagnostics()
      persistState(true)
    })

    audio.addEventListener('pause', () => {
      isPlaying.value = false
      isLoading.value = false
      syncAudioDiagnostics()
      persistState(true)
    })

    audio.addEventListener('waiting', () => {
      isLoading.value = true
      syncAudioDiagnostics()
    })

    audio.addEventListener('ratechange', () => {
      if (Math.abs(audio.playbackRate - LOCKED_PLAYBACK_RATE) > 0.001) {
        applyPlaybackSettings()
      }

      syncAudioDiagnostics()
    })

    audio.addEventListener('ended', () => {
      currentTimeSeconds.value = 0
      isPlaying.value = false
      syncAudioDiagnostics()
      persistState(true)
      void playNextTrack()
    })

    audio.addEventListener('error', () => {
      isLoading.value = false
      isPlaying.value = false
      error.value = '当前歌曲播放失败，请稍后再试'
      syncAudioDiagnostics()
      persistState(true)
    })

    audioReady = true
  }

  function setQueue(tracks: PlayerTrack[], startIndex = 0) {
    queue.value = tracks.map(cloneTrack)
    hydrateSourceCache(queue.value)

    if (queue.value.length === 0) {
      clearPlaybackState()
      return
    }

    currentIndex.value = clamp(startIndex, 0, queue.value.length - 1)
  }

  function seekToSeconds(nextSeconds: number) {
    const totalSeconds = knownDurationSeconds.value

    const safeTime = totalSeconds > 0 ? clamp(nextSeconds, 0, totalSeconds) : Math.max(nextSeconds, 0)

    currentTimeSeconds.value = safeTime

    if (!audio) {
      persistInteractiveState()
      return
    }

    if (audio.src && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = clamp(safeTime, 0, Math.max(audio.duration - 0.25, 0))
    } else {
      pendingSeekTimeSeconds = safeTime
    }

    persistInteractiveState()
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

    track.audioUrl = source.streamUrl ?? source.url
    assignSourceMeta(track, source)
    track.sourceExpiresAt = expiresAt

    sourceCache.set(track.id, {
      url: track.audioUrl,
      expiresAt,
    })

    return {
      url: track.audioUrl,
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

    syncTrackPlaybackState(track, startTimeSeconds)
    error.value = ''
    isLoading.value = true
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

      applyPlaybackSettings()
      syncAudioDiagnostics()
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
    await playQueue([track], 0)
  }

  async function playQueue(tracks: PlayerTrack[], startIndex = 0) {
    setQueue(tracks, startIndex)

    const nextTrack = getTrackAtIndex(currentIndex.value)

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

    const nextTrack = getTrackAtIndex(safeIndex)

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
    const totalSeconds = knownDurationSeconds.value

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
    persistInteractiveState()
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

  function toggleDebug() {
    debugEnabled.value = !debugEnabled.value
  }

  function restoreState() {
    const persistedState = readPersistedPlayerState()

    if (!persistedState) {
      return
    }

    volume.value = persistedState.volume
    lastVolumeBeforeMute = persistedState.volume > 0 ? persistedState.volume : DEFAULT_VOLUME
    isMuted.value = persistedState.isMuted
    queue.value = persistedState.queue.map(cloneTrack)
    hydrateSourceCache(queue.value)

    if (queue.value.length === 0) {
      clearPlaybackState()
      return
    }

    currentIndex.value = clamp(persistedState.currentIndex, 0, queue.value.length - 1)
    syncTrackPlaybackState(getTrackAtIndex(currentIndex.value), persistedState.currentTimeSeconds)
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
    debugEnabled,
    debugSnapshot,
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
    toggleDebug,
    toggleMute,
    togglePlay,
    volume,
    volumePercent,
  }
})
