<template>
     <section class="hero-shell">
        <form class="hero-search" @submit.prevent="submitSearch">
          <Search class="hero-search__icon" :stroke-width="1.9" aria-hidden="true" />
          <input
            v-model="keywordInput"
            class="hero-search__input"
            type="search"
            placeholder="搜索音乐，歌手，专辑"
            aria-label="搜索音乐，歌手，专辑"
            autocomplete="off"
            @keydown.enter="submitSearch"
          />
        </form>

        <section class="hero">
        <article
          v-for="(banner, index) in props.banners.slice(0, 3)"
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
      </section>

</template>

<script setup lang="ts" scoped>
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { HomeBanner } from '@/api/home'

// 轮播图除了展示推荐内容，也承担一个“首页快捷搜索入口”的角色。
// 用户从首页最容易发生的动作之一就是直接搜歌，所以把输入框放在轮播区右上角。
const props = defineProps<{
  banners: HomeBanner[]
}>()
const router = useRouter()
const keywordInput = ref('')

// 输入关键词后跳到搜索页，并把关键词放进 URL，
// 这样搜索页可以直接根据 q 参数拉取结果。
async function submitSearch() {
  const keyword = keywordInput.value.trim()

  await router.push(
    keyword
      ? {
          path: '/search',
          query: { q: keyword },
        }
      : {
          path: '/search',
        },
  )
}

</script>

<style lang="scss" scoped>
.hero-shell {
  position: relative;
}

// 搜索框悬停在轮播区右上角，作为首页的快捷入口。
.hero-search {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  width: min(276px, calc(100% - 16px));
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(214, 207, 255, 0.14);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(25, 17, 70, 0.7);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 14px 30px rgba(10, 8, 34, 0.18);
  backdrop-filter: blur(18px);
}

.hero-search__icon {
  width: 16px;
  height: 16px;
  color: rgba(240, 243, 255, 0.72);
}

.hero-search__input {
  width: 100%;
  min-width: 0;
  height: 34px;
  padding: 0 6px 0 0;
  border: 0;
  background: transparent;
  color: #fff;
  outline: none;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.hero-search__input::placeholder {
  color: rgba(233, 239, 255, 0.5);
}

.hero-search__input:focus {
  color: rgba(255, 255, 255, 0.96);
}

.hero {
  display: grid;
  grid-template-columns: 1.18fr 1.72fr 1.08fr;
  gap: 16px;
  padding-top: 72px;
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

@media (max-width: 920px) {
  .hero-search {
    position: static;
    width: 100%;
    margin-bottom: 16px;
  }

  .hero {
    grid-template-columns: 1fr;
    padding-top: 0;
  }

  .hero__card,
  .hero__card--featured {
    min-height: 182px;
  }
}
</style>
