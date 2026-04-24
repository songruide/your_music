<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Heart, MessageSquareMore, Play, Share2, Shuffle } from 'lucide-vue-next'
import type { SongCommentSeed } from '@/api/comment'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { useRoute } from 'vue-router'
import { getAlbumDetail, type AlbumDetail, type AlbumTrack } from '@/api/album'
import { usePlayerStore } from '@/stores/player'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'
import { debounce } from '@/utils/timing'

const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff5faf'/%3E%3Cstop offset='1' stop-color='%2351a8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='42' fill='url(%23g)'/%3E%3Ccircle cx='120' cy='94' r='30' fill='rgba(255,255,255,.72)'/%3E%3Crect x='58' y='146' width='124' height='38' rx='19' fill='rgba(255,255,255,.48)'/%3E%3C/svg%3E"

const route = useRoute()
const playerStore = usePlayerStore()
const libraryStore = useMusicLibraryStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const loading = ref(true)
const error = ref('')
const album = ref<AlbumDetail | null>(null)
const actionHint = ref('')
const isLiked = ref(false)
const activeSong = ref<SongCommentSeed | null>(null)
const songCommentsVisible = ref(false)

let requestToken = 0
const clearActionHint = debounce(() => {
  actionHint.value = ''
}, 1800)

const albumId = computed(() => {
  const value = route.params.id

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return typeof value === 'string' ? value : ''
})

const currentTrackId = computed(() => currentTrack.value?.id ?? '')
const displayArtists = computed(() => album.value?.artistNames.join(' / ') || '未知歌手')
const publishDateLabel = computed(() => {
  const value = album.value?.publishTime

  if (!value) {
    return '发布时间未知'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '发布时间未知'
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
})
const albumDescription = computed(
  () =>
    album.value?.description?.trim() ||
    '这张专辑的完整曲目已经整理在下面，可以直接从头播放，也可以单独点进某一首试听。',
)
const heroBackdropStyle = computed(() => {
  const coverUrl = album.value?.coverUrl?.trim()

  if (!coverUrl) {
    return undefined
  }

  return {
    backgroundImage: `linear-gradient(120deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 38%), url("${coverUrl}")`,
  }
})

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

function handleCoverError(event: Event) {
  const image = event.target as HTMLImageElement | null

  if (!image || image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = FALLBACK_COVER_URL
}

function showActionHint(message: string) {
  actionHint.value = message
  clearActionHint()
}

function toPlayerTrack(song: AlbumTrack) {
  return buildPlayerTrack({
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl,
    durationMs: song.duration,
  })
}

function createPlayerQueue(tracks: AlbumTrack[]) {
  return tracks.filter((track) => track.playable !== false).map(toPlayerTrack)
}

function handleTrackSelect(song: AlbumTrack) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = createPlayerQueue(album.value?.songs ?? [])
  const startIndex = queue.findIndex((track) => track.id === song.id)

  if (startIndex < 0) {
    return
  }

  void playerStore.playQueue(queue, startIndex)
}

function playAll() {
  const queue = createPlayerQueue(album.value?.songs ?? [])

  if (queue.length === 0) {
    showActionHint('这张专辑暂时没有可播放歌曲')
    return
  }

  void playerStore.playQueue(queue, 0)
}

function playRandom() {
  const queue = createPlayerQueue(album.value?.songs ?? [])

  if (queue.length === 0) {
    showActionHint('这张专辑暂时没有可播放歌曲')
    return
  }

  for (let index = queue.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[queue[index], queue[randomIndex]] = [queue[randomIndex], queue[index]]
  }

  void playerStore.playQueue(queue, 0)
}

function toggleLiked() {
  isLiked.value = !isLiked.value
  showActionHint(isLiked.value ? '已收藏专辑' : '已取消收藏')
}

function openSongComments(song: AlbumTrack) {
  activeSong.value = {
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl || album.value?.coverUrl || FALLBACK_COVER_URL,
    duration: song.duration,
  }
  songCommentsVisible.value = true
}

function isFavoriteSong(songId: string) {
  return libraryStore.isFavorite(songId)
}

function toggleFavoriteSong(song: AlbumTrack) {
  libraryStore.toggleFavorite(toPlayerTrack(song))
}

async function shareAlbum() {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    showActionHint('当前环境暂不支持复制链接')
    return
  }

  try {
    await navigator.clipboard.writeText(window.location.href)
    showActionHint('专辑链接已复制')
  } catch {
    showActionHint('复制失败，请稍后再试')
  }
}

