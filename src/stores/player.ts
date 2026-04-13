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
}

const DEFAULT_VOLUME = 0.72

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

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<PlayerTrack | null>(null)
  const currentTimeSeconds = ref(0)
  const durationSeconds = ref(0)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const error = ref('')
  const volume = ref(DEFAULT_VOLUME)
  const queue = ref<PlayerTrack[]>([])
  const currentIndex = ref(-1)

  const audio = typeof window !== 'undefined' ? new Audio() : null
  let audioReady = false
  let requestToken = 0

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
  const hasPrevious = computed(() => currentIndex.value > 0)
  const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < queue.value.length - 1)

  function syncDuration() {
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return
    }

    durationSeconds.value = audio.duration
  }

  function ensureAudio() {
    if (!audio || audioReady) {
      return
    }

    audio.preload = 'metadata'
    audio.volume = volume.value

    audio.addEventListener('loadstart', () => {
      isLoading.value = true
      error.value = ''
    })

    audio.addEventListener('timeupdate', () => {
      currentTimeSeconds.value = audio.currentTime
    })

    audio.addEventListener('loadedmetadata', syncDuration)
    audio.addEventListener('durationchange', syncDuration)

    audio.addEventListener('canplay', () => {
      isLoading.value = false
      syncDuration()
    })

    audio.addEventListener('playing', () => {
      isLoading.value = false
      isPlaying.value = true
      syncDuration()
    })

    audio.addEventListener('pause', () => {
      isPlaying.value = false
    })

    audio.addEventListener('waiting', () => {
      isLoading.value = true
    })

    audio.addEventListener('ended', () => {
      currentTimeSeconds.value = 0
      isPlaying.value = false
      void playNextTrack()
    })

    audio.addEventListener('error', () => {
      isLoading.value = false
      isPlaying.value = false
      error.value = '当前歌曲播放失败，请稍后再试'
    })

    audioReady = true
  }

  function setQueue(tracks: PlayerTrack[], startIndex = 0) {
    queue.value = tracks.map(cloneTrack)
    currentIndex.value = queue.value.length === 0 ? -1 : clamp(startIndex, 0, queue.value.length - 1)
  }

  async function startPlayback(track: PlayerTrack) {
    ensureAudio()

    if (!audio) {
      error.value = '当前环境不支持音频播放'
      return
    }

    const token = ++requestToken
    currentTrack.value = track
    currentTimeSeconds.value = 0
    durationSeconds.value = track.durationMs ? track.durationMs / 1000 : 0
    error.value = ''
    isLoading.value = true

    try {
      if (!track.audioUrl) {
        const source = await getSongPlaybackSource(track.id)

        if (token !== requestToken) {
          return
        }

        track.audioUrl = source.url
      }

      if (!track.audioUrl) {
        throw new Error('当前歌曲暂无可用音源')
      }

      if (audio.src !== track.audioUrl) {
        audio.src = track.audioUrl
      }

      audio.currentTime = 0
      await audio.play()
    } catch (err) {
      if (token !== requestToken) {
        return
      }

      isLoading.value = false
      isPlaying.value = false
      error.value = err instanceof Error ? err.message : '播放失败，请稍后再试'
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

    if (currentTrack.value.audioUrl && audio.src === currentTrack.value.audioUrl) {
      try {
        await audio.play()
      } catch (err) {
        error.value = err instanceof Error ? err.message : '播放失败，请稍后再试'
      }
      return
    }

    await startPlayback(currentTrack.value)
  }

  async function playPreviousTrack() {
    if (!hasPrevious.value) {
      return
    }

    await playTrackAtIndex(currentIndex.value - 1)
  }

  async function playNextTrack() {
    if (!hasNext.value) {
      if (audio) {
        audio.pause()
      }

      currentTimeSeconds.value = 0
      return
    }

    await playTrackAtIndex(currentIndex.value + 1)
  }

  function seekToPercent(nextPercent: number) {
    ensureAudio()

    if (!audio) {
      return
    }

    const totalSeconds =
      durationSeconds.value > 0
        ? durationSeconds.value
        : currentTrack.value?.durationMs
          ? currentTrack.value.durationMs / 1000
          : 0

    if (totalSeconds <= 0) {
      return
    }

    const nextTime = (clamp(nextPercent, 0, 100) / 100) * totalSeconds
    audio.currentTime = nextTime
    currentTimeSeconds.value = nextTime
  }

  function setVolume(nextVolume: number) {
    const safeVolume = clamp(nextVolume, 0, 1)

    volume.value = safeVolume

    if (audio) {
      audio.volume = safeVolume
    }
  }

  ensureAudio()

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
    togglePlay,
    volume,
  }
})
