<template>
     <section class="block">
        <div class="block__head">
          <div>
            <span class="block__eyebrow">Tracks</span>
            <h2>热门单曲</h2>
          </div>
          <button class="block__action" type="button">更多曲目</button>
        </div>

        <div class="song-list">
          <button
            v-for="item in props.hotSongs.slice(0, 8)"
            :key="item.id"
            class="song-item"
            :class="{ 'song-item--active': currentTrack?.id === item.id }"
            :disabled="item.playable === false"
            type="button"
            @click="handleTrackSelect(item)"
          >
            <img
              class="song-item__cover"
              :src="item.coverUrl"
              :alt="item.name"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
            <div class="song-item__body">
              <div class="song-item__name">{{ item.name }}</div>
              <div class="song-item__artists">{{ item.artistNames.join(' / ') }}</div>
            </div>
            <div class="song-item__duration">{{ formatDuration(item.duration) }}</div>
          </button>
        </div>
      </section>
</template>

<script setup lang="ts" scoped>
import{ type HomeSong } from '@/api/home'   
import { storeToRefs } from 'pinia'
import { usePlayerStore, type PlayerTrack } from '@/stores/player'
const playerStore = usePlayerStore()
const { currentTrack } = storeToRefs(playerStore)
const props = defineProps<{
  hotSongs: HomeSong[]
}>()
function formatDuration(value?: number) {
  if (!value) {
    return '--:--'
  }

  const totalSeconds = Math.floor(value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
function handleTrackSelect(song: HomeSong) {
  if (song.playable === false) {
    return
  }

  playerStore.playTrack(buildPlayerTrack(song))
}
function buildPlayerTrack(song: HomeSong): PlayerTrack {
  return {
    id: song.id,
    title: song.name,
    artist: song.artistNames.join(' / ') || '未知歌手',
    coverUrl: song.coverUrl,
    duration: formatDuration(song.duration),
  }
}

</script>

<style lang="scss" scoped>
@use '../home-block.scss' as *;

.song-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.song-item {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px;
  width: 100%;
  border: 1px solid rgba(214, 207, 255, 0.12);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    rgba(28, 18, 76, 0.34);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.song-item:hover {
  transform: translateY(-2px);
  border-color: rgba(239, 231, 255, 0.24);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025)),
    rgba(38, 25, 92, 0.5);
  box-shadow: 0 14px 26px rgba(8, 5, 27, 0.18);
}

.song-item--active {
  border-color: rgba(255, 135, 223, 0.44);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03)),
    rgba(54, 23, 92, 0.68);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 12px 26px rgba(17, 10, 46, 0.22);
}

.song-item:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  transform: none;
  box-shadow: none;
}

.song-item:focus-visible {
  outline: 2px solid rgba(255, 151, 224, 0.92);
  outline-offset: 2px;
}

.song-item__cover {
  width: 58px;
  height: 58px;
  border-radius: 16px;
}

.song-item__body {
  min-width: 0;
}

.song-item__name,
.song-item__artists {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-item__name {
  color: rgba(252, 249, 255, 0.94);
  font-size: 14px;
  font-weight: 600;
}

.song-item__artists {
  margin-top: 5px;
  color: rgba(213, 221, 255, 0.56);
  font-size: 12px;
}

.song-item__duration {
  color: rgba(246, 244, 255, 0.54);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .song-list {
    grid-template-columns: 1fr;
  }

  .song-item {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .song-item__duration {
    display: none;
  }
}
</style>
