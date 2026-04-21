<script setup lang="ts">
import { computed } from 'vue'
import { Play, Video } from 'lucide-vue-next'
import type { MvFeaturedItem } from '@/api/mv'
import { formatDurationMs } from '@/utils/playerTrack'

// 远端封面图如果失效，卡片仍然要保持“像一张 MV 封面”而不是一块空白。
// 这里用内联 SVG 做兜底，不依赖额外静态资源。
const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23281772'/%3E%3Cstop offset='0.52' stop-color='%230f8ddf'/%3E%3Cstop offset='1' stop-color='%230f153f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='360' rx='36' fill='url(%23g)'/%3E%3Ccircle cx='490' cy='90' r='86' fill='rgba(255,255,255,.1)'/%3E%3Ccircle cx='136' cy='278' r='110' fill='rgba(217,61,255,.18)'/%3E%3Crect x='104' y='122' width='432' height='116' rx='22' fill='rgba(8,10,26,.38)' stroke='rgba(255,255,255,.14)'/%3E%3Cpolygon points='278,153 278,207 336,180' fill='rgba(255,255,255,.9)'/%3E%3C/svg%3E"

const props = defineProps<{
  mv: MvFeaturedItem
}>()

const emit = defineEmits<{
  select: [mv: MvFeaturedItem]
}>()

// artistLabel / playCountLabel 都是“展示态衍生数据”。
// 提前在 script 里算好，模板会更干净，也方便后面统一修改展示规则。
const artistLabel = computed(() => props.mv.artistNames.filter(Boolean).join(' / ') || '未知歌手')
const playCountLabel = computed(() => formatPlayCount(props.mv.playCount))

function formatPlayCount(value?: number) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return '0'
  }

  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, '')}亿`
  }

  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(1).replace(/\.0$/, '')}万`
  }

  return String(Math.round(value))
}

// 只替换一次 fallback，避免 fallback 本身异常时进入无限 error 循环。
function handleCoverError(event: Event) {
  const image = event.target as HTMLImageElement | null

  if (!image || image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = FALLBACK_COVER_URL
}
</script>

<template>
  <button class="mv-card" type="button" @click="emit('select', mv)">
    <div class="mv-card__media">
      <img
        class="mv-card__cover"
        :src="mv.coverUrl || FALLBACK_COVER_URL"
        :alt="mv.title"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        referrerpolicy="no-referrer"
        @error="handleCoverError"
      />

      <div class="mv-card__metrics">
        <span class="mv-card__metric">
          <Video class="mv-card__metric-icon" :stroke-width="1.9" />
          <span>{{ playCountLabel }}</span>
        </span>

        <span class="mv-card__metric mv-card__metric--time">
          {{ formatDurationMs(mv.duration) }}
        </span>
      </div>

      <div class="mv-card__spotlight"></div>
      <div class="mv-card__shadow"></div>
    </div>

    <div class="mv-card__body">
      <div class="mv-card__eyebrow">
        <span class="mv-card__badge">{{ mv.badge }}</span>
        <span class="mv-card__hint">立即播放</span>
      </div>

      <h3 class="mv-card__title">{{ mv.title }}</h3>
      <p class="mv-card__artist">{{ artistLabel }}</p>

      <div class="mv-card__footer">
        <span class="mv-card__subline">{{ mv.subtitle || '点击封面后即可打开 MV 播放器。' }}</span>
        <span class="mv-card__action">
          <Play class="mv-card__action-icon" :stroke-width="2.1" />
        </span>
      </div>
    </div>
  </button>
</template>

<style scoped lang="scss">
.mv-card {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-align: left;
  cursor: pointer;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(18, 16, 64, 0.96), rgba(30, 12, 63, 0.98)),
    rgba(17, 12, 52, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 36px rgba(5, 7, 24, 0.24);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease;
}

.mv-card:hover,
.mv-card:focus-visible {
  transform: translateY(-4px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 24px 42px rgba(5, 7, 24, 0.3);
  filter: saturate(1.04);
  outline: none;
}

.mv-card__media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.mv-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mv-card__metrics {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.mv-card__metric {
  height: 24px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  background: rgba(10, 12, 24, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(248, 250, 255, 0.92);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(12px);
}

.mv-card__metric--time {
  margin-left: auto;
}

.mv-card__metric-icon {
  width: 11px;
  height: 11px;
  flex: none;
}

.mv-card__spotlight,
.mv-card__shadow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mv-card__spotlight {
  background:
    radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.16), transparent 24%),
    linear-gradient(180deg, rgba(10, 12, 30, 0.02) 0%, rgba(10, 12, 30, 0.12) 46%, rgba(8, 9, 25, 0.72) 100%);
}

.mv-card__shadow {
  background:
    linear-gradient(180deg, rgba(9, 11, 24, 0) 48%, rgba(9, 11, 24, 0.22) 66%, rgba(8, 10, 24, 0.82) 100%),
    linear-gradient(90deg, rgba(118, 24, 191, 0.22), rgba(31, 111, 255, 0.1));
  mix-blend-mode: screen;
}

.mv-card__body {
  min-height: 142px;
  padding: 16px 16px 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background:
    radial-gradient(circle at 20% 0%, rgba(198, 82, 255, 0.12), transparent 32%),
    radial-gradient(circle at 82% 10%, rgba(48, 146, 255, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(42, 17, 84, 0.98), rgba(22, 13, 54, 0.98));
}

.mv-card__eyebrow,
.mv-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mv-card__badge,
.mv-card__hint {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10px;
}

.mv-card__badge {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(246, 242, 255, 0.8);
}

.mv-card__hint {
  color: rgba(215, 223, 255, 0.46);
}

.mv-card__title {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: rgba(252, 251, 255, 0.98);
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.03em;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.mv-card__artist,
.mv-card__subline {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mv-card__artist {
  margin: 0;
  color: rgba(230, 236, 255, 0.68);
  font-size: 13px;
}

.mv-card__subline {
  color: rgba(216, 224, 255, 0.42);
  font-size: 12px;
}

.mv-card__action {
  width: 28px;
  height: 28px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(248, 249, 255, 0.88);
}

.mv-card__action-icon {
  width: 13px;
  height: 13px;
  margin-left: 1px;
}

@media (max-width: 640px) {
  .mv-card {
    border-radius: 22px;
  }

  .mv-card__body {
    min-height: 132px;
    padding: 14px;
  }

  .mv-card__title {
    font-size: 18px;
  }
}
</style>
