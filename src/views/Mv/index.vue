<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  getFeaturedMvs,
  type MvFeaturedCategory,
  type MvFeaturedCollection,
  type MvFeaturedCollectionInfo,
  type MvFeaturedItem,
} from '@/api/mv'
import MvFeaturedCard from './components/MvFeaturedCard.vue'
import MvPlayerDialog from './components/MvPlayerDialog.vue'

const DEFAULT_CATEGORIES: MvFeaturedCategory[] = [
  {
    key: 'all',
    label: '全部',
    description: '热门 MV 一次看全，适合先逛一圈找今天的第一支视频。',
  },
  {
    key: 'official',
    label: '官方',
    description: '更完整的主视觉和叙事表达，适合看完整制作感。',
  },
  {
    key: 'live',
    label: '现场',
    description: '收一点现场呼吸感，把舞台和掌声都带回来。',
  },
  {
    key: 'exclusive',
    label: '网易出品',
    description: '平台精选企划和独家内容，更适合慢慢挑着看。',
  },
]

const categories = ref<MvFeaturedCategory[]>(DEFAULT_CATEGORIES)
const collectionInfo = ref<MvFeaturedCollectionInfo>({
  key: 'all',
  label: '全部',
  description: DEFAULT_CATEGORIES[0]?.description ?? '',
})
const activeCollection = ref<MvFeaturedCollection>('all')
const items = ref<MvFeaturedItem[]>([])
const loading = ref(true)
const error = ref('')
const activeMv = ref<MvFeaturedItem | null>(null)
const playerVisible = ref(false)

let requestToken = 0

const collectionDescription = computed(() => {
  return (
    categories.value.find((item) => item.key === activeCollection.value)?.description ??
    collectionInfo.value.description
  )
})

