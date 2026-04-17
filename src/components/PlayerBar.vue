<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { FullScreen } from '@element-plus/icons-vue'
import { ListMusic, Volume2, VolumeX } from 'lucide-vue-next'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23f35bb4'/%3E%3Cstop offset='1' stop-color='%23508dff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='44' r='16' fill='rgba(255,255,255,.7)'/%3E%3Crect x='30' y='68' width='60' height='22' rx='11' fill='rgba(255,255,255,.46)'/%3E%3C/svg%3E"
const {
  currentIndex,
  currentTime,
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
  progressPercent,
  queue,
  volumePercent,
} = storeToRefs(playerStore)

const queueText = computed(() => {
  if (queue.value.length <= 1 || currentIndex.value < 0) {
    return ''
  }

  return `队列 ${currentIndex.value + 1}/${queue.value.length}`
})

const statusText = computed(() => {
  if (error.value) {
    return error.value
  }

  if (isLoading.value) {
    return '正在加载音源...'
  }

  if (currentTrack.value) {
    return queueText.value ? `${queueText.value}，刷新后会记住播放位置` : '刷新后会记住播放位置'
  }

  return '点击首页热门单曲开始播放'
})

const volumeButtonLabel = computed(() => (isMuted.value || volumePercent.value === 0 ? '取消静音' : '静音'))
const debugRows = computed(() => [
  ['trackId', debugSnapshot.value.currentTrackId || '-'],
  ['sourceMode', debugSnapshot.value.sourceMode || '-'],
  ['type', debugSnapshot.value.type || '-'],
  ['level', debugSnapshot.value.level || '-'],
  ['bitrate', debugSnapshot.value.bitrate ? `${debugSnapshot.value.bitrate} bps` : '-'],
  ['sampleRate', debugSnapshot.value.sampleRate ? `${debugSnapshot.value.sampleRate} Hz` : '-'],
  ['playbackRate', String(debugSnapshot.value.playbackRate)],
  ['readyState', String(debugSnapshot.value.readyState)],
  ['networkState', String(debugSnapshot.value.networkState)],
  ['currentTime', `${debugSnapshot.value.currentTimeSeconds}s / ${debugSnapshot.value.durationSeconds}s`],
  ['streamUrl', debugSnapshot.value.streamUrl || '-'],
  ['resolvedAudioUrl', debugSnapshot.value.resolvedAudioUrl || '-'],
  ['audioCurrentSrc', debugSnapshot.value.audioCurrentSrc || '-'],
  ['directUrl', debugSnapshot.value.directUrl || '-'],
  [
    'expiresAt',
    debugSnapshot.value.expiresAt ? new Date(debugSnapshot.value.expiresAt).toLocaleString() : '-',
  ],
])

function handleProgressInput(event: Event) {
  const input = event.target as HTMLInputElement
  playerStore.seekToPercent(Number(input.value))
}

function handleVolumeInput(event: Event) {
  const input = event.target as HTMLInputElement
  playerStore.setVolume(Number(input.value) / 100)
}

function handleCoverError(event: Event) {
  const img = event.target as HTMLImageElement | null

  if (!img || img.dataset.fallbackApplied === 'true') {
    return
  }

  img.dataset.fallbackApplied = 'true'
  img.src = FALLBACK_COVER_URL
}
</script>

<template>
  <footer class="player" aria-label="Playback controls">
    <div class="player__shell">
      <div class="player__meta">
        <div class="player__cover-box">
          <img
            v-if="currentTrack?.coverUrl"
            class="player__cover"
            :src="currentTrack.coverUrl"
            :alt="currentTrack.title"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />
          <div v-else class="player__cover player__cover--placeholder" aria-hidden="true"></div>
        </div>
        <div class="player__copy">
          <div class="player__name">{{ currentTrack?.title ?? '点击一首歌开始播放' }}</div>
          <div class="player__artist">{{ currentTrack?.artist ?? '首页热门单曲已接入播放器' }}</div>
          <div v-if="queueText" class="player__queue">{{ queueText }}</div>
        </div>
      </div>

      <div class="player__center">
        <div class="player__transport">
          <button
            class="player__icon-button player__skip player__skip--prev"
            aria-label="Previous track"
            :disabled="!hasPrevious"
            @click="playerStore.playPreviousTrack()"
          >
            <span class="player__chevron"></span>
            <span class="player__chevron"></span>
          </button>
          <button
            class="player__play"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            :disabled="!currentTrack"
            :class="{ 'player__play--loading': isLoading }"
            @click="playerStore.togglePlay()"
          >
            <span v-if="isLoading" class="player__loader" aria-hidden="true"></span>
            <span v-else-if="isPlaying" class="player__pause-icon" aria-hidden="true">
              <span></span>
              <span></span>
            </span>
            <span v-else class="player__play-icon" aria-hidden="true"></span>
          </button>
          <button
            class="player__icon-button player__skip player__skip--next"
            aria-label="Next track"
            :disabled="!hasNext"
            @click="playerStore.playNextTrack()"
          >
            <span class="player__chevron"></span>
            <span class="player__chevron"></span>
          </button>
        </div>

        <div class="player__timeline">
          <span class="player__time">{{ currentTime }}</span>
          <input
            class="player__range player__range--progress"
            :style="{ '--player-progress': `${progressPercent}%` }"
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="progressPercent"
            :disabled="!currentTrack"
            @input="handleProgressInput"
          />
          <span class="player__time">{{ durationLabel }}</span>
        </div>

        <p class="player__status" :class="{ 'player__status--error': error }">
          {{ statusText }}
        </p>
      </div>

      <div class="player__tools">
        <button class="player__icon-button" :aria-label="volumeButtonLabel" @click="playerStore.toggleMute()">
          <VolumeX v-if="isMuted || volumePercent === 0" class="player__lucide-icon" :stroke-width="1.85" />
          <Volume2 v-else class="player__lucide-icon" :stroke-width="1.85" />
        </button>
        <input
          class="player__range player__range--volume"
          :style="{ '--player-progress': `${volumePercent}%` }"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="volumePercent"
          @input="handleVolumeInput"
        />
        <button class="player__icon-button" aria-label="Playlist">
          <ListMusic class="player__lucide-icon" :stroke-width="1.85" />
        </button>
        <button
          class="player__debug-button"
          :class="{ 'player__debug-button--active': debugEnabled }"
          type="button"
          aria-label="Toggle debug panel"
          @click="playerStore.toggleDebug()"
        >
          DBG
        </button>
        <button class="player__icon-button" aria-label="Fullscreen">
          <FullScreen class="player__svg-icon" />
        </button>
      </div>

      <div v-if="debugEnabled" class="player__debug-panel" aria-label="Playback debug info">
        <div v-for="[label, value] in debugRows" :key="label" class="player__debug-row">
          <span class="player__debug-label">{{ label }}</span>
          <span class="player__debug-value">{{ value }}</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.player {
  position: relative;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.player__shell {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(180px, 250px) minmax(0, 1fr) minmax(220px, 260px);
  align-items: center;
  gap: 20px;
  height: 74px;
  min-height: 74px;
  padding: 10px 18px;
  border-radius: 22px;
  background:
    linear-gradient(90deg, rgba(55, 12, 88, 0.94) 0%, rgba(33, 38, 121, 0.92) 52%, rgba(18, 20, 71, 0.94) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -20px 36px rgba(6, 10, 30, 0.18),
    0 12px 24px rgba(5, 2, 18, 0.2);
  pointer-events: auto;
}

.player__shell::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.05)),
    radial-gradient(circle at 50% 50%, rgba(53, 154, 255, 0.18), transparent 26%);
}

