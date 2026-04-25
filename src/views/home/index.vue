<template>
  <section class="home">
    <div v-if="loading" class="home__state home__state--loading">加载中...</div>
    <div v-else-if="error" class="home__state home__state--error">{{ error }}</div>
    <template v-else>
      <BannerList :banners="homeData.banners" />
      <RecomendSongs :recommendedPlaylists="homeData.recommendedPlaylists" />
      <Hotsinger :hotArtists="homeData.hotArtists" />
      <HotSongs :hotSongs="homeData.hotSongs" />
      <EmptyState :hotSongs="homeData.hotSongs" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHomePage, type HomePageData } from '@/api/home'
import BannerList from './components/BannerList.vue'
import RecomendSongs from './components/RecomendSongs.vue'
import Hotsinger from './components/Hotsinger.vue'
import HotSongs from './components/HotSongs.vue'
import EmptyState from './components/EmptyState.vue'

const INITIAL_SONG_LIMIT = 8

const loading = ref(true)
const error = ref('')
const homeData = ref<HomePageData>({
  banners: [],
  recommendedPlaylists: [],
  hotArtists: [],
  hotSongs: [],
})

async function loadHomePage() {
  loading.value = true
  error.value = ''

  try {
    homeData.value = await getHomePage({
      songLimit: INITIAL_SONG_LIMIT,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '首页加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHomePage()
})
</script>

<style lang="scss" scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-height: 100%;
  padding-bottom: 12px;
}

.home__state,
.home__empty {
  display: grid;
  place-items: center;
  min-height: 220px;
  padding: 28px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(19, 12, 61, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 12px 28px rgba(10, 7, 31, 0.18);
  color: rgba(244, 242, 255, 0.84);
  text-align: center;
}

.home__state--error {
  color: #ffd7e4;
}

@media (max-width: 960px) {
  .home {
    min-height: 100%;
  }
}
</style>
