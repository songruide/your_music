<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { FullScreen } from '@element-plus/icons-vue'
import { ListMusic, Volume2 } from 'lucide-vue-next'
import { usePlayerStore } from '@/stores/player'

const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)
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
          />
          <div v-else class="player__cover player__cover--placeholder" aria-hidden="true"></div>
        </div>
        <div class="player__copy">
          <div class="player__name">{{ currentTrack?.title ?? '点击一首歌开始播放' }}</div>
          <div class="player__artist">{{ currentTrack?.artist ?? '首页热门单曲已接入播放器' }}</div>
        </div>
      </div>

      <div class="player__center">
        <button class="player__icon-button player__skip player__skip--prev" aria-label="Previous track">
          <span class="player__chevron"></span>
          <span class="player__chevron"></span>
        </button>
        <button
          class="player__play"
          :aria-label="isPlaying ? 'Pause' : 'Play'"
          :disabled="!currentTrack"
          @click="playerStore.togglePlay()"
        >
          <span v-if="isPlaying" class="player__pause-icon" aria-hidden="true">
            <span></span>
            <span></span>
          </span>
          <span v-else class="player__play-icon" aria-hidden="true"></span>
        </button>
        <button class="player__icon-button player__skip player__skip--next" aria-label="Next track">
          <span class="player__chevron"></span>
          <span class="player__chevron"></span>
        </button>
        <button class="player__icon-button" aria-label="Fullscreen">
          <FullScreen class="player__svg-icon" />
        </button>
      </div>

      <div class="player__tools">
        <button class="player__icon-button" aria-label="Volume">
          <Volume2 class="player__lucide-icon" :stroke-width="1.85" />
        </button>
        <div class="player__volume">
          <span class="player__volume-bar"></span>
        </div>
        <button class="player__icon-button" aria-label="Playlist">
          <ListMusic class="player__lucide-icon" :stroke-width="1.85" />
        </button>
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
  grid-template-columns: minmax(180px, 250px) minmax(0, 1fr) minmax(180px, 220px);
  align-items: center;
  gap: 20px;
  min-height: 72px;
  padding: 14px 88px 14px 20px;
  border-radius: 24px;
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
  padding: 8px 10px;
  border-radius: 16px;
  background: rgba(20, 10, 46, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.player__cover-box {
  width: 40px;
  height: 40px;
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

.player__center {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}

.player__icon-button,
.player__play,
.player__float {
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #fff;
  cursor: pointer;
}

.player__icon-button {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: transparent;
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
  width: 30px;
  height: 30px;
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

.player__svg-icon {
  width: 14px;
  height: 14px;
}

.player__lucide-icon {
  width: 15px;
  height: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.player__tools {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.player__volume {
  width: 96px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  overflow: hidden;
}

.player__volume-bar {
  display: block;
  width: 72%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff76d1, #f04dff);
  box-shadow: 0 0 10px rgba(255, 107, 211, 0.26);
}
@media (max-width: 960px) {
  .player__shell {
    grid-template-columns: 1fr;
    justify-items: stretch;
    gap: 12px;
    padding: 14px 74px 14px 14px;
  }

  .player__center {
    justify-content: center;
  }

  .player__tools {
    justify-content: center;
  }

  .player__float {
    right: 14px;
    top: 18px;
    transform: none;
    width: 52px;
    height: 52px;
  }
}
</style>