async function loadFeatured(collection: MvFeaturedCollection) {
  const token = ++requestToken

  loading.value = true
  error.value = ''

  try {
    const data = await getFeaturedMvs(collection, 12)

    if (token !== requestToken) {
      return
    }

    categories.value = data.categories
    collectionInfo.value = data.collection
    activeCollection.value = data.collection.key
    items.value = data.items
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    error.value = err instanceof Error ? err.message : 'MV 页面加载失败'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

function switchCollection(collection: MvFeaturedCollection) {
  if (collection === activeCollection.value && items.value.length > 0) {
    return
  }

  activeCollection.value = collection
  void loadFeatured(collection)
}

function openMvResult(mv: MvFeaturedItem) {
  activeMv.value = mv
  playerVisible.value = true
}

onMounted(() => {
  void loadFeatured(activeCollection.value)
})
</script>

<template>
  <section class="mv-page">
    <article class="mv-stage" :class="`mv-stage--${activeCollection}`">
      <div class="mv-stage__aurora">
        <span class="mv-stage__light mv-stage__light--pink"></span>
        <span class="mv-stage__light mv-stage__light--blue"></span>
        <span class="mv-stage__light mv-stage__light--violet"></span>
      </div>

      <header class="mv-stage__hero">
        <div class="mv-stage__copy">
          <span class="mv-stage__eyebrow">{{ collectionInfo.label }}</span>
          <h1 class="mv-stage__title">MV 精选</h1>
          <p class="mv-stage__desc">精彩的音乐视频，带给你视听双重享受。</p>

          <div class="mv-stage__summary">
            <span class="mv-stage__summary-pill">{{ collectionInfo.label }}</span>
            <span class="mv-stage__summary-text">{{ collectionDescription }}</span>
          </div>
        </div>

        <div class="mv-stage__filters" aria-label="MV 分类">
          <button
            v-for="category in categories"
            :key="category.key"
            class="mv-stage__filter"
            :class="{ 'mv-stage__filter--active': category.key === activeCollection }"
            type="button"
            @click="switchCollection(category.key)"
          >
            <span class="mv-stage__filter-dot"></span>
            <span>{{ category.label }}</span>
          </button>
        </div>
      </header>

      <div v-if="error" class="mv-stage__state mv-stage__state--error">{{ error }}</div>

      <div v-else-if="loading && items.length === 0" class="mv-grid mv-grid--skeleton" aria-hidden="true">
        <div v-for="item in 8" :key="item" class="mv-skeleton">
          <div class="mv-skeleton__media"></div>
          <div class="mv-skeleton__body">
            <div class="mv-skeleton__line mv-skeleton__line--short"></div>
            <div class="mv-skeleton__line"></div>
            <div class="mv-skeleton__line mv-skeleton__line--tiny"></div>
          </div>
        </div>
      </div>

      <div v-else-if="items.length === 0" class="mv-stage__state">这一组 MV 暂时还没有内容。</div>

      <section v-else class="mv-grid">
        <MvFeaturedCard v-for="mv in items" :key="mv.id" :mv="mv" @select="openMvResult" />
      </section>

      <div v-if="loading && items.length > 0" class="mv-stage__loading-note">
        正在切换到 {{ collectionInfo.label }}...
      </div>
    </article>

    <MvPlayerDialog v-model="playerVisible" :mv="activeMv" />
  </section>
</template>

<style scoped lang="scss">
.mv-page {
  width: 100%;
  padding-bottom: 14px;
}

.mv-stage {
  --mv-accent-1: rgba(226, 63, 255, 0.26);
  --mv-accent-2: rgba(46, 150, 255, 0.26);
  --mv-accent-strong: #ff4eb8;
  position: relative;
  overflow: hidden;
  padding: 24px 18px 18px;
  border: 1px solid rgba(203, 194, 255, 0.14);
  border-radius: 30px;
  background:
    radial-gradient(circle at 46% -6%, rgba(50, 170, 255, 0.42), transparent 28%),
    radial-gradient(circle at 10% 8%, rgba(206, 72, 255, 0.26), transparent 24%),
    linear-gradient(135deg, rgba(60, 12, 115, 0.96) 0%, rgba(32, 76, 161, 0.92) 34%, rgba(18, 20, 88, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 60px rgba(6, 7, 25, 0.24);
  isolation: isolate;
}

.mv-stage--official {
  --mv-accent-1: rgba(255, 83, 176, 0.26);
  --mv-accent-2: rgba(67, 160, 255, 0.22);
  --mv-accent-strong: #ff5da7;
}

.mv-stage--live {
  --mv-accent-1: rgba(255, 144, 66, 0.24);
  --mv-accent-2: rgba(96, 213, 255, 0.18);
  --mv-accent-strong: #ff9b42;
}

.mv-stage--exclusive {
  --mv-accent-1: rgba(255, 88, 198, 0.22);
  --mv-accent-2: rgba(145, 112, 255, 0.22);
  --mv-accent-strong: #f25ed1;
}

.mv-stage__aurora {
  position: absolute;
  inset: -12% -8%;
  z-index: 0;
  pointer-events: none;
}

.mv-stage__light {
  position: absolute;
  top: -6%;
  bottom: -6%;
  width: 240px;
  border-radius: 999px;
  filter: blur(92px);
  opacity: 0.22;
  mix-blend-mode: screen;
}

.mv-stage__light--pink {
  left: -2%;
  background: linear-gradient(90deg, rgba(230, 66, 255, 0), rgba(230, 66, 255, 0.92), rgba(230, 66, 255, 0));
}

.mv-stage__light--blue {
  left: 42%;
  width: 360px;
  background: linear-gradient(90deg, rgba(55, 164, 255, 0), rgba(55, 164, 255, 0.84), rgba(55, 164, 255, 0));
}

.mv-stage__light--violet {
  right: 6%;
  background: linear-gradient(90deg, rgba(117, 90, 255, 0), rgba(117, 90, 255, 0.7), rgba(117, 90, 255, 0));
}

.mv-stage__hero,
.mv-grid,
.mv-stage__state,
.mv-stage__loading-note {
  position: relative;
  z-index: 1;
}

.mv-stage__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.mv-stage__copy {
  min-width: 0;
}

.mv-stage__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(249, 247, 255, 0.86);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mv-stage__title {
  margin: 12px 0 8px;
  color: rgba(253, 252, 255, 0.98);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.04;
  letter-spacing: -0.05em;
}

.mv-stage__desc {
  margin: 0;
  color: rgba(232, 238, 255, 0.76);
  font-size: 14px;
}

.mv-stage__summary {
  margin-top: 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.mv-stage__summary-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(250, 248, 255, 0.92);
  font-size: 11px;
}

.mv-stage__summary-text {
  color: rgba(221, 228, 255, 0.66);
  font-size: 13px;
}

.mv-stage__filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.mv-stage__filter {
  min-height: 38px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(21, 18, 58, 0.36);
  color: rgba(229, 235, 255, 0.78);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
}

.mv-stage__filter:hover,
.mv-stage__filter:focus-visible {
  transform: translateY(-1px);
  color: rgba(249, 248, 255, 0.94);
  background: rgba(255, 255, 255, 0.1);
  outline: none;
}

.mv-stage__filter--active {
  color: #fff;
  background: linear-gradient(90deg, rgba(255, 70, 175, 0.94), rgba(176, 81, 255, 0.92));
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: 0 10px 20px rgba(237, 74, 194, 0.24);
}

.mv-stage__filter-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.8;
}

.mv-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px 16px;
}

.mv-grid--skeleton {
  pointer-events: none;
}

.mv-skeleton {
  overflow: hidden;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(17, 15, 58, 0.96), rgba(24, 12, 58, 0.98)),
    rgba(17, 15, 58, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.mv-skeleton__media,
.mv-skeleton__line {
  position: relative;
  overflow: hidden;
}

.mv-skeleton__media::after,
.mv-skeleton__line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  transform: translateX(-100%);
  animation: mv-skeleton-shine 1.4s ease infinite;
}

.mv-skeleton__media {
  aspect-ratio: 16 / 9;
  background:
    radial-gradient(circle at 20% 18%, var(--mv-accent-1), transparent 28%),
    linear-gradient(135deg, rgba(30, 30, 66, 0.92), rgba(14, 17, 44, 0.92));
}

.mv-skeleton__body {
  padding: 16px;
}

.mv-skeleton__line {
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.mv-skeleton__line + .mv-skeleton__line {
  margin-top: 12px;
}

.mv-skeleton__line--short {
  width: 34%;
}

.mv-skeleton__line--tiny {
  width: 48%;
}

.mv-stage__state {
  display: grid;
  place-items: center;
  min-height: 320px;
  padding: 26px;
  border-radius: 24px;
  background: rgba(12, 12, 40, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(239, 244, 255, 0.8);
  text-align: center;
}

.mv-stage__state--error {
  color: #ffd6e7;
}

.mv-stage__loading-note {
  margin-top: 14px;
  color: rgba(232, 237, 255, 0.58);
  font-size: 12px;
  text-align: right;
}

@keyframes mv-skeleton-shine {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

@media (max-width: 1180px) {
  .mv-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .mv-stage {
    padding: 20px 16px 16px;
    border-radius: 26px;
  }

  .mv-stage__hero {
    flex-direction: column;
  }

  .mv-stage__filters {
    justify-content: flex-start;
  }

  .mv-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .mv-stage__summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .mv-stage__filter {
    min-height: 34px;
    padding: 0 14px;
  }

  .mv-grid {
    grid-template-columns: 1fr;
  }
}
</style>
