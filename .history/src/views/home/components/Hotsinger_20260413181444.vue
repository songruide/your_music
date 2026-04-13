<template>
    <section class="block">
        <div class="block__head">
          <div>
            <span class="block__eyebrow">Artists</span>
            <h2>热门歌手</h2>
          </div>
          <button class="block__action" type="button">查看更多</button>
        </div>

        <div class="artist-row">
          <article
            v-for="item in props.hotArtists.slice(0, 10)"
            :key="item.id"
            class="artist-card"
          >
            <img
              class="artist-card__avatar"
              :src="item.avatarUrl"
              :alt="item.name"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            />
            <div class="artist-card__name">{{ item.name }}</div>
          </article>
        </div>
      </section>
</template>

<script setup lang="ts" scoped>
import  type  { HomeArtist } from '@/api/home'
 const props = defineProps<{
  hotArtists: HomeArtist[]
}>()

</script>

<style lang="scss" scoped>
.artist-row {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 16px;
}

.artist-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.artist-card__avatar {
  aspect-ratio: 1;
  max-width: 92px;
  border-radius: 50%;
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

</style>