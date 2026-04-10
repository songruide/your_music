import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref({
    title: 'Intro AE 86',
    artist: 'Chen Guangrong',
    duration: '02:29',
  })
  const currentTime = ref('00:40')
  const isPlaying = ref(false)

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  return {
    currentTime,
    currentTrack,
    isPlaying,
    togglePlay,
  }
})
