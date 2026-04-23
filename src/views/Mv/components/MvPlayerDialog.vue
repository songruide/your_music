<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { MessageSquareMore, Pause, Play, Share2, X } from 'lucide-vue-next'
import { getMvComments, type CommentItem } from '@/api/comment'
import CommentsPanel from '@/components/comments/CommentsPanel.vue'
import {
  getMvDetail,
  getMvPlaybackSource,
  type MvDetail,
  type MvPlaybackSeed,
  type MvPlaybackSource,
} from '@/api/mv'
import { formatDurationMs } from '@/utils/playerTrack'

// 这个弹层只依赖“最小可播放 MV 数据”：
// - modelValue 控制开关
// - mv 提供 id / 标题 / 封面 / 歌手这些打开弹层时首屏就能用到的内容
// 更完整的详情和播放地址，都会在弹层内部自行加载。
const props = defineProps<{
  modelValue: boolean
  mv: MvPlaybackSeed | null
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
const videoElement = ref<HTMLVideoElement | null>(null)
const actualDurationMs = ref<number | null>(null)
const videoCurrentTimeSeconds = ref(0)
const videoDurationSeconds = ref(0)
const videoSeekableEndSeconds = ref(0)
const isVideoPlaying = ref(false)
const commentsVisible = ref(false)
const comments = ref<CommentItem[]>([])
const hotComments = ref<CommentItem[]>([])
const commentsTotal = ref(0)
const commentsLoading = ref(false)
const commentsLoadingMore = ref(false)
const commentsError = ref('')
const commentsHasMore = ref(false)
const commentsNextOffset = ref(0)

// requestToken 用于丢弃过期异步请求。
// 例如：连续点开两支不同 MV 时，第一支详情慢回来，不能覆盖第二支当前弹层状态。
let requestToken = 0

// 弹层打开时会锁定 body 滚动；关闭时必须恢复之前的 overflow。
// previousBodyOverflow 用来记住用户在打开前 body 的样式。
let previousBodyOverflow = ''
const COMMENT_PAGE_SIZE = 12

// 这三个 computed 让弹层能做到“边加载边有内容”：
// 即使 detail 还没回来，也能先用父层传入的 seed 数据把标题、歌手、封面先渲染出来。
const displayTitle = computed(() => detail.value?.title || props.mv?.title || '')
const displayArtist = computed(() => detail.value?.artistName || props.mv?.artistNames.join(' / ') || '未知歌手')
const displayCover = computed(() => detail.value?.coverUrl || props.mv?.coverUrl || '')
const displayCommentTotal = computed(() => Math.max(commentsTotal.value, detail.value?.commentCount ?? 0))
const resolvedDurationMs = computed(() => actualDurationMs.value ?? detail.value?.duration)
const resolvedVideoDurationSeconds = computed(() => {
  const detailDurationSeconds = detail.value?.duration ? detail.value.duration / 1000 : 0

  return Math.max(
    videoDurationSeconds.value,
    videoSeekableEndSeconds.value,
    videoCurrentTimeSeconds.value,
    detailDurationSeconds,
  )
})
const videoProgressPercent = computed(() => {
  if (resolvedVideoDurationSeconds.value <= 0) {
    return 0
  }

  return Math.min((videoCurrentTimeSeconds.value / resolvedVideoDurationSeconds.value) * 100, 100)
})
const videoCurrentTimeLabel = computed(() => formatTime(videoCurrentTimeSeconds.value))
const videoDurationLabel = computed(() => formatTime(resolvedVideoDurationSeconds.value))

// statRows 把详情区做成统一的标签-值数组，
// 模板层只负责遍历，不需要写一堆重复的卡片结构。
const statRows = computed(() => [
  ['时长', formatDurationMs(resolvedDurationMs.value)],
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

function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '00:00'
  }

  const safeSeconds = Math.floor(totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function closeDialog() {
  emit('update:modelValue', false)
}

function resetVideoTiming() {
  actualDurationMs.value = null
  videoCurrentTimeSeconds.value = 0
  videoDurationSeconds.value = 0
  videoSeekableEndSeconds.value = 0
  isVideoPlaying.value = false
}

function pauseVideoPlayback() {
  videoElement.value?.pause()
  isVideoPlaying.value = false
}

function resetCommentsState() {
  comments.value = []
  hotComments.value = []
  commentsTotal.value = 0
  commentsLoading.value = false
  commentsLoadingMore.value = false
  commentsError.value = ''
  commentsHasMore.value = false
  commentsNextOffset.value = 0
}

async function toggleCommentsPanel() {
  const mvId = props.mv?.id

  if (!mvId) {
    return
  }

  if (commentsVisible.value) {
    commentsVisible.value = false
    return
  }

  commentsVisible.value = true

  if (comments.value.length > 0 || hotComments.value.length > 0 || commentsLoading.value || commentsLoadingMore.value) {
    return
  }

  await loadComments(mvId, 0, false, requestToken)
}

function syncVideoTiming() {
  const video = videoElement.value
  const durationSeconds = video?.duration

  if (!Number.isFinite(durationSeconds) || !durationSeconds || durationSeconds <= 0) {
    actualDurationMs.value = null
  } else {
    actualDurationMs.value = Math.round(durationSeconds * 1000)
    videoDurationSeconds.value = durationSeconds
  }

  const currentTimeSeconds = video?.currentTime

  videoCurrentTimeSeconds.value =
    Number.isFinite(currentTimeSeconds) && typeof currentTimeSeconds === 'number' && currentTimeSeconds >= 0
      ? currentTimeSeconds
      : 0

  let seekableEndSeconds = 0

  if (video?.seekable && video.seekable.length > 0) {
    const nextSeekableEnd = video.seekable.end(video.seekable.length - 1)

    if (Number.isFinite(nextSeekableEnd) && nextSeekableEnd > 0) {
      seekableEndSeconds = nextSeekableEnd
    }
  }

  videoSeekableEndSeconds.value = seekableEndSeconds
  isVideoPlaying.value = Boolean(video && !video.paused && !video.ended)
}

function seekVideo(event: Event) {
  const input = event.target as HTMLInputElement | null

  if (!input || !videoElement.value) {
    return
  }

  const nextTimeSeconds = Number(input.value)

  if (!Number.isFinite(nextTimeSeconds) || nextTimeSeconds < 0) {
    return
  }

  const safeTime = Math.min(nextTimeSeconds, Math.max(resolvedVideoDurationSeconds.value, 0))

  videoElement.value.currentTime = safeTime
  videoCurrentTimeSeconds.value = safeTime
}

function syncVideoPlaybackState() {
  isVideoPlaying.value = Boolean(videoElement.value && !videoElement.value.paused && !videoElement.value.ended)
}

async function toggleVideoPlay() {
  if (!videoElement.value) {
    return
  }

  if (videoElement.value.paused || videoElement.value.ended) {
    await videoElement.value.play()
    return
  }

  videoElement.value.pause()
}

async function loadComments(mvId: string, offset: number, append: boolean, token = requestToken) {
  const targetLoading = append ? commentsLoadingMore : commentsLoading

  targetLoading.value = true

  try {
    const payload = await getMvComments(mvId, {
      limit: COMMENT_PAGE_SIZE,
      offset,
    })

    if (token !== requestToken) {
      return
    }

    commentsTotal.value = payload.total
    commentsHasMore.value = payload.hasMore
    commentsNextOffset.value = payload.nextOffset
    commentsError.value = ''

    if (append) {
      comments.value = [...comments.value, ...payload.comments]
      return
    }

    hotComments.value = payload.hotComments
    comments.value = payload.comments
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    commentsError.value = err instanceof Error ? err.message : 'MV 评论加载失败'
  } finally {
    if (token === requestToken) {
      targetLoading.value = false
    }
  }
}

async function retryLoadComments() {
  const mvId = props.mv?.id

  if (!mvId || commentsLoading.value || commentsLoadingMore.value) {
    return
  }

  resetCommentsState()
  await loadComments(mvId, 0, false, requestToken)
}

async function loadMoreComments() {
  const mvId = props.mv?.id

  if (!mvId || commentsLoading.value || commentsLoadingMore.value || !commentsHasMore.value) {
    return
  }

  await loadComments(mvId, commentsNextOffset.value, true, requestToken)
}

// loadSource 只负责“当前 MV 在某个清晰度下的视频地址”。
// 详情和播放地址拆开请求，是因为切换清晰度时不需要重新拉一遍详情。
async function loadSource(mvId: string, resolution?: number, token = requestToken) {
  sourceLoading.value = true

  try {
    const nextSource = await getMvPlaybackSource(mvId, resolution)

    if (token !== requestToken) {
      return
    }

    pauseVideoPlayback()
    source.value = nextSource
    selectedResolution.value = nextSource.resolution
    error.value = ''
    resetVideoTiming()
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    error.value = err instanceof Error ? err.message : 'MV 视频地址加载失败'
  } finally {
    if (token === requestToken) {
      sourceLoading.value = false
    }
  }
}

// loadDialogData 是弹层打开后的完整加载流程：
// 1. 清空旧状态
// 2. 拉详情
// 3. 根据默认清晰度再去拿视频播放地址
async function loadDialogData(mvId: string) {
  const token = ++requestToken

  loading.value = true
  sourceLoading.value = false
  error.value = ''
  detail.value = null
  source.value = null
  selectedResolution.value = null
  commentsVisible.value = false
  resetCommentsState()

  try {
    const nextDetail = await getMvDetail(mvId)

    if (token !== requestToken) {
      return
    }

    detail.value = nextDetail
    selectedResolution.value = nextDetail.defaultResolution

    await loadSource(mvId, nextDetail.defaultResolution, token)
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

// 清晰度切换只更新播放源，不改详情数据。
async function switchResolution(resolution: number) {
  const mvId = props.mv?.id

  if (!mvId || sourceLoading.value || selectedResolution.value === resolution) {
    return
  }

  await loadSource(mvId, resolution, requestToken)
}

// 支持按 Esc 关闭弹层，保持和常见对话框交互一致。
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    closeDialog()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    // 打开时锁定页面滚动，关闭时恢复之前状态。
    if (typeof document !== 'undefined') {
      if (isOpen) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = previousBodyOverflow
      }
    }

    // 弹层刚打开时，以当前传入的 mv.id 为准加载内容。
    if (isOpen && props.mv?.id) {
      void loadDialogData(props.mv.id)
    }

    // 关闭时把 requestToken 前推，所有正在返回的旧请求都会自动失效。
    if (!isOpen) {
      requestToken += 1
      pauseVideoPlayback()
      resetVideoTiming()
      commentsVisible.value = false
      resetCommentsState()
    }
  },
)

watch(
  () => props.mv?.id,
  (mvId) => {
    // 如果弹层已经开着，又切换到了另一支 MV，立即重新加载。
    if (props.modelValue && mvId) {
      pauseVideoPlayback()
      resetVideoTiming()
      void loadDialogData(mvId)
    }
  },
)

// 直接挂 window 事件，是因为 Teleport 后的弹层不一定天然拿到焦点。
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }

  pauseVideoPlayback()

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
          <template v-if="!error">
            <div class="mv-dialog__video-wrap">
              <template v-if="source?.streamUrl">
                <video
                  :key="source.streamUrl"
                  ref="videoElement"
                  class="mv-dialog__video"
                  :poster="displayCover || undefined"
                  :src="source.streamUrl"
                  playsinline
                  preload="metadata"
                  @click="toggleVideoPlay"
                  @canplay="syncVideoTiming"
                  @durationchange="syncVideoTiming"
                  @emptied="resetVideoTiming"
                  @ended="syncVideoPlaybackState"
                  @error="resetVideoTiming"
                  @loadedmetadata="syncVideoTiming"
                  @pause="syncVideoPlaybackState"
                  @play="syncVideoPlaybackState"
                  @playing="syncVideoPlaybackState"
                  @progress="syncVideoTiming"
                  @seeked="syncVideoTiming"
                  @timeupdate="syncVideoTiming"
                  @waiting="syncVideoPlaybackState"
                ></video>
                <button
                  v-if="!isVideoPlaying"
                  class="mv-dialog__play-overlay"
                  type="button"
                  :aria-label="videoCurrentTimeSeconds > 0 ? '继续播放 MV' : '播放 MV'"
                  @click="toggleVideoPlay"
                >
                  <Play class="mv-dialog__play-overlay-icon" :stroke-width="2.2" />
                </button>
              </template>
              <div v-else class="mv-dialog__video-placeholder" :style="displayCover ? { backgroundImage: `url('${displayCover}')` } : undefined">
                <div class="mv-dialog__video-placeholder-overlay"></div>
                <span>{{ sourceLoading || loading ? '正在准备视频...' : '等待可用视频地址' }}</span>
              </div>
            </div>

            <div v-if="source?.streamUrl" class="mv-dialog__timeline">
              <button
                class="mv-dialog__transport"
                type="button"
                :aria-label="isVideoPlaying ? '暂停 MV' : '播放 MV'"
                @click="toggleVideoPlay"
              >
                <Pause v-if="isVideoPlaying" class="mv-dialog__transport-icon" :stroke-width="2.1" />
                <Play v-else class="mv-dialog__transport-icon mv-dialog__transport-icon--play" :stroke-width="2.1" />
              </button>
              <span class="mv-dialog__time">{{ videoCurrentTimeLabel }}</span>
              <input
                class="mv-dialog__range"
                :style="{ '--mv-progress': `${videoProgressPercent}%` }"
                type="range"
                min="0"
                :max="Math.max(resolvedVideoDurationSeconds, 0)"
                step="0.1"
                :value="Math.min(videoCurrentTimeSeconds, Math.max(resolvedVideoDurationSeconds, 0))"
                @input="seekVideo"
              />
              <span class="mv-dialog__time">{{ videoDurationLabel }}</span>
            </div>
          </template>

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
            <button
              class="mv-dialog__action-pill mv-dialog__action-pill--button"
              :class="{ 'mv-dialog__action-pill--active': commentsVisible }"
              type="button"
              @click="toggleCommentsPanel"
            >
              <MessageSquareMore class="mv-dialog__action-icon" :stroke-width="1.9" />
              <span>{{ commentsVisible ? '收起评论' : formatCount(detail?.commentCount) }}</span>
            </button>
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

        <section v-if="commentsVisible" class="mv-dialog__comments">
          <div class="mv-dialog__comments-head">
            <div class="mv-dialog__section-title">评论区</div>
            <div class="mv-dialog__comments-total">{{ formatCount(displayCommentTotal) }} 条评论</div>
          </div>
          <CommentsPanel
            :comments="comments"
            :error="commentsError"
            :has-more="commentsHasMore"
            :hot-comments="hotComments"
            :loading="commentsLoading"
            :loading-more="commentsLoadingMore"
            empty-text="这支 MV 暂时还没有评论。"
            @load-more="loadMoreComments"
            @retry="retryLoadComments"
          />
        </section>
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

.mv-dialog__comments {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  border-radius: 24px;
  background: rgba(7, 10, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mv-dialog__comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mv-dialog__comments-total {
  color: rgba(223, 229, 255, 0.6);
  font-size: 12px;
}

.mv-dialog__media-shell,
.mv-dialog__meta {
  min-width: 0;
}

.mv-dialog__media-shell {
  align-self: start;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 24px;
  background: rgba(7, 10, 24, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.mv-dialog__video-wrap {
  flex: 0 0 auto;
  position: relative;
  aspect-ratio: 16 / 9;
  min-height: 0;
}

.mv-dialog__video {
  width: 100%;
  height: 100%;
  display: block;
  background: #03040a;
  cursor: pointer;
}

.mv-dialog__play-overlay {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  width: 74px;
  height: 74px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: rgba(8, 10, 22, 0.72);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

.mv-dialog__play-overlay-icon {
  width: 22px;
  height: 22px;
  margin-left: 3px;
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

.mv-dialog__timeline {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background:
    linear-gradient(180deg, rgba(12, 15, 34, 0.78), rgba(9, 12, 27, 0.94));
}

.mv-dialog__transport {
  width: 38px;
  height: 38px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 91, 190, 0.96), rgba(152, 83, 255, 0.92));
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(189, 73, 244, 0.28);
}

.mv-dialog__transport-icon {
  width: 16px;
  height: 16px;
}

.mv-dialog__transport-icon--play {
  margin-left: 2px;
}

.mv-dialog__time {
  color: rgba(241, 245, 255, 0.76);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.mv-dialog__range {
  --mv-progress: 0%;
  appearance: none;
  width: 100%;
  height: 5px;
  border-radius: 999px;
  outline: none;
  background:
    linear-gradient(
      90deg,
      rgba(255, 118, 209, 0.96) 0%,
      rgba(157, 110, 255, 0.96) var(--mv-progress),
      rgba(255, 255, 255, 0.16) var(--mv-progress),
      rgba(255, 255, 255, 0.16) 100%
    );
}

.mv-dialog__range::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(240, 77, 255, 0.22);
}

.mv-dialog__range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(240, 77, 255, 0.22);
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

.mv-dialog__action-pill--button {
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease;
}

.mv-dialog__action-pill--button:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.12);
}

.mv-dialog__action-pill--active {
  background: linear-gradient(90deg, rgba(255, 74, 184, 0.92), rgba(175, 84, 255, 0.9));
  border-color: rgba(255, 255, 255, 0.16);
  color: #fff;
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

  .mv-dialog__timeline {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
