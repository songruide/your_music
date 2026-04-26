<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { nextTick, onMounted, ref } from 'vue'
import {
  getFeaturedMvs,
  type MvFeaturedCategory,
  type MvFeaturedCollection,
  type MvFeaturedCollectionInfo,
  type MvFeaturedItem,
} from '@/api/mv'
import MvFeaturedCard from './components/MvFeaturedCard.vue'
import MvPlayerDialog from './components/MvPlayerDialog.vue'

// 这一组默认分类有两个作用：
// 1. 首屏渲染时，在接口还没回来之前先让顶部 tab 和文案有稳定骨架
// 2. 即使后端接口异常，页面也不会因为分类为空而完全失去结构
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

// categories / collectionInfo / activeCollection 共同描述“当前 MV 精选页顶部状态”。
// categories: 所有可切换分组
// collectionInfo: 当前分组文案
// activeCollection: 当前真正处于激活状态的分组 key
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
const currentPage = ref(1)
const hasMore = ref(false)
const gridBodyRef = ref<HTMLElement | null>(null)

const PAGE_SIZE = 20

// requestToken 用来防止“旧请求覆盖新请求”。
// 比如用户连续快速点“全部 -> 官方 -> 现场”，最慢返回的旧请求不应该把最新页面状态冲掉。
let requestToken = 0

// loadFeatured 是当前页面的核心加载函数：
// 传入目标分组 -> 拉接口 -> 刷新顶部文案和卡片列表。
// 它不直接依赖点击事件，因此后面如果要做路由同步或记忆上次分组，也只需要继续复用这里。
async function loadFeatured(collection: MvFeaturedCollection) {
  await loadFeaturedPage(collection, 1)
}

