<template>
  <section class="block">
    <div class="block__head">
      <div>
        <span class="block__eyebrow">Artists</span>
        <h2>热门歌手</h2>
      </div>
      <button
        class="block__action"
        type="button"
        @click="openDiscoverPage"
      >
        查看更多
      </button>
    </div>

    <div class="artist-row">
      <button
        v-for="item in hotArtists.slice(0, 10)"
        :key="item.id"
        class="artist-card"
        type="button"
        @click="openArtist(item.id)"
      >
        <img
          class="artist-card__avatar"
          :src="item.avatarUrl"
          :alt="item.name"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          referrerpolicy="no-referrer"
        />
        <div class="artist-card__name">{{ item.name }}</div>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { HomeArtist } from '@/api/home'

defineProps<{
  hotArtists: HomeArtist[]
}>()

const router = useRouter()

function openArtist(id: string) {
  if (!id) {
    return
  }

  void router.push({
    name: 'artist-detail',
    params: { id },
  })
}

function openDiscoverPage() {
  void router.push({
    name: 'home-discover',
    params: { section: 'artists' },
  })
}
</script>

<style lang="scss" scoped>
@use '../home-block.scss' as *;

.artist-row {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 16px;
}

.artist-card {
  padding: 0;
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  color: inherit;
  cursor: pointer;
  transition: transform 180ms ease;
}

.artist-card:hover,
.artist-card:focus-visible {
  transform: translateY(-2px);
  outline: none;
}

.artist-card__avatar {
  aspect-ratio: 1;
  width: min(100%, 92px);
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 0 0 4px rgba(103, 78, 220, 0.14),
    0 10px 20px rgba(8, 5, 27, 0.16);
}

.artist-card__name {
  color: rgba(246, 243, 255, 0.86);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 1180px) {
  .artist-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    row-gap: 18px;
  }
}

@media (max-width: 920px) {
  .artist-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .artist-row {
    grid-template-columns: 1fr;
  }
}
</style>
