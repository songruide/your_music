<template>
  <section class="hero-shell" @mouseenter="stopAutoplay" @mouseleave="startAutoplay">
    <section class="hero" :class="heroClassName">
      <button
        v-for="item in visibleBanners"
        :key="`${item.banner.id}-${item.bannerIndex}`"
        class="hero__card"
        :class="{ 'hero__card--featured': item.isFeatured }"
        type="button"
        @click="goToBanner(item.bannerIndex)"
      >
        <img
          class="hero__image"
          :src="item.banner.imageUrl"
          :alt="item.banner.title"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <div class="hero__scrim"></div>
        <div class="hero__meta">
          <span class="hero__badge">{{ item.banner.badge ?? '推荐' }}</span>
          <h2 class="hero__title">{{ item.banner.title }}</h2>
          <p v-if="item.banner.subtitle" class="hero__subtitle">{{ item.banner.subtitle }}</p>
        </div>
      </button>
    </section>

    <div v-if="hasMultipleBanners" class="hero-controls">
      <div class="hero-controls__dots" aria-label="Banner indicators">
        <button
          v-for="(banner, index) in props.banners"
          :key="`${banner.id}-${index}`"
          class="hero-controls__dot"
          :class="{ 'hero-controls__dot--active': currentIndex === index }"
          type="button"
          :aria-label="`切换到第 ${index + 1} 张 Banner`"
          @click="goToBanner(index)"
        ></button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { HomeBanner } from '@/api/home'

const props = defineProps<{
  banners: HomeBanner[]
}>()

const currentIndex = ref(0)

const AUTOPLAY_INTERVAL_MS = 4200
const totalBanners = computed(() => props.banners.length)
const hasMultipleBanners = computed(() => totalBanners.value > 1)
const heroClassName = computed(() => ({
  'hero--single': totalBanners.value <= 1,
  'hero--double': totalBanners.value === 2,
}))

let autoplayTimer: number | undefined

function normalizeIndex(index: number) {
  if (totalBanners.value === 0) {
    return 0
  }

  return (index + totalBanners.value) % totalBanners.value
}

// 桌面端默认展示“上一张 / 当前主 Banner / 下一张”的 3 卡布局，
// 这样既有轮播感，也能保留你现在首页这种中间大、两侧小的视觉层次。
const visibleBanners = computed(() => {
  if (totalBanners.value === 0) {
    return []
  }

  if (totalBanners.value === 1) {
    return [
      {
        banner: props.banners[0],
        bannerIndex: 0,
        isFeatured: true,
      },
    ]
  }

  if (totalBanners.value === 2) {
    return [
      {
        banner: props.banners[currentIndex.value],
        bannerIndex: currentIndex.value,
        isFeatured: true,
      },
      {
        banner: props.banners[normalizeIndex(currentIndex.value + 1)],
        bannerIndex: normalizeIndex(currentIndex.value + 1),
        isFeatured: false,
      },
    ]
  }

  const indices = [
    normalizeIndex(currentIndex.value - 1),
    currentIndex.value,
    normalizeIndex(currentIndex.value + 1),
  ]

  return indices.map((bannerIndex, visualIndex) => ({
    banner: props.banners[bannerIndex],
    bannerIndex,
    isFeatured: visualIndex === 1,
  }))
})

function goToBanner(index: number) {
  currentIndex.value = normalizeIndex(index)
}

function showNextBanner() {
  if (!hasMultipleBanners.value) {
    return
  }

  currentIndex.value = normalizeIndex(currentIndex.value + 1)
}

function stopAutoplay() {
  if (autoplayTimer !== undefined) {
    window.clearInterval(autoplayTimer)
    autoplayTimer = undefined
  }
}

function startAutoplay() {
  stopAutoplay()

  if (!hasMultipleBanners.value || typeof window === 'undefined') {
    return
  }

  autoplayTimer = window.setInterval(() => {
    showNextBanner()
  }, AUTOPLAY_INTERVAL_MS)
}

watch(
  totalBanners,
  (total) => {
    if (total === 0) {
      currentIndex.value = 0
      stopAutoplay()
      return
    }

    currentIndex.value = normalizeIndex(currentIndex.value)
    startAutoplay()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<style lang="scss" scoped>
.hero-shell {
  position: relative;
  width: 100%;
}

.hero {
  display: grid;
  grid-template-columns: minmax(180px, 0.84fr) minmax(0, 2.06fr) minmax(180px, 0.84fr);
  gap: 18px;
}

.hero--single {
  grid-template-columns: 1fr;
}

.hero--double {
  grid-template-columns: minmax(0, 1.72fr) minmax(220px, 0.98fr);
}

.hero__card {
  position: relative;
  min-height: 214px;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(12, 8, 34, 0.12);
  isolation: isolate;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease,
    opacity 180ms ease;
}

.hero__card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 30px rgba(8, 5, 28, 0.18);
}

.hero__card:focus-visible {
  outline: 2px solid rgba(255, 154, 231, 0.88);
  outline-offset: 2px;
}

.hero__card--featured {
  box-shadow: 0 18px 34px rgba(8, 5, 28, 0.2);
}

.hero__card:not(.hero__card--featured) {
  opacity: 0.92;
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

.hero__card:not(.hero__card--featured) .hero__scrim {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.24) 45%, rgba(8, 5, 25, 0.88) 100%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 45%);
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
  background: rgba(20, 15, 48, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 244, 247, 0.95);
}

.hero__title {
  margin: 0;
  max-width: 88%;
  color: #fff;
  font-size: clamp(16px, 1.7vw, 22px);
  line-height: 1.1;
  letter-spacing: -0.03em;
  text-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
}

.hero__card--featured .hero__title {
  max-width: 72%;
  font-size: clamp(24px, 2.95vw, 42px);
}

.hero__subtitle {
  margin: 0;
  max-width: 84%;
  color: rgba(237, 241, 255, 0.74);
  font-size: 12px;
  line-height: 1.55;
}

.hero__card:not(.hero__card--featured) .hero__subtitle {
  display: none;
}

.hero-controls {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.hero-controls__dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-controls__dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition:
    width 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}

.hero-controls__dot:hover {
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.34);
}

.hero-controls__dot--active {
  width: 20px;
  background: linear-gradient(90deg, #ff6bd8, #ff4faa);
}

@media (max-width: 920px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .hero__card,
  .hero__card--featured {
    min-height: 196px;
  }

  .hero__card--featured .hero__title {
    max-width: 82%;
    font-size: clamp(22px, 5vw, 34px);
  }
}
</style>
