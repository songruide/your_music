<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { MessageSquareMore, Share2, X } from 'lucide-vue-next'
import {
  getMvDetail,
  getMvPlaybackSource,
  type MvDetail,
  type MvFeaturedItem,
  type MvPlaybackSource,
} from '@/api/mv'
import { formatDurationMs } from '@/utils/playerTrack'

const props = defineProps<{
  modelValue: boolean
  mv: MvFeaturedItem | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const detail = ref<MvDetail | null>(null)
const source = ref<MvPlaybackSource | null>(null)
const loading = ref(false)
const sourceLoading = ref(false)
const error = ref('')
const selectedResolution = ref<number | null>(null)

let requestToken = 0
let previousBodyOverflow = ''

const displayTitle = computed(() => detail.value?.title || props.mv?.title || '')
const displayArtist = computed(() => detail.value?.artistName || props.mv?.artistNames.join(' / ') || '未知歌手')
const displayCover = computed(() => detail.value?.coverUrl || props.mv?.coverUrl || '')

const statRows = computed(() => [
  ['时长', formatDurationMs(detail.value?.duration)],
  ['播放', formatPlayCount(detail.value?.playCount)],
  ['发布', detail.value?.publishTime || '未知'],
  ['收藏', formatCount(detail.value?.subscribedCount)],
  ['评论', formatCount(detail.value?.commentCount)],
  ['分享', formatCount(detail.value?.shareCount)],
])

function formatCount(value?: number) {
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

function formatPlayCount(value?: number) {
  return formatCount(value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

async function loadSource(mvId: string, resolution?: number) {
  sourceLoading.value = true

  try {
    source.value = await getMvPlaybackSource(mvId, resolution)
    selectedResolution.value = source.value.resolution
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'MV 视频地址加载失败'
  } finally {
    sourceLoading.value = false
  }
}

async function loadDialogData(mvId: string) {
  const token = ++requestToken

  loading.value = true
  sourceLoading.value = false
  error.value = ''
  detail.value = null
  source.value = null
  selectedResolution.value = null

  try {
    const nextDetail = await getMvDetail(mvId)

    if (token !== requestToken) {
      return
    }

    detail.value = nextDetail
    selectedResolution.value = nextDetail.defaultResolution

    await loadSource(mvId, nextDetail.defaultResolution)
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    error.value = err instanceof Error ? err.message : 'MV 详情加载失败'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

async function switchResolution(resolution: number) {
  const mvId = props.mv?.id

  if (!mvId || sourceLoading.value || selectedResolution.value === resolution) {
    return
  }

  await loadSource(mvId, resolution)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    closeDialog()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      if (isOpen) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = previousBodyOverflow
      }
    }

    if (isOpen && props.mv?.id) {
      void loadDialogData(props.mv.id)
    }

    if (!isOpen) {
      requestToken += 1
    }
  },
)

watch(
  () => props.mv?.id,
  (mvId) => {
    if (props.modelValue && mvId) {
      void loadDialogData(mvId)
    }
  },
)

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }

  if (typeof document !== 'undefined') {
    document.body.style.overflow = previousBodyOverflow
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="mv-dialog">
      <div class="mv-dialog__backdrop" @click="closeDialog"></div>

      <section class="mv-dialog__panel" role="dialog" aria-modal="true" :aria-label="displayTitle || 'MV 播放器'">
        <button class="mv-dialog__close" type="button" aria-label="关闭 MV 播放器" @click="closeDialog">
          <X class="mv-dialog__close-icon" :stroke-width="2.2" />
        </button>

        <div class="mv-dialog__media-shell">
          <div v-if="!error" class="mv-dialog__video-wrap">
            <video
              v-if="source?.streamUrl"
              class="mv-dialog__video"
              :poster="displayCover || undefined"
              :src="source.streamUrl"
              controls
              playsinline
              preload="metadata"
            ></video>
            <div v-else class="mv-dialog__video-placeholder" :style="displayCover ? { backgroundImage: `url('${displayCover}')` } : undefined">
              <div class="mv-dialog__video-placeholder-overlay"></div>
              <span>{{ sourceLoading || loading ? '正在准备视频...' : '等待可用视频地址' }}</span>
            </div>
          </div>

          <div v-else class="mv-dialog__error">
            {{ error }}
          </div>
        </div>

        <aside class="mv-dialog__meta">
          <div class="mv-dialog__eyebrow">MV Player</div>
          <h2 class="mv-dialog__title">{{ displayTitle || '正在载入 MV…' }}</h2>
          <p class="mv-dialog__artist">{{ displayArtist }}</p>

          <div class="mv-dialog__actions">
            <span class="mv-dialog__action-pill">
              <Share2 class="mv-dialog__action-icon" :stroke-width="1.9" />
              <span>{{ formatCount(detail?.shareCount) }}</span>
            </span>
            <span class="mv-dialog__action-pill">
              <MessageSquareMore class="mv-dialog__action-icon" :stroke-width="1.9" />
              <span>{{ formatCount(detail?.commentCount) }}</span>
            </span>
          </div>

          <div v-if="detail?.availableResolutions.length" class="mv-dialog__section">
            <div class="mv-dialog__section-title">清晰度</div>
            <div class="mv-dialog__resolution-list">
              <button
                v-for="option in detail.availableResolutions"
                :key="option.value"
                class="mv-dialog__resolution"
                :class="{ 'mv-dialog__resolution--active': selectedResolution === option.value }"
                type="button"
                :disabled="sourceLoading"
                @click="switchResolution(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="mv-dialog__section">
            <div class="mv-dialog__section-title">信息</div>
            <div class="mv-dialog__stats">
              <div v-for="[label, value] in statRows" :key="label" class="mv-dialog__stat">
                <span class="mv-dialog__stat-label">{{ label }}</span>
                <span class="mv-dialog__stat-value">{{ value }}</span>
              </div>
            </div>
          </div>

          <div v-if="detail?.description" class="mv-dialog__section">
            <div class="mv-dialog__section-title">简介</div>
            <p class="mv-dialog__desc">{{ detail.description }}</p>
          </div>
        </aside>
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.mv-dialog {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 22px;
}

.mv-dialog__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 16%, rgba(255, 89, 214, 0.18), transparent 24%),
    radial-gradient(circle at 80% 12%, rgba(51, 155, 255, 0.22), transparent 26%),
    rgba(5, 7, 18, 0.76);
  backdrop-filter: blur(18px);
}

.mv-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(1180px, 100%);
  max-height: calc(100dvh - 44px);
  overflow: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) 340px;
  gap: 18px;
  padding: 18px;
  border-radius: 30px;
  border: 1px solid rgba(211, 204, 255, 0.14);
  background:
    radial-gradient(circle at 14% 12%, rgba(229, 64, 255, 0.14), transparent 24%),
    radial-gradient(circle at 80% 18%, rgba(63, 168, 255, 0.18), transparent 26%),
    linear-gradient(135deg, rgba(27, 15, 72, 0.98), rgba(14, 20, 63, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 28px 64px rgba(0, 0, 0, 0.38);
}

.mv-dialog__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: rgba(10, 12, 26, 0.6);
  color: rgba(250, 250, 255, 0.9);
  cursor: pointer;
}

