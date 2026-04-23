<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Disc3, MessageSquareMore, X } from 'lucide-vue-next'
import { getSongComments, type CommentItem, type SongCommentSeed } from '@/api/comment'
import { formatDurationMs } from '@/utils/playerTrack'
import CommentsPanel from './CommentsPanel.vue'

const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff5faf'/%3E%3Cstop offset='1' stop-color='%2351a8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='42' fill='url(%23g)'/%3E%3Ccircle cx='120' cy='94' r='30' fill='rgba(255,255,255,.72)'/%3E%3Crect x='58' y='146' width='124' height='38' rx='19' fill='rgba(255,255,255,.48)'/%3E%3C/svg%3E"

const COMMENT_PAGE_SIZE = 12

const props = defineProps<{
  modelValue: boolean
  song: SongCommentSeed | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const comments = ref<CommentItem[]>([])
const hotComments = ref<CommentItem[]>([])
const total = ref(0)
const nextOffset = ref(0)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')

let requestToken = 0
let previousBodyOverflow = ''

const displayTitle = computed(() => props.song?.title || '')
const displayArtist = computed(() => props.song?.artistNames.join(' / ') || '未知歌手')
const displayAlbum = computed(() => props.song?.albumName?.trim() || '单曲')
const displayDuration = computed(() => formatDurationMs(props.song?.duration))
const displayCover = computed(() => props.song?.coverUrl || FALLBACK_COVER_URL)

function formatCount(value?: number) {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
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

function closeDialog() {
  emit('update:modelValue', false)
}

function resetCommentsState() {
  comments.value = []
  hotComments.value = []
  total.value = 0
  nextOffset.value = 0
  hasMore.value = false
  error.value = ''
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    closeDialog()
  }
}

async function requestComments(songId: string, offset: number, append: boolean, token = requestToken) {
  const updateLoading = append ? loadingMore : loading

  updateLoading.value = true

  try {
    const payload = await getSongComments(songId, {
      limit: COMMENT_PAGE_SIZE,
      offset,
    })

    if (token !== requestToken) {
      return
    }

    total.value = payload.total
    hasMore.value = payload.hasMore
    nextOffset.value = payload.nextOffset
    error.value = ''

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

    error.value = err instanceof Error ? err.message : '歌曲评论加载失败'
  } finally {
    if (token === requestToken) {
      updateLoading.value = false
    }
  }
}

async function loadDialogData(songId: string) {
  const token = ++requestToken

  resetCommentsState()
  await requestComments(songId, 0, false, token)
}

async function retryLoad() {
  const songId = props.song?.id

  if (!songId || loading.value || loadingMore.value) {
    return
  }

  await loadDialogData(songId)
}

async function loadMoreComments() {
  const songId = props.song?.id

  if (!songId || loading.value || loadingMore.value || !hasMore.value) {
    return
  }

  await requestComments(songId, nextOffset.value, true, requestToken)
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

    if (isOpen && props.song?.id) {
      void loadDialogData(props.song.id)
    }

    if (!isOpen) {
      requestToken += 1
      resetCommentsState()
    }
  },
)

watch(
  () => props.song?.id,
  (songId) => {
    if (props.modelValue && songId) {
      void loadDialogData(songId)
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
    <div v-if="modelValue" class="song-comments-dialog">
      <div class="song-comments-dialog__backdrop" @click="closeDialog"></div>

      <section
        class="song-comments-dialog__panel"
        role="dialog"
        aria-modal="true"
        :aria-label="displayTitle || '歌曲评论'"
      >
        <button class="song-comments-dialog__close" type="button" aria-label="关闭歌曲评论" @click="closeDialog">
          <X :size="16" :stroke-width="2.2" />
        </button>

        <header class="song-comments-dialog__hero">
          <img
            class="song-comments-dialog__cover"
            :src="displayCover"
            :alt="displayTitle"
            referrerpolicy="no-referrer"
          />

          <div class="song-comments-dialog__copy">
            <div class="song-comments-dialog__eyebrow">Song Comments</div>
            <h2 class="song-comments-dialog__title">{{ displayTitle || '歌曲评论' }}</h2>
            <p class="song-comments-dialog__artist">{{ displayArtist }}</p>

            <div class="song-comments-dialog__badges">
              <span class="song-comments-dialog__badge">
                <Disc3 :size="13" :stroke-width="2" />
                <span>{{ displayAlbum }}</span>
              </span>
              <span class="song-comments-dialog__badge">{{ displayDuration }}</span>
              <span class="song-comments-dialog__badge">
                <MessageSquareMore :size="13" :stroke-width="2" />
                <span>{{ formatCount(total) }} 条评论</span>
              </span>
            </div>
          </div>
        </header>

        <CommentsPanel
          :comments="comments"
          :error="error"
          :has-more="hasMore"
          :hot-comments="hotComments"
          :loading="loading"
          :loading-more="loadingMore"
          empty-text="这首歌暂时还没有评论。"
          @load-more="loadMoreComments"
          @retry="retryLoad"
        />
      </section>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.song-comments-dialog {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 22px;
}

.song-comments-dialog__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 86, 205, 0.2), transparent 24%),
    radial-gradient(circle at 78% 14%, rgba(72, 166, 255, 0.22), transparent 24%),
    rgba(5, 7, 18, 0.78);
  backdrop-filter: blur(18px);
}

.song-comments-dialog__panel {
  position: relative;
  z-index: 1;
  width: min(920px, 100%);
  max-height: calc(100dvh - 44px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 24px;
  border: 1px solid rgba(211, 204, 255, 0.14);
  border-radius: 30px;
  background:
    radial-gradient(circle at 14% 12%, rgba(229, 64, 255, 0.14), transparent 24%),
    radial-gradient(circle at 80% 18%, rgba(63, 168, 255, 0.18), transparent 26%),
    linear-gradient(135deg, rgba(27, 15, 72, 0.98), rgba(14, 20, 63, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 28px 64px rgba(0, 0, 0, 0.38);
}

.song-comments-dialog__close {
  position: absolute;
  top: 14px;
  right: 14px;
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

.song-comments-dialog__hero {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.song-comments-dialog__cover {
  width: 148px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
}

.song-comments-dialog__copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.song-comments-dialog__eyebrow {
  color: rgba(214, 222, 255, 0.5);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.song-comments-dialog__title {
  margin: 0;
  color: rgba(251, 250, 255, 0.98);
  font-size: clamp(28px, 4vw, 34px);
  line-height: 1.12;
}

.song-comments-dialog__artist {
  margin: 0;
  color: rgba(235, 240, 255, 0.7);
  font-size: 14px;
}

.song-comments-dialog__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.song-comments-dialog__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(245, 247, 255, 0.84);
  font-size: 12px;
}

@media (max-width: 720px) {
  .song-comments-dialog__panel {
    padding: 18px;
    border-radius: 24px;
  }

  .song-comments-dialog__hero {
    grid-template-columns: 1fr;
  }

  .song-comments-dialog__cover {
    width: min(180px, 100%);
  }

  .song-comments-dialog__title {
    font-size: 24px;
  }
}
</style>