async function loadAlbum(id: string) {
  const token = ++requestToken

  loading.value = true
  error.value = ''

  try {
    const data = await getAlbumDetail(id)

    if (token !== requestToken) {
      return
    }

    album.value = data
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    album.value = null
    error.value = err instanceof Error ? err.message : '专辑加载失败'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

watch(
  albumId,
  (id) => {
    if (!id) {
      album.value = null
      loading.value = false
      error.value = '专辑不存在'
      return
    }

    void loadAlbum(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearActionHint.cancel()
})
</script>

<template>
  <section class="album-detail">
    <div v-if="loading" class="album-detail__state">专辑加载中...</div>
    <div v-else-if="error" class="album-detail__state album-detail__state--error">
      {{ error }}
    </div>
    <template v-else-if="album">
      <header class="album-hero">
        <div class="album-hero__backdrop" :style="heroBackdropStyle"></div>
        <div class="album-hero__veil"></div>

        <div class="album-hero__cover-shell">
          <img
            class="album-hero__cover"
            :src="album.coverUrl || FALLBACK_COVER_URL"
            :alt="album.name"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />
        </div>

        <div class="album-hero__content">
          <div class="album-hero__badges">
            <span class="album-hero__badge album-hero__badge--type">专辑</span>
            <span class="album-hero__badge">{{ publishDateLabel }}</span>
            <span v-if="album.company" class="album-hero__badge">{{ album.company }}</span>
          </div>

          <h1 class="album-hero__title">{{ album.name }}</h1>

          <div class="album-hero__meta">{{ displayArtists }}</div>
          <p class="album-hero__desc">{{ albumDescription }}</p>

          <div class="album-hero__stats">
            <span>{{ album.size }} 首歌曲</span>
            <span>{{ formatCount(album.subCount) }} 收藏</span>
            <span>{{ formatCount(album.shareCount) }} 分享</span>
          </div>

          <div class="album-hero__actions">
            <button class="album-hero__action album-hero__action--primary" type="button" @click="playAll">
              <Play :size="16" :stroke-width="2.25" />
              <span>播放全部</span>
            </button>
            <button class="album-hero__action album-hero__action--ghost" type="button" @click="playRandom">
              <Shuffle :size="16" :stroke-width="2.2" />
              <span>随机播放</span>
            </button>
            <button
              class="album-hero__icon"
              :class="{ 'album-hero__icon--active': isLiked }"
              type="button"
              :title="isLiked ? '取消收藏' : '收藏专辑'"
              @click="toggleLiked"
            >
              <Heart :size="16" :stroke-width="2.2" />
            </button>
            <button class="album-hero__icon" type="button" title="复制专辑链接" @click="shareAlbum">
              <Share2 :size="16" :stroke-width="2.2" />
            </button>
          </div>

          <div v-if="actionHint" class="album-hero__hint">{{ actionHint }}</div>
        </div>
      </header>

      <section class="album-table">
        <div class="album-table__row album-table__row--head">
          <div class="album-table__cell album-table__cell--rank">#</div>
          <div class="album-table__cell">歌曲</div>
          <div class="album-table__cell album-table__cell--artist">歌手</div>
          <div class="album-table__cell album-table__cell--numeric">时长</div>
          <div class="album-table__cell album-table__cell--actions">操作</div>
        </div>

        <div v-if="album.songs.length === 0" class="album-table__empty">
          这张专辑暂时还没有歌曲。
        </div>

        <div v-else class="album-table__body">
          <article
            v-for="(song, index) in album.songs"
            :key="song.id"
            class="album-table__row album-table__row--interactive"
            :class="{
              'album-table__row--active': currentTrackId === song.id,
              'album-table__row--disabled': song.playable === false,
            }"
            :tabindex="song.playable === false ? -1 : 0"
            role="button"
            :aria-disabled="song.playable === false"
            @click="handleTrackSelect(song)"
            @keydown.enter.prevent="handleTrackSelect(song)"
            @keydown.space.prevent="handleTrackSelect(song)"
          >
            <div class="album-table__cell album-table__cell--rank">
              <span v-if="currentTrackId !== song.id">{{ index + 1 }}</span>
              <span v-else class="album-table__equalizer" :class="{ 'album-table__equalizer--paused': !isPlaying }">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>

            <div class="album-table__cell">
              <div class="album-table__main">
                <img
                  class="album-table__cover"
                  :src="song.coverUrl || album.coverUrl || FALLBACK_COVER_URL"
                  :alt="song.name"
                  referrerpolicy="no-referrer"
                  @error="handleCoverError"
                />
                <div class="album-table__copy">
                  <div class="album-table__title">{{ song.name }}</div>
                  <div class="album-table__sub album-table__sub--mobile">
                    {{ song.artistNames.join(' / ') || '未知歌手' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="album-table__cell album-table__cell--artist">
              {{ song.artistNames.join(' / ') || '未知歌手' }}
            </div>
            <div class="album-table__cell album-table__cell--numeric">
              {{ formatDurationMs(song.duration) }}
            </div>
            <div class="album-table__cell album-table__cell--actions">
              <button
                class="album-table__action"
                :class="{ 'album-table__action--favorite': isFavoriteSong(song.id) }"
                type="button"
                :title="isFavoriteSong(song.id) ? '取消收藏' : '收藏歌曲'"
                @click.stop="toggleFavoriteSong(song)"
              >
                <Heart :size="14" :stroke-width="1.95" :fill="isFavoriteSong(song.id) ? 'currentColor' : 'none'" />
              </button>
              <button
                class="album-table__action"
                type="button"
                title="查看歌曲评论"
                @click.stop="openSongComments(song)"
              >
                <MessageSquareMore :size="14" :stroke-width="1.95" />
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <SongCommentsDialog v-model="songCommentsVisible" :song="activeSong" />
  </section>
</template>

<style scoped lang="scss">
.album-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-width: 0;
  padding-bottom: 12px;
}

.album-detail__state {
  display: grid;
  place-items: center;
  min-height: 340px;
  padding: 28px;
  border: 1px solid rgba(214, 207, 255, 0.16);
  border-radius: 32px;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 110, 205, 0.16), transparent 24%),
    radial-gradient(circle at 68% 28%, rgba(108, 160, 255, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(18, 12, 58, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 36px rgba(10, 7, 32, 0.18);
  color: rgba(245, 247, 255, 0.82);
  text-align: center;
}

.album-detail__state--error {
  color: #ffd7e4;
}

.album-hero {
  position: relative;
  display: grid;
  grid-template-columns: 216px minmax(0, 1fr);
  gap: 28px;
  overflow: hidden;
  padding: 28px;
  border: 1px solid rgba(205, 196, 255, 0.18);
  border-radius: 34px;
  background:
    linear-gradient(120deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    linear-gradient(135deg, rgba(72, 32, 139, 0.88) 0%, rgba(61, 36, 146, 0.82) 28%, rgba(32, 21, 98, 0.92) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 22px 48px rgba(8, 7, 34, 0.26);
  isolation: isolate;
}

.album-hero__backdrop,
.album-hero__veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.album-hero__backdrop {
  background-position: center;
  background-size: cover;
  filter: blur(44px) saturate(1.18);
  transform: scale(1.16);
  opacity: 0.38;
}

.album-hero__veil {
  background:
    radial-gradient(circle at 50% 8%, rgba(148, 178, 255, 0.24), transparent 32%),
    radial-gradient(circle at 18% 76%, rgba(161, 255, 138, 0.11), transparent 22%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08), transparent 22%, transparent 78%, rgba(255, 255, 255, 0.04));
}

.album-hero__cover-shell,
.album-hero__content {
  position: relative;
  z-index: 1;
}

.album-hero__cover-shell {
  width: 216px;
  min-width: 0;
}

.album-hero__cover {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 36px rgba(9, 7, 31, 0.34);
}

.album-hero__content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.album-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.album-hero__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(247, 244, 255, 0.82);
  font-size: 11px;
  letter-spacing: 0.04em;
}

.album-hero__badge--type {
  background: rgba(255, 83, 176, 0.18);
  color: #ffd0e7;
}

.album-hero__title {
  margin: 14px 0 10px;
  color: rgba(251, 250, 255, 0.98);
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.14;
  letter-spacing: -0.03em;
}

.album-hero__meta {
  color: rgba(248, 250, 255, 0.9);
  font-size: 14px;
}

.album-hero__desc {
  display: -webkit-box;
  overflow: hidden;
  margin: 16px 0 18px;
  max-width: 960px;
  color: rgba(239, 241, 255, 0.68);
  font-size: 13px;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.album-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: rgba(235, 240, 255, 0.78);
  font-size: 13px;
}

.album-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.album-hero__action,
.album-hero__icon {
  border: 0;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.album-hero__action:hover,
.album-hero__icon:hover {
  transform: translateY(-1px);
}

.album-hero__action {
  height: 44px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
}

.album-hero__action--primary {
  background: linear-gradient(90deg, #ff43a9, #ff6ca2);
  box-shadow: 0 12px 22px rgba(255, 72, 167, 0.26);
}

.album-hero__action--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(248, 250, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.album-hero__icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(247, 250, 255, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.album-hero__icon--active {
  background: rgba(255, 83, 176, 0.18);
  color: #ff8ac5;
}

.album-hero__hint {
  margin-top: 14px;
  color: rgba(255, 214, 235, 0.88);
  font-size: 12px;
}

.album-table {
  overflow: hidden;
  border: 1px solid rgba(196, 189, 255, 0.14);
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 60%, rgba(113, 255, 131, 0.08), transparent 20%),
    radial-gradient(circle at 52% 18%, rgba(192, 81, 255, 0.12), transparent 20%),
    linear-gradient(135deg, rgba(24, 21, 56, 0.88), rgba(12, 11, 42, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 34px rgba(7, 7, 28, 0.24);
}

.album-table__row {
  display: grid;
  grid-template-columns: 42px minmax(280px, 1.9fr) minmax(180px, 1.1fr) 72px 110px;
  align-items: center;
  gap: 16px;
  min-height: 62px;
  padding: 0 20px;
}

.album-table__row--head {
  min-height: 50px;
  color: rgba(235, 240, 255, 0.44);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background:
    linear-gradient(180deg, rgba(22, 18, 56, 0.96), rgba(12, 11, 40, 0.86)),
    rgba(16, 15, 44, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.album-table__body .album-table__row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(246, 248, 255, 0.9);
}

.album-table__body .album-table__row:last-child {
  border-bottom: 0;
}

.album-table__row--interactive {
  cursor: pointer;
  transition:
    background 180ms ease,
    box-shadow 180ms ease;
}

.album-table__row--interactive:hover {
  background: rgba(255, 255, 255, 0.05);
}

.album-table__row--interactive:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.album-table__row--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08)),
    rgba(255, 255, 255, 0.04);
}

.album-table__row--disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.album-table__cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-table__cell--rank,
.album-table__cell--numeric {
  color: rgba(235, 240, 255, 0.56);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.album-table__cell--numeric {
  text-align: right;
}

.album-table__cell--actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.album-table__main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.album-table__cover {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}

.album-table__copy {
  min-width: 0;
}

.album-table__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(250, 252, 255, 0.96);
  font-size: 14px;
  font-weight: 600;
}

.album-table__sub,
.album-table__cell--artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.album-table__sub {
  margin-top: 4px;
}

.album-table__sub--mobile {
  display: none;
}

.album-table__action {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(241, 245, 255, 0.8);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease;
}

.album-table__action:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
}

.album-table__action--favorite {
  color: #ff7e9f;
}

.album-table__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #ff72bb;
}

.album-table__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.album-table__equalizer span:nth-child(1) {
  height: 7px;
}

.album-table__equalizer span:nth-child(2) {
  height: 13px;
  animation-delay: 0.18s;
}

.album-table__equalizer span:nth-child(3) {
  height: 9px;
  animation-delay: 0.34s;
}

.album-table__equalizer--paused span {
  height: 10px;
  animation: none;
}

.album-table__empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  padding: 24px;
  color: rgba(234, 239, 255, 0.54);
  text-align: center;
}

@keyframes equalizer {
  from {
    transform: scaleY(0.45);
    opacity: 0.66;
  }

  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (max-width: 1160px) {
  .album-hero {
    grid-template-columns: 188px minmax(0, 1fr);
    gap: 24px;
    padding: 24px;
  }

  .album-hero__cover-shell {
    width: 188px;
  }

  .album-table__row {
    grid-template-columns: 38px minmax(240px, 1.7fr) minmax(150px, 1fr) 66px 104px;
  }
}

@media (max-width: 900px) {
  .album-hero {
    grid-template-columns: 1fr;
  }

  .album-hero__cover-shell {
    width: min(220px, 100%);
  }

  .album-table__row {
    grid-template-columns: 34px minmax(0, 1fr) 64px 96px;
  }

  .album-table__cell--artist {
    display: none;
  }

  .album-table__sub--mobile {
    display: block;
  }
}

@media (max-width: 720px) {
  .album-detail {
    gap: 16px;
  }

  .album-hero {
    padding: 20px;
    border-radius: 28px;
  }

  .album-hero__title {
    font-size: 26px;
  }

  .album-table {
    border-radius: 24px;
  }

  .album-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 60px 92px;
    gap: 12px;
    padding: 0 14px;
  }
}

@media (max-width: 560px) {
  .album-hero__actions {
    gap: 10px;
  }

  .album-hero__action {
    height: 42px;
    padding: 0 16px;
  }

  .album-table__cell--numeric {
    display: none;
  }

  .album-table__row {
    grid-template-columns: 26px minmax(0, 1fr) 80px;
  }
}
</style>