.mv-dialog__close-icon {
  width: 16px;
  height: 16px;
}

.mv-dialog__media-shell,
.mv-dialog__meta {
  min-width: 0;
}

.mv-dialog__media-shell {
  overflow: hidden;
  border-radius: 24px;
  background: rgba(7, 10, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mv-dialog__video-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
  min-height: 100%;
}

.mv-dialog__video {
  width: 100%;
  height: 100%;
  display: block;
  background: #03040a;
}

.mv-dialog__video-placeholder,
.mv-dialog__error {
  min-height: 100%;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  padding: 24px;
  color: rgba(243, 246, 255, 0.78);
  text-align: center;
}

.mv-dialog__video-placeholder {
  position: relative;
  background:
    linear-gradient(135deg, rgba(42, 19, 84, 0.96), rgba(18, 28, 72, 0.96));
  background-position: center;
  background-size: cover;
  overflow: hidden;
}

.mv-dialog__video-placeholder-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(7, 8, 22, 0.18), rgba(7, 8, 22, 0.72)),
    radial-gradient(circle at 50% 22%, rgba(255, 255, 255, 0.12), transparent 26%);
}

.mv-dialog__video-placeholder span {
  position: relative;
  z-index: 1;
}

.mv-dialog__error {
  color: #ffd8e6;
}

.mv-dialog__meta {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 12px 10px 6px 2px;
}

.mv-dialog__eyebrow {
  color: rgba(214, 222, 255, 0.58);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.mv-dialog__title {
  margin: 0;
  color: rgba(251, 251, 255, 0.98);
  font-size: clamp(28px, 3.4vw, 38px);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.mv-dialog__artist {
  margin: -6px 0 0;
  color: rgba(232, 237, 255, 0.7);
  font-size: 14px;
}

.mv-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mv-dialog__action-pill {
  min-height: 32px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(247, 247, 255, 0.88);
  font-size: 12px;
}

.mv-dialog__action-icon {
  width: 14px;
  height: 14px;
}

.mv-dialog__section {
  display: grid;
  gap: 10px;
}

.mv-dialog__section-title {
  color: rgba(224, 232, 255, 0.58);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.mv-dialog__resolution-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mv-dialog__resolution {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(233, 238, 255, 0.78);
  cursor: pointer;
}

.mv-dialog__resolution:disabled {
  cursor: wait;
  opacity: 0.56;
}

.mv-dialog__resolution--active {
  background: linear-gradient(90deg, rgba(255, 74, 184, 0.92), rgba(175, 84, 255, 0.9));
  border-color: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.mv-dialog__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mv-dialog__stat {
  min-width: 0;
  padding: 12px;
  display: grid;
  gap: 5px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mv-dialog__stat-label {
  color: rgba(214, 222, 255, 0.5);
  font-size: 11px;
}

.mv-dialog__stat-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(249, 250, 255, 0.92);
  font-size: 14px;
  font-weight: 600;
}

.mv-dialog__desc {
  margin: 0;
  color: rgba(226, 232, 255, 0.68);
  font-size: 13px;
  line-height: 1.8;
}

@media (max-width: 980px) {
  .mv-dialog {
    padding: 14px;
  }

  .mv-dialog__panel {
    grid-template-columns: 1fr;
    max-height: calc(100dvh - 28px);
  }

  .mv-dialog__meta {
    padding: 2px 2px 6px;
  }
}

@media (max-width: 560px) {
  .mv-dialog__panel {
    padding: 14px;
    border-radius: 24px;
  }

  .mv-dialog__stats {
    grid-template-columns: 1fr;
  }
}
</style>
