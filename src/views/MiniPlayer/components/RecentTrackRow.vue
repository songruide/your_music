<script setup lang="ts">
import { computed } from 'vue'
import { Heart, MoreVertical } from 'lucide-vue-next'
import type { RecentPlayerTrack } from '@/stores/player'
import {
  formatIndex,
  formatLastPlayedAt,
  formatPlayCount,
  getProgressPercent,
  getResumeLabel,
} from '../utils'

const props = defineProps<{
  index: number
  isCurrent: boolean
  track: RecentPlayerTrack
}>()

const emit = defineEmits<{
  (event: 'remove-track', trackId: string): void
  (event: 'resume-track', track: RecentPlayerTrack): void
  (event: 'toggle-favorite', trackId: string): void
}>()

const favoriteTitle = computed(() => (props.track.isFavorite ? '取消喜欢' : '加入喜欢'))
</script>

<template>
  <article class="history-row" :class="{ 'history-row--active': isCurrent }">
    <button class="history-row__main" type="button" @click="emit('resume-track', track)">
      <div class="history-row__index">
        <span v-if="!isCurrent">{{ formatIndex(index) }}</span>
        <span v-else class="history-row__equalizer">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>

      <div class="history-row__song">
        <img
          v-if="track.coverUrl"
          class="history-row__cover"
          :src="track.coverUrl"
          :alt="track.title"
          referrerpolicy="no-referrer"
        />
        <div v-else class="history-row__cover history-row__cover--placeholder" aria-hidden="true"></div>

        <div class="history-row__copy">
          <div class="history-row__titleline">
            <div class="history-row__title">{{ track.title }}</div>
            <span v-if="isCurrent" class="history-row__playing-badge">
              当前播放
            </span>
          </div>
          <div class="history-row__artist">{{ track.artist }}</div>
        </div>
      </div>
    </button>

    <div class="history-row__recent">
      <div class="history-row__recent-top">{{ formatLastPlayedAt(track.lastPlayedAt) }}</div>
      <div class="history-row__recent-sub">{{ getResumeLabel(track) }}</div>
      <div class="history-row__progress">
        <span :style="{ width: `${getProgressPercent(track)}%` }"></span>
      </div>
    </div>

    <div class="history-row__plays">{{ formatPlayCount(track.playCount) }}</div>
    <div class="history-row__duration">{{ track.duration }}</div>

    <button
      class="history-row__icon"
      :class="{ 'history-row__icon--favorite': track.isFavorite }"
      type="button"
      :title="favoriteTitle"
      @click="emit('toggle-favorite', track.id)"
    >
      <Heart :stroke-width="2" :fill="track.isFavorite ? 'currentColor' : 'none'" />
    </button>

    <button
      class="history-row__icon"
      type="button"
      title="从最近播放移除"
      @click="emit('remove-track', track.id)"
    >
      <MoreVertical :stroke-width="2" />
    </button>
  </article>
</template>

<style scoped lang="scss">
.history-row {
  display: grid;
  grid-template-columns: 76px minmax(280px, 2fr) minmax(180px, 1.2fr) 108px 72px 54px 42px;
  align-items: center;
  gap: 12px;
  min-height: 88px;
  padding: 8px 10px;
  border-radius: 18px;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.history-row + .history-row {
  margin-top: 4px;
}

.history-row:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.05);
}

.history-row--active {
  background: linear-gradient(90deg, rgba(74, 136, 255, 0.18), rgba(255, 255, 255, 0.04));
  box-shadow: inset 0 0 0 1px rgba(95, 156, 255, 0.14);
}

.history-row__main {
  grid-column: 1 / 3;
  width: 100%;
  padding: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.history-row__index {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(245, 248, 255, 0.54);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.history-row__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 3px;
  height: 22px;
  color: #69a7ff;
}

.history-row__equalizer span {
  width: 4px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.history-row__equalizer span:nth-child(1) {
  height: 10px;
}

.history-row__equalizer span:nth-child(2) {
  height: 22px;
  animation-delay: 0.16s;
}

.history-row__equalizer span:nth-child(3) {
  height: 14px;
  animation-delay: 0.32s;
}

.history-row__song {
  min-width: 0;
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.history-row__cover {
  width: 62px;
  height: 62px;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.history-row__cover--placeholder {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    linear-gradient(135deg, rgba(255, 118, 209, 0.62), rgba(79, 141, 255, 0.68));
}

.history-row__copy {
  min-width: 0;
}

.history-row__titleline {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.history-row__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(252, 249, 255, 0.96);
  font-size: 16px;
  font-weight: 600;
}

.history-row__playing-badge {
  flex: none;
  height: 22px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(74, 136, 255, 0.14);
  color: #79b2ff;
  font-size: 11px;
  font-weight: 700;
}

.history-row__artist,
.history-row__recent-top,
.history-row__recent-sub,
.history-row__plays,
.history-row__duration {
  color: rgba(228, 235, 255, 0.58);
  font-size: 13px;
}

.history-row__artist {
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-row__recent {
  min-width: 0;
}

.history-row__recent-top {
  color: rgba(244, 247, 255, 0.84);
}

.history-row__recent-sub {
  margin-top: 6px;
}

.history-row__progress {
  height: 5px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.history-row__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6faeff, #ff75c2);
}

.history-row__plays,
.history-row__duration {
  font-variant-numeric: tabular-nums;
}

.history-row__icon {
  width: 40px;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(239, 243, 255, 0.72);
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.history-row__icon:hover {
  background: rgba(255, 255, 255, 0.12);
}

.history-row__icon--favorite {
  color: #ff7aa7;
}

.history-row__icon svg {
  width: 16px;
  height: 16px;
}

@keyframes equalizer {
  from {
    transform: scaleY(0.42);
    opacity: 0.66;
  }

  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (max-width: 1200px) {
  .history-row {
    grid-template-columns: 68px minmax(220px, 2fr) minmax(160px, 1fr) 96px 64px 48px 40px;
  }
}

@media (max-width: 960px) {
  .history-row {
    grid-template-columns: 60px minmax(0, 1.7fr) minmax(140px, 1fr) 88px 60px 44px 36px;
  }
}

@media (max-width: 720px) {
  .history-row {
    grid-template-columns: 1fr auto auto;
    align-items: start;
    gap: 10px;
    padding: 14px 10px;
  }

  .history-row__main {
    grid-column: 1 / -1;
  }

  .history-row__recent,
  .history-row__plays {
    grid-column: 2 / 4;
    text-align: right;
  }

  .history-row__duration {
    display: none;
  }
}

@media (max-width: 560px) {
  .history-row {
    grid-template-columns: 1fr;
  }

  .history-row__main {
    grid-template-columns: 1fr;
  }

  .history-row__index {
    display: none;
  }

  .history-row__song {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .history-row__recent,
  .history-row__plays {
    grid-column: auto;
    text-align: left;
  }

  .history-row__icon {
    width: 36px;
    height: 36px;
  }
}
</style>
