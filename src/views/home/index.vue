<template>
  <section class="home">
    <div v-if="loading" class="home__state home__state--loading">加载中...</div>
    <div v-else-if="error" class="home__state home__state--error">{{ error }}</div>
    <template v-else>
      <section class="hero">
        <article
          v-for="(banner, index) in homeData.banners.slice(0, 3)"
          :key="banner.id"
          class="hero__card"
          :class="{ 'hero__card--featured': index === 1 }"
        >
          <img
            class="hero__image"
            :src="banner.imageUrl"
            :alt="banner.title"
            loading="eager"
            decoding="async"
            fetchpriority="high"
          />
          <div class="hero__scrim"></div>
          <div class="hero__meta">
            <span class="hero__badge">{{ banner.badge ?? '推荐' }}</span>
            <h2 class="hero__title">{{ banner.title }}</h2>
          </div>
        </article>
      </section>

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
            v-for="item in homeData.recommendedPlaylists.slice(0, 12)"
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
            v-for="item in homeData.hotArtists.slice(0, 10)"
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

      <section class="block">
        <div class="block__head">
          <div>
            <span class="block__eyebrow">Tracks</span>
            <h2>热门单曲</h2>
          </div>
          <button class="block__action" type="button">更多曲目</button>
        </div>

        <div class="song-list">
          <article
            v-for="item in homeData.hotSongs.slice(0, 8)"
            :key="item.id"
            class="song-item"
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
          </article>
        </div>
      </section>

      <section v-if="!homeData.hotArtists.length && !homeData.hotSongs.length" class="block block--empty">
        <div class="home__empty">
          <span class="home__empty-tag">Next</span>
          <p class="home__empty-text">
            歌手和单曲区还没接好时，可以先把 banner 和歌单区做顺，整体视觉已经会很像首页了。
          </p>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHomePage, type HomePageData } from '@/api/home'

const loading = ref(true)
const error = ref('')
const homeData = ref<HomePageData>({
  banners: [],
  recommendedPlaylists: [],
  hotArtists: [],
  hotSongs: [],
})

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

function formatDuration(value?: number) {
  if (!value) {
    return '--:--'
  }

  const totalSeconds = Math.floor(value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

async function loadHomePage() {
  loading.value = true
  error.value = ''

  try {
    homeData.value = await getHomePage()
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
  padding-bottom: 12px;
}

.home__state,
.home__empty {
  display: grid;
  place-items: center;
  min-height: 220px;
  padding: 28px;
  border: 1px solid rgba(214, 207, 255, 0.16);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(19, 12, 61, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 12px 28px rgba(10, 7, 31, 0.18);
  color: rgba(244, 242, 255, 0.84);
  text-align: center;
}

.home__state--error {
  color: #ffd7e4;
}

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

.hero {
  display: grid;
  grid-template-columns: 1.18fr 1.72fr 1.08fr;
  gap: 16px;
}

.hero__card {
  position: relative;
  min-height: 148px;
  overflow: hidden;
  border: 1px solid rgba(214, 207, 255, 0.14);
  border-radius: 24px;
  background: rgba(31, 21, 83, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 12px 24px rgba(12, 8, 34, 0.14);
  isolation: isolate;
  transform: translateY(0);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.hero__card:hover {
  transform: translateY(-4px);
  border-color: rgba(236, 225, 255, 0.24);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 16px 30px rgba(8, 5, 28, 0.2);
}

.hero__card--featured {
  min-height: 176px;
}

.hero__image,
.playlist-card__cover img,
.artist-card__avatar,
.song-item__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__image {
  position: absolute;
  inset: 0;
}

.hero__scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.18) 45%, rgba(8, 5, 25, 0.8) 100%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 45%);
}

.hero__meta {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1;
}

.hero__badge {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(20, 15, 48, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 244, 247, 0.95);
}

.hero__title {
  margin: 0;
  max-width: 90%;
  color: #fff;
  font-size: clamp(18px, 2vw, 26px);
  line-height: 1.1;
  letter-spacing: -0.03em;
  text-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
}

.block {
  content-visibility: auto;
  contain-intrinsic-size: 360px;
  contain: layout paint;
  padding: 18px 20px 22px;
  border: 1px solid rgba(214, 207, 255, 0.14);
  border-radius: 28px;
  background:
    radial-gradient(circle at 50% 0%, rgba(80, 177, 255, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015)),
    rgba(22, 14, 69, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 12px 28px rgba(11, 7, 32, 0.16);
}

.block--empty {
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.block__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.block__head h2 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.block__eyebrow {
  display: inline-block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.block__action {
  height: 32px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.block__action:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.22);
  transform: translateY(-1px);
}

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
  border: 1px solid rgba(214, 207, 255, 0.12);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    rgba(28, 18, 76, 0.34);
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

@media (max-width: 1180px) {
  .playlist-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .artist-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    row-gap: 18px;
  }
}

@media (max-width: 920px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero__card,
  .hero__card--featured {
    min-height: 182px;
  }

  .playlist-grid,
  .song-list,
  .artist-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .block {
    padding: 16px;
    border-radius: 24px;
  }

  .playlist-grid,
  .song-list,
  .artist-row {
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