async function loadFeaturedPage(collection: MvFeaturedCollection, page: number) {
  const token = ++requestToken
  const safePage = Math.max(1, Math.floor(page))
  const offset = (safePage - 1) * PAGE_SIZE

  loading.value = true
  error.value = ''

  try {
    const data = await getFeaturedMvs(collection, {
      limit: PAGE_SIZE,
      offset,
    })

    if (token !== requestToken) {
      return
    }

    categories.value = data.categories
    collectionInfo.value = data.collection
    activeCollection.value = data.collection.key
    currentPage.value = safePage
    hasMore.value = data.hasMore
    items.value = data.items
    await nextTick()
    gridBodyRef.value?.scrollTo({ top: 0, behavior: 'auto' })
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    error.value = err instanceof Error ? err.message : 'MV 页面加载失败'
    hasMore.value = false
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

// 用户切换顶部分类时，先做一个“小优化”：
// 如果点的就是当前分组，且页面已经有数据，就直接返回，避免重复请求和闪烁。
function switchCollection(collection: MvFeaturedCollection) {
  if (collection === activeCollection.value && items.value.length > 0) {
    return
  }

  activeCollection.value = collection
  currentPage.value = 1
  void loadFeaturedPage(collection, 1)
}

function goToPreviousPage() {
  if (loading.value || currentPage.value <= 1) {
    return
  }

  void loadFeaturedPage(activeCollection.value, currentPage.value - 1)
}

function goToNextPage() {
  if (loading.value || !hasMore.value) {
    return
  }

  void loadFeaturedPage(activeCollection.value, currentPage.value + 1)
}

// 点击卡片时这里只做一件事：把当前选中的 MV 放进播放器弹层状态里。
// 具体详情拉取、清晰度选择、视频播放都交给 MvPlayerDialog 自己处理。
function openMvResult(mv: MvFeaturedItem) {
  activeMv.value = mv
  playerVisible.value = true
}

// 首屏进入时默认加载“全部”分组。
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

      <div ref="gridBodyRef" class="mv-stage__body">
        <div v-if="error" class="mv-stage__state mv-stage__state--error">{{ error }}</div>

        <div v-else-if="loading && items.length === 0" class="mv-grid mv-grid--skeleton" aria-hidden="true">
          <div v-for="item in 10" :key="item" class="mv-skeleton">
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
      </div>

      <footer class="mv-stage__footer">
        <div v-if="loading && items.length > 0" class="mv-stage__loading-note">
          正在切换到 {{ collectionInfo.label }}...
        </div>
        <div v-else class="mv-stage__loading-note"></div>

        <div v-if="!error" class="mv-stage__pager" aria-label="MV 分页">
          <button
            class="mv-stage__pager-button"
            type="button"
            :disabled="loading || currentPage <= 1"
            @click="goToPreviousPage"
          >
            <ChevronLeft class="mv-stage__pager-icon" :stroke-width="2" />
            <span>上一页</span>
          </button>
          <span class="mv-stage__pager-label">第 {{ currentPage }} 页</span>
          <button
            class="mv-stage__pager-button"
            type="button"
            :disabled="loading || !hasMore"
            @click="goToNextPage"
          >
            <span>下一页</span>
            <ChevronRight class="mv-stage__pager-icon" :stroke-width="2" />
          </button>
        </div>
      </footer>
    </article>

    <MvPlayerDialog v-model="playerVisible" :mv="activeMv" />
  </section>
</template>

<style scoped lang="scss">
.mv-page {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
}

.mv-stage {
  --mv-accent-1: rgba(226, 63, 255, 0.26);
  --mv-accent-2: rgba(46, 150, 255, 0.26);
  --mv-accent-strong: #ff4eb8;
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 14px 12px;
  border-radius: 30px;
  background:
    radial-gradient(circle at 46% -6%, rgba(50, 170, 255, 0.42), transparent 28%),
    radial-gradient(circle at 10% 8%, rgba(206, 72, 255, 0.26), transparent 24%),
    linear-gradient(135deg, rgba(60, 12, 115, 0.96) 0%, rgba(32, 76, 161, 0.92) 34%, rgba(18, 20, 88, 0.98) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
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
.mv-stage__body,
.mv-stage__footer,
.mv-grid,
.mv-stage__state,
.mv-stage__loading-note {
  position: relative;
  z-index: 1;
}

.mv-stage__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.mv-stage__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

.mv-stage__body::-webkit-scrollbar {
  width: 10px;
}

.mv-stage__body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

.mv-stage__copy {
  min-width: 0;
}

.mv-stage__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(249, 247, 255, 0.86);
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mv-stage__title {
  margin: 6px 0 3px;
  color: rgba(253, 252, 255, 0.98);
  font-size: clamp(22px, 2.7vw, 30px);
  line-height: 1.1;
  letter-spacing: 0;
}

.mv-stage__desc {
  margin: 0;
  color: rgba(232, 238, 255, 0.76);
  font-size: 12px;
}

.mv-stage__filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.mv-stage__filter {
  min-height: 28px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: rgba(21, 18, 58, 0.36);
  color: rgba(229, 235, 255, 0.78);
  font-size: 11px;
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
  box-shadow: 0 10px 20px rgba(237, 74, 194, 0.24);
}

.mv-stage__filter-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.8;
}

.mv-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
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
  color: rgba(239, 244, 255, 0.8);
  text-align: center;
}

.mv-stage__state--error {
  color: #ffd6e7;
}

.mv-stage__loading-note {
  min-height: 16px;
  color: rgba(232, 237, 255, 0.58);
  font-size: 11px;
}

.mv-stage__footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.mv-stage__pager {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mv-stage__pager-button {
  min-height: 30px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(244, 246, 255, 0.88);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease,
    opacity 180ms ease;
}

.mv-stage__pager-button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.12);
}

.mv-stage__pager-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.mv-stage__pager-label {
  color: rgba(228, 235, 255, 0.62);
  font-size: 12px;
  white-space: nowrap;
}

.mv-stage__pager-icon {
  width: 14px;
  height: 14px;
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
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .mv-page {
    height: auto;
    min-height: 100%;
    display: block;
    padding-bottom: 10px;
  }

  .mv-stage {
    min-height: calc(100vh - 176px);
    height: auto;
    padding: 16px 14px 14px;
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
  .mv-stage {
    min-height: calc(100vh - 156px);
  }

  .mv-stage__filter {
    min-height: 28px;
    padding: 0 10px;
  }

  .mv-grid {
    grid-template-columns: 1fr;
  }

  .mv-stage__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .mv-stage__pager {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
