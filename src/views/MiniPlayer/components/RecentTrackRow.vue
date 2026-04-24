<script setup lang="ts">
import { computed } from 'vue'
import { Heart, MoreVertical } from 'lucide-vue-next'
import type { RecentPlayerTrack } from '@/stores/player'
import {
  formatIndex,
  formatPlayCount,
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
    <div class="history-row__index">
      <span v-if="!isCurrent">{{ formatIndex(index) }}</span>
      <span v-else class="history-row__equalizer" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </div>

    <button class="history-row__song" type="button" @click="emit('resume-track', track)">
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
          <span class="history-row__title">{{ track.title }}</span>
          <span v-if="isCurrent" class="history-row__playing-dot" aria-hidden="true"></span>
        </div>
      </div>
    </button>

    <div class="history-row__artist" :title="track.artist">{{ track.artist }}</div>
    <div class="history-row__album" :title="track.album || '单曲收藏'">{{ track.album || '单曲收藏' }}</div>

    <div class="history-row__duration" :title="formatPlayCount(track.playCount)">{{ track.duration }}</div>

    <div class="history-row__actions">
      <button
        class="history-row__icon"
        :class="{ 'history-row__icon--favorite': track.isFavorite }"
        type="button"
        :title="favoriteTitle"
        @click.stop="emit('toggle-favorite', track.id)"
      >
        <Heart :stroke-width="2" :fill="track.isFavorite ? 'currentColor' : 'none'" />
      </button>

      <button
        class="history-row__icon"
        type="button"
        title="从列表移除"
        @click.stop="emit('remove-track', track.id)"
      >
        <MoreVertical :stroke-width="2" />
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.history-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 2.5fr) minmax(0, 1.65fr) minmax(0, 1.6fr) 74px 96px;
  align-items: center;
  gap: 14px;
  min-height: 54px;
  padding: 4px 18px;
  border-radius: 12px;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.history-row + .history-row {
  margin-top: 3px;
}

.history-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.history-row--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05)),
    linear-gradient(90deg, rgba(238, 86, 255, 0.1), rgba(83, 142, 255, 0.1));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 10px 18px rgba(13, 8, 40, 0.12);
}

.history-row__index {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(245, 248, 255, 0.38);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.history-row__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #ff8fdc;
}

.history-row__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.history-row__equalizer span:nth-child(1) {
  height: 8px;
}

.history-row__equalizer span:nth-child(2) {
  height: 14px;
  animation-delay: 0.16s;
}

.history-row__equalizer span:nth-child(3) {
  height: 10px;
  animation-delay: 0.32s;
}

.history-row__song {
  min-width: 0;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.history-row__cover {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 6px 12px rgba(11, 8, 34, 0.12);
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
  gap: 6px;
  min-width: 0;
}

.history-row__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(252, 249, 255, 0.92);
  font-size: 13px;
  font-weight: 500;
}

.history-row__playing-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ff8edd, #6eb5ff);
  box-shadow: 0 0 10px rgba(255, 142, 221, 0.42);
}

.history-row__artist,
.history-row__album,
.history-row__duration {
  color: rgba(228, 235, 255, 0.62);
  font-size: 12px;
}

.history-row__artist,
.history-row__album {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-row__duration {
  justify-self: end;
  color: rgba(244, 247, 255, 0.88);
  font-variant-numeric: tabular-nums;
}

.history-row__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
}

.history-row__icon {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(239, 243, 255, 0.46);
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.history-row__icon:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(239, 243, 255, 0.82);
}

.history-row__icon--favorite {
  color: #ff7aa7;
}

.history-row__icon svg {
  width: 14px;
  height: 14px;
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
    grid-template-columns: 38px minmax(0, 2.1fr) minmax(0, 1.4fr) minmax(0, 1.3fr) 74px 88px;
  }
}

@media (max-width: 960px) {
  .history-row {
    grid-template-columns: 34px minmax(0, 2.2fr) minmax(0, 1.2fr) 74px 88px;
  }

  .history-row__album {
    display: none;
  }
}

@media (max-width: 720px) {
  .history-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 8px 14px;
  }

  .history-row__index,
  .history-row__artist,
  .history-row__album {
    display: none;
  }

  .history-row__song {
    grid-column: 1 / 2;
  }

  .history-row__duration,
  .history-row__actions {
    grid-column: 2 / 3;
    justify-self: end;
  }

  .history-row__actions {
    margin-top: 0;
  }
}

@media (max-width: 560px) {
  .history-row {
    grid-template-columns: 1fr;
  }

  .history-row__duration,
  .history-row__actions {
    grid-column: auto;
    justify-self: start;
  }
}
</style>
