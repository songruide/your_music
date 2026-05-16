import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSongPlaybackSource, type SongPlaybackSource } from '@/api/player'
import { useSettingsStore } from '@/stores/settings'
import { getSongLevelForQuality } from '@/utils/audioQuality'
import { throttle } from '@/utils/timing'
import {
  applyAudioVolume,
  createAudioDiagnostics,
  lockAudioPlaybackSettings,
  readAudioDurationSeconds,
  restoreAudioSeek,
} from './player/audio'
import {
  DEFAULT_PLAY_MODE,
  DEFAULT_VOLUME,
  INTERACTIVE_PERSIST_INTERVAL_MS,
  LOCKED_PLAYBACK_RATE,
  PLAY_MODE_SEQUENCE,
  PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS,
} from './player/constants'
import { readPersistedPlayerState, writePersistedPlayerState } from './player/persistence'
import type { AudioDiagnostics, PersistedPlayerState, PlayerPlayMode, PlayerTrack } from './player/types'
import {
  clamp,
  cloneTrack,
  formatTime,
  getSafeTrackTime,
  getTrackDurationSeconds,
  isSourceExpired,
} from './player/utils'

export type { PlayerTrack, PlayerTrackSourceMeta, RecentPlayerTrack } from './player/types'

export const usePlayerStore = defineStore('player', () => {
  const settingsStore = useSettingsStore()
  const currentTrack = ref<PlayerTrack | null>(null)
  const currentTimeSeconds = ref(0)
  const durationSeconds = ref(0)
  const debugEnabled = ref(false)
  const isDetailVisible = ref(false)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const isMuted = ref(false)
  const error = ref('')
  const volume = ref(DEFAULT_VOLUME)
  const queue = ref<PlayerTrack[]>([])
  const currentIndex = ref(-1)
  const playMode = ref<PlayerPlayMode>(DEFAULT_PLAY_MODE)

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
  const playModeLabel = computed(() => {
    switch (playMode.value) {
      case 'single-loop':
        return '单曲循环'
      case 'list-loop':
        return '列表循环'
      case 'shuffle':
        return '随机播放'
      case 'sequential':
      default:
        return '顺序播放'
    }
  })
  const hasPrevious = computed(() => {
    if (!currentTrack.value) {
      return false
    }

    if (currentTimeSeconds.value > 0 || currentIndex.value > 0) {
      return true
    }

    return (playMode.value === 'list-loop' || playMode.value === 'shuffle') && queue.value.length > 1
  })
  const hasNext = computed(() => {
    if (!currentTrack.value || currentIndex.value < 0 || queue.value.length === 0) {
      return false
    }

    if (playMode.value === 'list-loop') {
      return queue.value.length > 1 || currentIndex.value < queue.value.length - 1
    }

    if (playMode.value === 'shuffle') {
      return queue.value.length > 1
    }

    return currentIndex.value < queue.value.length - 1
  })
  const debugSnapshot = computed(() => ({
    audioCurrentSrc: audioDiagnostics.value.currentSrc,
    bitrate: currentTrack.value?.sourceMeta?.bitrate,
    currentTimeSeconds: Number(currentTimeSeconds.value.toFixed(2)),
    currentTrackId: currentTrack.value?.id ?? '',
    directUrl: currentTrack.value?.sourceMeta?.directUrl ?? '',
    durationSeconds: Number(durationSeconds.value.toFixed(2)),
    expiresAt: currentTrack.value?.sourceExpiresAt,
    fee: currentTrack.value?.sourceMeta?.fee,
    freeTrialInfo: currentTrack.value?.sourceMeta?.freeTrialInfo,
    level: currentTrack.value?.sourceMeta?.level ?? '',
    networkState: audioDiagnostics.value.networkState,
    payed: currentTrack.value?.sourceMeta?.payed,
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
      fee: source.fee,
      freeTrialInfo: source.freeTrialInfo,
      level: source.level,
      payed: source.payed,
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
      playMode: playMode.value,
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

      const level = track.sourceMeta?.level ?? getSongLevelForQuality(settingsStore.quality)

      sourceCache.set(`${track.id}:${level}`, {
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
    isDetailVisible.value = false
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
      void playNextTrack({ automatic: true })
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

  function getRandomQueueIndex() {
    if (queue.value.length <= 1) {
      return currentIndex.value >= 0 ? currentIndex.value : 0
    }

    let nextIndex = currentIndex.value

    while (nextIndex === currentIndex.value) {
      nextIndex = Math.floor(Math.random() * queue.value.length)
    }

    return nextIndex
  }

  function getNextQueueIndex(automatic = false) {
    if (currentIndex.value < 0 || queue.value.length === 0) {
      return -1
    }

    if (playMode.value === 'single-loop' && automatic) {
      return currentIndex.value
    }

    if (playMode.value === 'shuffle') {
      return getRandomQueueIndex()
    }

    if (currentIndex.value < queue.value.length - 1) {
      return currentIndex.value + 1
    }

    if (automatic && queue.value.length > 0) {
      return 0
    }

    if (playMode.value === 'list-loop') {
      return 0
    }

    return -1
  }

  function getPreviousQueueIndex() {
    if (currentIndex.value < 0 || queue.value.length === 0) {
      return -1
    }

    if (playMode.value === 'shuffle') {
      return getRandomQueueIndex()
    }

    if (currentIndex.value > 0) {
      return currentIndex.value - 1
    }

    if (playMode.value === 'list-loop' && queue.value.length > 1) {
      return queue.value.length - 1
    }

    return -1
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
    if (track.localAudioPath) {
      const params = new URLSearchParams({
        id: track.id,
        path: track.localAudioPath,
      })
      const localUrl = `/api/player/local-file?${params.toString()}`

      track.audioUrl = localUrl
      delete track.sourceExpiresAt

      return {
        expiresAt: undefined,
        url: localUrl,
      }
    }

    if (track.audioUrl && !isSourceExpired(track.sourceExpiresAt)) {
      return {
        expiresAt: track.sourceExpiresAt,
        url: track.audioUrl,
      }
    }

    const preferredLevel = getSongLevelForQuality(settingsStore.quality)
    const cachedSource = sourceCache.get(`${track.id}:${preferredLevel}`)

    if (cachedSource && !isSourceExpired(cachedSource.expiresAt)) {
      track.audioUrl = cachedSource.url
      track.sourceExpiresAt = cachedSource.expiresAt

      return cachedSource
    }

    const source = await getSongPlaybackSource(track.id, preferredLevel)
    const expiresAt = source.expiresIn ? Date.now() + source.expiresIn * 1000 : undefined

    track.audioUrl = source.streamUrl ?? source.url
    assignSourceMeta(track, source)
    track.sourceExpiresAt = expiresAt

    sourceCache.set(`${track.id}:${source.level ?? preferredLevel}`, {
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

  async function playTrack(track: PlayerTrack, options: { startTimeSeconds?: number } = {}) {
    await playQueue([track], 0, options)
  }

  async function playQueue(
    tracks: PlayerTrack[],
    startIndex = 0,
    options: { startTimeSeconds?: number } = {},
  ) {
    setQueue(tracks, startIndex)

    const nextTrack = getTrackAtIndex(currentIndex.value)

    if (!nextTrack) {
      return
    }

    await startPlayback(nextTrack, options)
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

  async function enqueueNextTrack(track: PlayerTrack) {
    const nextTrack = cloneTrack(track)

    hydrateSourceCache([nextTrack])

    if (!currentTrack.value || currentIndex.value < 0 || queue.value.length === 0) {
      setQueue([nextTrack], 0)

      const firstTrack = getTrackAtIndex(currentIndex.value)

      if (firstTrack) {
        await startPlayback(firstTrack)
      }

      return
    }

    if (currentTrack.value.id === nextTrack.id) {
      return
    }

    let nextCurrentIndex = currentIndex.value
    const nextQueue = queue.value.filter((queuedTrack, index) => {
      const shouldRemove = queuedTrack.id === nextTrack.id

      if (shouldRemove && index < nextCurrentIndex) {
        nextCurrentIndex -= 1
      }

      return !shouldRemove
    })
    const insertIndex = clamp(nextCurrentIndex + 1, 0, nextQueue.length)

    queue.value = [
      ...nextQueue.slice(0, insertIndex),
      nextTrack,
      ...nextQueue.slice(insertIndex),
    ]
    currentIndex.value = nextCurrentIndex
    persistState(true)
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

    if (currentTimeSeconds.value > PREVIOUS_TRACK_RESTART_THRESHOLD_SECONDS) {
      seekToSeconds(0)
      return
    }

    const previousIndex = getPreviousQueueIndex()

    if (previousIndex < 0) {
      seekToSeconds(0)
      return
    }

    await playTrackAtIndex(previousIndex)
  }

  async function playNextTrack(options: { automatic?: boolean } = {}) {
    const nextIndex = getNextQueueIndex(Boolean(options.automatic))

    if (nextIndex < 0) {
      if (audio) {
        audio.pause()
      }

      seekToSeconds(0)
      return
    }

    if (nextIndex === currentIndex.value) {
      seekToSeconds(0)
    }

    await playTrackAtIndex(nextIndex)
  }

  function setPlayMode(nextMode: PlayerPlayMode) {
    playMode.value = nextMode
    persistState(true)
  }

  function cyclePlayMode() {
    const currentModeIndex = PLAY_MODE_SEQUENCE.indexOf(playMode.value)
    const nextModeIndex = currentModeIndex >= 0 ? currentModeIndex + 1 : 0

    setPlayMode(PLAY_MODE_SEQUENCE[nextModeIndex % PLAY_MODE_SEQUENCE.length])
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

  function openDetail() {
    if (!currentTrack.value) {
      return
    }

    isDetailVisible.value = true
  }

  function closeDetail() {
    isDetailVisible.value = false
  }

  function toggleDetail(nextValue?: boolean) {
    if (typeof nextValue === 'boolean') {
      if (nextValue) {
        openDetail()
        return
      }

      closeDetail()
      return
    }

    if (isDetailVisible.value) {
      closeDetail()
      return
    }

    openDetail()
  }

  function restoreState() {
    const persistedState = readPersistedPlayerState()

    if (!persistedState) {
      return
    }

    volume.value = persistedState.volume
    lastVolumeBeforeMute = persistedState.volume > 0 ? persistedState.volume : DEFAULT_VOLUME
    isMuted.value = persistedState.isMuted
    playMode.value = persistedState.playMode
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
    cyclePlayMode,
    closeDetail,
    hasNext,
    hasPrevious,
    isDetailVisible,
    isLoading,
    isMuted,
    isPlaying,
    openDetail,
    enqueueNextTrack,
    playMode,
    playModeLabel,
    playNextTrack,
    playPreviousTrack,
    playQueue,
    playTrack,
    playTrackAtIndex,
    progressPercent,
    queue,
    seekToPercent,
    seekToSeconds,
    setQueue,
    setPlayMode,
    setVolume,
    toggleDebug,
    toggleDetail,
    toggleMute,
    togglePlay,
    volume,
    volumePercent,
  }
})
