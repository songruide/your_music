import { LOCKED_PLAYBACK_RATE } from './constants'
import type { AudioDiagnostics, PitchAwareAudio } from './types'
import { clamp } from './utils'

const EMPTY_AUDIO_DIAGNOSTICS: AudioDiagnostics = {
  currentSrc: '',
  networkState: 0,
  playbackRate: 1,
  readyState: 0,
}

export function createAudioDiagnostics(audio: HTMLAudioElement | null): AudioDiagnostics {
  if (!audio) {
    return { ...EMPTY_AUDIO_DIAGNOSTICS }
  }

  return {
    currentSrc: audio.currentSrc,
    networkState: audio.networkState,
    playbackRate: audio.playbackRate,
    readyState: audio.readyState,
  }
}

export function applyAudioVolume(audio: HTMLAudioElement | null, isMuted: boolean, volume: number) {
  if (!audio) {
    return
  }

  audio.volume = isMuted ? 0 : volume
}

export function lockAudioPlaybackSettings(audio: HTMLAudioElement | null) {
  if (!audio) {
    return
  }

  audio.playbackRate = LOCKED_PLAYBACK_RATE
  audio.defaultPlaybackRate = LOCKED_PLAYBACK_RATE

  const pitchAwareAudio = audio as PitchAwareAudio

  if ('preservesPitch' in pitchAwareAudio) {
    pitchAwareAudio.preservesPitch = true
  }

  if ('mozPreservesPitch' in pitchAwareAudio) {
    pitchAwareAudio.mozPreservesPitch = true
  }

  if ('webkitPreservesPitch' in pitchAwareAudio) {
    pitchAwareAudio.webkitPreservesPitch = true
  }
}

export function readAudioDurationSeconds(audio: HTMLAudioElement | null) {
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return null
  }

  return audio.duration
}

export function restoreAudioSeek(audio: HTMLAudioElement | null, pendingSeekTimeSeconds: number) {
  if (!audio || pendingSeekTimeSeconds <= 0 || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return null
  }

  const nextTime = clamp(pendingSeekTimeSeconds, 0, Math.max(audio.duration - 0.25, 0))

  audio.currentTime = nextTime
  return nextTime
}
