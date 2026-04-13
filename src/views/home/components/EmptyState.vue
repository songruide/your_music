<template>
       <section v-if="!props.hotArtists.length && !props.hotSongs.length" class="block block--empty">
        <div class="home__empty">
          <span class="home__empty-tag">Next</span>
          <p class="home__empty-text">
            歌手和单曲区还没接好时，可以先把 banner 和歌单区做顺，整体视觉已经会很像首页了。
          </p>
        </div>
      </section>
</template>

<script setup lang="ts" scoped>
import { type HomeArtist, type HomeSong } from '@/api/home'
const props = defineProps<{
  hotArtists: HomeArtist[]
  hotSongs: HomeSong[]
}>()
</script>

<style lang="scss" scoped>
@use '../home-block.scss' as *;

.home__empty {
  min-height: 0;
  place-items: start;
  gap: 12px;
}

.home__empty-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 28px;
  padding: 0 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 70, 168, 0.86), rgba(92, 142, 255, 0.86));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.home__empty-text {
  margin: 0;
  color: rgba(233, 239, 255, 0.68);
  font-size: 13px;
  line-height: 1.8;
}
</style>