<script setup lang="ts">
import { Headphones } from 'lucide-vue-next'
import type { SearchPlaylist } from '@/api/search'
import { formatCompactPlayCount, formatCompactTrackCount, handleSearchCoverError } from '../utils'

defineProps<{
  playlists: SearchPlaylist[]
}>()
</script>

<template>
  <section class="search-playlist-grid">
    <article v-for="playlist in playlists" :key="playlist.id" class="search-playlist-card">
      <div class="search-playlist-card__media">
        <img
          class="search-playlist-card__cover"
          :src="playlist.coverUrl"
          :alt="playlist.name"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          referrerpolicy="no-referrer"
          @error="handleSearchCoverError"
        />
        <span class="search-card-badge search-card-badge--top">
          <Headphones class="search-card-badge__icon" :stroke-width="1.9" />
          <span>{{ formatCompactPlayCount(playlist.playCount) }}</span>
        </span>
        <div class="search-playlist-card__shade"></div>
        <div class="search-playlist-card__overlay">
          <div class="search-playlist-card__title">{{ playlist.name }}</div>
          <div class="search-playlist-card__meta">{{ formatCompactTrackCount(playlist.trackCount) }}</div>
        </div>
      </div>
      <div class="search-playlist-card__creator">
        {{ playlist.creatorName || '未知创建者' }}
      </div>
    </article>
  </section>
</template>

<style scoped lang="scss">
.search-playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 18px 16px;
}

.search-playlist-card {
  min-width: 0;
}

.search-playlist-card__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
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

.search-playlist-card:hover .search-playlist-card__media {
  transform: translateY(-2px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 32px rgba(5, 7, 24, 0.26);
  filter: saturate(1.04);
}

.search-playlist-card__cover {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.search-playlist-card__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(8, 12, 30, 0.04) 0%, rgba(8, 12, 30, 0.12) 38%, rgba(7, 8, 22, 0.76) 100%),
    linear-gradient(180deg, rgba(8, 12, 30, 0) 36%, rgba(8, 12, 30, 0.14) 62%, rgba(8, 12, 30, 0.82) 100%);
}

.search-playlist-card__overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  padding: 12px;
}

.search-playlist-card__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.98);
  font-size: 14px;
  font-weight: 700;
}

.search-playlist-card__meta,
.search-playlist-card__creator {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.search-playlist-card__meta {
  margin-top: 4px;
  color: rgba(239, 243, 255, 0.74);
}

.search-playlist-card__creator {
  margin-top: 10px;
  padding: 0 2px;
  color: rgba(229, 234, 255, 0.56);
}

.search-card-badge {
  position: absolute;
  top: 10px;
  right: 10px;
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

.search-card-badge__icon {
  width: 11px;
  height: 11px;
  flex: none;
}

@media (max-width: 960px) {
  .search-playlist-grid {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 14px;
  }
}

@media (max-width: 560px) {
  .search-playlist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .search-card-badge {
    height: 22px;
    padding: 0 7px;
    font-size: 10px;
  }
}
</style>