.player__meta,
.player__center,
.player__tools {
  position: relative;
  z-index: 1;
}

.player__meta {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border-radius: 16px;
  background: rgba(20, 10, 46, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.player__cover-box {
  width: 44px;
  height: 44px;
  padding: 3px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03));
}

.player__cover {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 9px;
  object-fit: cover;
}

.player__cover--placeholder {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    linear-gradient(135deg, rgba(255, 118, 209, 0.62), rgba(79, 141, 255, 0.68));
}

.player__copy {
  min-width: 0;
}

.player__name {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

.player__artist {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 10px;
  line-height: 1.2;
}

.player__queue {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
  line-height: 1.2;
}

.player__center {
  display: grid;
  gap: 10px;
}

.player__transport {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
}

.player__timeline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.player__time {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.player__status {
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
}

.player__status--error {
  color: #ffd7e4;
}

.player__icon-button,
.player__play {
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #fff;
  cursor: pointer;
}

.player__icon-button {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: transparent;
}

.player__icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.player__skip {
  gap: 1px;
}

.player__skip--prev .player__chevron {
  transform: scaleX(-1);
}

.player__chevron,
.player__play-icon {
  display: block;
  background: currentColor;
}

.player__chevron {
  width: 7px;
  height: 10px;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.player__play {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(180deg, #f45fe6, #bb46f0);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 10px 18px rgba(239, 80, 222, 0.28);
}

.player__play:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
}

.player__play--loading {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 0 0 8px rgba(255, 110, 228, 0.12);
}

.player__play-icon {
  width: 10px;
  height: 12px;
  margin-left: 2px;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.player__pause-icon {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.player__pause-icon span {
  width: 3px;
  height: 12px;
  border-radius: 999px;
  background: currentColor;
}

.player__loader {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.34);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.player__tools {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.player__debug-button {
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.86);
  font-size: 11px;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.player__debug-button--active {
  background: rgba(255, 118, 209, 0.16);
  border-color: rgba(255, 118, 209, 0.34);
}

.player__debug-panel {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(10, 8, 30, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.player__debug-row {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.player__debug-label,
.player__debug-value {
  min-width: 0;
  font-family: 'Consolas', 'SFMono-Regular', 'Courier New', monospace;
}

.player__debug-label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
  text-transform: uppercase;
}

.player__debug-value {
  overflow-wrap: anywhere;
  color: rgba(255, 255, 255, 0.86);
  font-size: 11px;
  line-height: 1.45;
}

.player__range {
  --player-progress: 0%;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 999px;
  outline: none;
  background:
    linear-gradient(90deg, #ff76d1 0%, #f04dff var(--player-progress), rgba(255, 255, 255, 0.16) var(--player-progress), rgba(255, 255, 255, 0.16) 100%);
}

.player__range:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.player__range::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(240, 77, 255, 0.22);
}

.player__range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(240, 77, 255, 0.22);
}

.player__range--volume {
  max-width: 92px;
}

.player__svg-icon {
  width: 14px;
  height: 14px;
}

.player__lucide-icon {
  width: 15px;
  height: 15px;
  color: rgba(255, 255, 255, 0.9);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .player__shell {
    grid-template-columns: 1fr;
    justify-items: stretch;
    gap: 14px;
    height: auto;
    min-height: 74px;
    padding: 14px;
  }

  .player__transport,
  .player__tools {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .player__timeline {
    grid-template-columns: 1fr;
  }

  .player__time {
    display: none;
  }

  .player__debug-panel {
    grid-template-columns: 1fr;
  }
}
</style>
