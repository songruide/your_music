<script setup lang="ts">
import { Play } from 'lucide-vue-next'
import type { SearchMv } from '@/api/search'
import { formatDurationMs } from '@/utils/playerTrack'
import { formatArtistNames, formatCompactPlayCount, handleSearchCoverError } from '../utils'

// 这个组件只做“搜索结果里的 MV 卡片展示 + 抛出点击事件”。
// 真正打开播放器、加载详情、切清晰度，都交给父层和 MvPlayerDialog 处理。
defineProps<{
  mvs: SearchMv[]
}>()

// 只向外抛“用户点中了哪一支 MV”，不在子组件里直接依赖播放器状态。
const emit = defineEmits<{
  selectMv: [mv: SearchMv]
}>()
</script>

<template>
  <section class="search-mv-grid">
    <button
      v-for="mv in mvs"
      :key="mv.id"
      class="search-mv-card"
      type="button"
      @click="emit('selectMv', mv)"
    >
      <div class="search-mv-card__media">
        <img
          class="search-mv-card__cover"
          :src="mv.coverUrl"
          :alt="mv.name"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          referrerpolicy="no-referrer"
          @error="handleSearchCoverError"
        />
        <span class="search-card-badge search-card-badge--top">
          <Play class="search-card-badge__icon" :stroke-width="2" />
          <span>{{ formatCompactPlayCount(mv.playCount) }}</span>
        </span>
        <span class="search-card-badge search-card-badge--bottom">
          {{ formatDurationMs(mv.duration) }}
        </span>
        <div class="search-mv-card__shade"></div>
        <div class="search-mv-card__overlay">
          <div class="search-mv-card__title">{{ mv.name }}</div>
          <div class="search-mv-card__artist">
            {{ formatArtistNames(mv.artistNames) }}
          </div>
        </div>
      </div>
    </button>
  </section>
</template>

<style scoped lang="scss">
.search-mv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.search-mv-card {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.search-mv-card__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 14px 28px rgba(5, 7, 24, 0.2);
  transform: translateZ(0);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease;
}

.search-mv-card:hover .search-mv-card__media {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 32px rgba(5, 7, 24, 0.26);
  filter: saturate(1.04);
}

.search-mv-card:focus-visible {
  outline: none;
}

.search-mv-card:focus-visible .search-mv-card__media {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 0 0 2px rgba(255, 126, 214, 0.28),
    0 18px 32px rgba(5, 7, 24, 0.26);
}

.search-mv-card__cover {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.search-mv-card__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 12, 30, 0.04) 0%, rgba(8, 12, 30, 0.12) 38%, rgba(7, 8, 22, 0.76) 100%),
    linear-gradient(180deg, rgba(8, 12, 30, 0) 36%, rgba(8, 12, 30, 0.14) 62%, rgba(8, 12, 30, 0.82) 100%);
}

.search-mv-card__overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  padding: 12px;
}

.search-mv-card__title,
.search-mv-card__artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-mv-card__title {
  color: rgba(255, 255, 255, 0.98);
  font-size: 14px;
  font-weight: 700;
}

.search-mv-card__artist {
  margin-top: 4px;
  color: rgba(239, 243, 255, 0.74);
  font-size: 12px;
}

.search-card-badge {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: 24px;
  border-radius: 999px;
  background: rgba(17, 21, 37, 0.68);
  color: rgba(248, 250, 255, 0.92);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(10px);
}

.search-card-badge--top {
  top: 10px;
  right: 10px;
}

.search-card-badge--bottom {
  right: 10px;
  bottom: 10px;
}

.search-card-badge__icon {
  width: 11px;
  height: 11px;
  flex: none;
}

@media (max-width: 960px) {
  .search-mv-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  }
}

@media (max-width: 560px) {
  .search-mv-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .search-card-badge {
    height: 22px;
    padding: 0 7px;
    font-size: 10px;
  }
}
</style>
