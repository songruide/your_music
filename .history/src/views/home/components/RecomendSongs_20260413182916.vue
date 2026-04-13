<template>
   <section class="block">
        <div class="block__head">
          <div>
            <span class="block__eyebrow">Discover</span>
            <h2>推荐歌单</h2>
          </div>
          <button class="block__action" type="button">查看全部</button>
        </div>

        <div class="playlist-grid">
          <article
            v-for="item in props.recommendedPlaylists.slice(0, 12)"
            :key="item.id"
            class="playlist-card"
          >
            <div class="playlist-card__cover">
              <img
                :src="item.coverUrl"
                :alt="item.title"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
              />
              <span class="playlist-card__count">{{ formatPlayCount(item.playCount) }}</span>
            </div>
            <div class="playlist-card__title">{{ item.title }}</div>
            <div class="playlist-card__meta">{{ item.description || '猜你喜欢' }}</div>
          </article>
        </div>
      </section>
</template>

<script setup lang="ts" scoped>
import { type HomePlaylist} from '@/api/home'
function formatPlayCount(value?: number) {
  if (!value) {
    return '0'
  }

  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1).replace(/\.0$/, '')}亿`
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}万`
  }

  return String(value)
}
const props = defineProps<{
  recommendedPlaylists: HomePlaylist[]
}>()
</script>

<style lang="scss" scoped>
@use '../home-block.scss' as *;
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px 14px;
}

.playlist-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.playlist-card__cover {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(214, 207, 255, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 10px 22px rgba(10, 8, 30, 0.14);
}

.playlist-card__cover img {
  transition: transform 220ms ease;
}

.playlist-card:hover .playlist-card__cover img {
  transform: scale(1.06);
}

.playlist-card__count {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(16, 10, 38, 0.64);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.86);
}

.playlist-card__title {
  display: -webkit-box;
  overflow: hidden;
  min-height: 38px;
  color: rgba(251, 248, 255, 0.96);
  font-size: 13px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.playlist-card__meta {
  color: rgba(214, 222, 255, 0.52);
  font-size: 12px;
}


</style>