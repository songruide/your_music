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
            <div class="song-item__duration">{{ formatDurationMs(item.duration) }}</div>
          </button>
        </div>
      </section>
</template>

<script setup lang="ts" scoped>
import{ type HomeSong } from '@/api/home'
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'

const playerStore = usePlayerStore()
// 取出当前正在播放的歌曲，用来给列表里的对应项做高亮。
const { currentTrack } = storeToRefs(playerStore)

const props = defineProps<{
  hotSongs: HomeSong[]
}>()

// 点击热门歌曲时的交互规则：
// 1. 不可播放则直接返回
// 2. 如果点的是当前歌曲，则切换播放/暂停
// 3. 否则把热门歌曲列表映射成一个播放队列，并从当前点击项开始播放
function handleTrackSelect(song: HomeSong) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = props.hotSongs.filter((item) => item.playable !== false).map(mapSongToPlayerTrack)
  const startIndex = queue.findIndex((item) => item.id === song.id)

  if (startIndex < 0) {
    return
  }

  void playerStore.playQueue(queue, startIndex)
}

// 首页热门歌曲的结构和播放器队列结构并不一致，
// 这里通过统一的 buildPlayerTrack 做一次转换，保证后面所有入口都走同一套映射逻辑。
function mapSongToPlayerTrack(song: HomeSong) {
  return {
    ...buildPlayerTrack({
      id: song.id,
      title: song.name,
      artistNames: song.artistNames,
      albumName: song.albumName,
      coverUrl: song.coverUrl,
      durationMs: song.duration,
    }),
  }
}

</script>

<style lang="scss" scoped>
@use '../home-block.scss' as *;

// 热门歌曲使用两列网格，桌面端能同时展示更多曲目，
// 移动端再降为单列，保持阅读和点击体验。
.song-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

// 每首歌做成整块按钮，而不是只让播放图标可点，
// 这样操作路径更短，列表型内容的点击体验也更自然。
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

// 当前播放歌曲高亮，形成“列表选择”和“底部播放器”之间的联动。
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
  // 小屏幕时收缩为单列，并隐藏时长，优先保留歌名和歌手信息。
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
