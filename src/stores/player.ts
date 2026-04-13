import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  coverUrl: string
  duration: string
}

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<PlayerTrack | null>(null)
  const currentTime = ref('00:00')
  const isPlaying = ref(false)

  function setTrack(track: PlayerTrack) {
    currentTrack.value = track
    currentTime.value = '00:00'
  }

  function playTrack(track: PlayerTrack) {
    setTrack(track)
    isPlaying.value = true
  }

  function togglePlay() {
    if (!currentTrack.value) {
      return
    }

    isPlaying.value = !isPlaying.value
  }

  return {
    currentTime,
    currentTrack,
    isPlaying,
    playTrack,
    setTrack,
    togglePlay,
  }
})
