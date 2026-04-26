<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Heart, MessageSquareMore, Play, Share2, Shuffle } from 'lucide-vue-next'
import type { SongCommentSeed } from '@/api/comment'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import SongRowActions from '@/components/SongRowActions.vue'
import { useRoute } from 'vue-router'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { getPlaylistDetail, type PlaylistDetail, type PlaylistTrack } from '@/api/playlist'
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
const playlist = ref<PlaylistDetail | null>(null)
const actionHint = ref('')
const isLiked = ref(false)
const activeSong = ref<SongCommentSeed | null>(null)
const songCommentsVisible = ref(false)

let requestToken = 0
const clearActionHint = debounce(() => {
  actionHint.value = ''
}, 1800)

const playlistId = computed(() => {
  const value = route.params.id

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return typeof value === 'string' ? value : ''
})

const currentTrackId = computed(() => currentTrack.value?.id ?? '')
const displayTags = computed(() => {
  const tags = playlist.value?.tags.filter(Boolean).slice(0, 3) ?? []
  return tags.length > 0 ? tags : ['心动推荐']
})
const updatedAtLabel = computed(() => {
  const timestamp = playlist.value?.updateTime ?? playlist.value?.createTime
  return `更新于 ${formatDate(timestamp)}`
})
const playlistDescription = computed(
  () =>
    playlist.value?.description?.trim() ||
    '把喜欢的旋律收进同一片夜色里，适合戴上耳机从头听到尾。',
)
const heroBackdropStyle = computed(() => {
  const coverUrl = playlist.value?.coverUrl?.trim()

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

function formatDate(value?: number) {
  if (!Number.isFinite(value) || !value) {
    return '最近'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '最近'
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate(),
  ).padStart(2, '0')}`
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

function toPlayerTrack(song: PlaylistTrack) {
  return buildPlayerTrack({
    id: song.id,
    title: song.name,
    artists: song.artists,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl,
    durationMs: song.duration,
  })
}

function createPlayerQueue(tracks: PlaylistTrack[]) {
  return tracks.filter((track) => track.playable !== false).map(toPlayerTrack)
}

function handleTrackSelect(song: PlaylistTrack) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = createPlayerQueue(playlist.value?.tracks ?? [])
  const startIndex = queue.findIndex((track) => track.id === song.id)

  if (startIndex < 0) {
    return
  }

  void playerStore.playQueue(queue, startIndex)
}

function playAll() {
  const queue = createPlayerQueue(playlist.value?.tracks ?? [])

  if (queue.length === 0) {
    showActionHint('这个歌单暂时没有可播放歌曲')
    return
  }

  void playerStore.playQueue(queue, 0)
}

function playRandom() {
  const queue = createPlayerQueue(playlist.value?.tracks ?? [])

  if (queue.length === 0) {
    showActionHint('这个歌单暂时没有可播放歌曲')
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
  showActionHint(isLiked.value ? '已加入喜欢' : '已取消喜欢')
}

function openSongComments(song: PlaylistTrack) {
  activeSong.value = {
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl || playlist.value?.coverUrl || FALLBACK_COVER_URL,
    duration: song.duration,
  }
  songCommentsVisible.value = true
}

function isFavoriteSong(songId: string) {
  return libraryStore.isFavorite(songId)
}

function isLocalSong(songId: string) {
  return libraryStore.isLocalTrack(songId)
}

function toggleFavoriteSong(song: PlaylistTrack) {
  libraryStore.toggleFavorite(toPlayerTrack(song))
}

function playNextSong(song: PlaylistTrack) {
  if (song.playable === false) {
    return
  }

  void playerStore.enqueueNextTrack(toPlayerTrack(song))
  showActionHint('已添加到下一首播放')
}

function downloadSong(song: PlaylistTrack) {
  if (song.playable === false) {
    return
  }

  libraryStore.addLocalTrack(toPlayerTrack(song))
  showActionHint('已添加到本地音乐')
}

async function sharePlaylist() {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    showActionHint('当前环境暂不支持复制链接')
    return
  }

  try {
    await navigator.clipboard.writeText(window.location.href)
    showActionHint('歌单链接已复制')
  } catch {
    showActionHint('复制失败，请稍后再试')
  }
}

async function loadPlaylist(id: string) {
  const token = ++requestToken

  loading.value = true
  error.value = ''

  try {
    const data = await getPlaylistDetail(id)

    if (token !== requestToken) {
      return
    }

    playlist.value = data
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    playlist.value = null
    error.value = err instanceof Error ? err.message : '歌单加载失败'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

watch(
  playlistId,
  (id) => {
    if (!id) {
      playlist.value = null
      loading.value = false
      error.value = '歌单不存在'
      return
    }

    void loadPlaylist(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearActionHint.cancel()
})
</script>

<template>
  <section class="playlist-detail">
    <div v-if="loading" class="playlist-detail__state">歌单加载中...</div>
    <div v-else-if="error" class="playlist-detail__state playlist-detail__state--error">
      {{ error }}
    </div>
    <template v-else-if="playlist">
      <header class="playlist-hero">
        <div class="playlist-hero__backdrop" :style="heroBackdropStyle"></div>
        <div class="playlist-hero__veil"></div>

        <div class="playlist-hero__cover-shell">
          <img
            class="playlist-hero__cover"
            :src="playlist.coverUrl || FALLBACK_COVER_URL"
            :alt="playlist.name"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />
        </div>

        <div class="playlist-hero__content">
          <div class="playlist-hero__badges">
            <span class="playlist-hero__badge playlist-hero__badge--type">歌单</span>
            <span v-for="tag in displayTags" :key="tag" class="playlist-hero__badge">
              {{ tag }}
            </span>
          </div>

          <h1 class="playlist-hero__title">{{ playlist.name }}</h1>

          <div class="playlist-hero__meta">
            <img
              class="playlist-hero__avatar"
              :src="playlist.creator.avatarUrl || playlist.coverUrl || FALLBACK_COVER_URL"
              :alt="playlist.creator.nickname"
              referrerpolicy="no-referrer"
              @error="handleCoverError"
            />
            <span class="playlist-hero__creator">{{ playlist.creator.nickname }}</span>
            <span class="playlist-hero__dot">·</span>
            <span>{{ updatedAtLabel }}</span>
          </div>

          <p class="playlist-hero__desc">{{ playlistDescription }}</p>

          <div class="playlist-hero__stats">
            <span>{{ playlist.trackCount }} 首歌曲</span>
            <span>{{ formatCount(playlist.playCount) }} 次播放</span>
            <span>{{ formatCount(playlist.subscribedCount) }} 收藏</span>
          </div>

          <div class="playlist-hero__actions">
            <button class="playlist-hero__action playlist-hero__action--primary" type="button" @click="playAll">
              <Play :size="16" :stroke-width="2.25" />
              <span>播放全部</span>
            </button>
            <button class="playlist-hero__action playlist-hero__action--ghost" type="button" @click="playRandom">
              <Shuffle :size="16" :stroke-width="2.2" />
              <span>随机播放</span>
            </button>
            <button
              class="playlist-hero__icon"
              :class="{ 'playlist-hero__icon--active': isLiked }"
              type="button"
              :title="isLiked ? '取消喜欢' : '加入喜欢'"
              @click="toggleLiked"
            >
              <Heart :size="16" :stroke-width="2.2" />
            </button>
            <button class="playlist-hero__icon" type="button" title="复制歌单链接" @click="sharePlaylist">
              <Share2 :size="16" :stroke-width="2.2" />
            </button>
          </div>

          <div v-if="actionHint" class="playlist-hero__hint">{{ actionHint }}</div>
        </div>
      </header>

      <div class="playlist-toolbar">
        <div class="playlist-toolbar__tabs">
          <span class="playlist-toolbar__tab playlist-toolbar__tab--active">歌曲 {{ playlist.trackCount }}</span>
          <span class="playlist-toolbar__tab">评论 {{ formatCount(playlist.commentCount) }}</span>
          <span class="playlist-toolbar__tab">分享 {{ formatCount(playlist.shareCount) }}</span>
        </div>
        <div class="playlist-toolbar__sort">默认排序</div>
      </div>

      <section class="playlist-table">
        <div class="playlist-table__row playlist-table__row--head">
          <div class="playlist-table__cell playlist-table__cell--rank">#</div>
          <div class="playlist-table__cell">歌曲</div>
          <div class="playlist-table__cell playlist-table__cell--artist">歌手</div>
          <div class="playlist-table__cell playlist-table__cell--album">专辑</div>
          <div class="playlist-table__cell playlist-table__cell--numeric">时长</div>
          <div class="playlist-table__cell playlist-table__cell--actions">操作</div>
        </div>

        <div v-if="playlist.tracks.length === 0" class="playlist-table__empty">
          这个歌单暂时还没有歌曲。
        </div>

        <div v-else class="playlist-table__body">
          <article
            v-for="(song, index) in playlist.tracks"
            :key="song.id"
            class="playlist-table__row playlist-table__row--interactive song-action-row"
            :class="{
              'playlist-table__row--active': currentTrackId === song.id,
              'playlist-table__row--disabled': song.playable === false,
            }"
            :tabindex="song.playable === false ? -1 : 0"
            role="button"
            :aria-disabled="song.playable === false"
            @click="handleTrackSelect(song)"
            @keydown.enter.prevent="handleTrackSelect(song)"
            @keydown.space.prevent="handleTrackSelect(song)"
          >
            <div class="playlist-table__cell playlist-table__cell--rank">
              <span v-if="currentTrackId !== song.id">{{ index + 1 }}</span>
              <span v-else class="playlist-table__equalizer" :class="{ 'playlist-table__equalizer--paused': !isPlaying }">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>

            <div class="playlist-table__cell">
              <div class="playlist-table__main">
                <img
                  class="playlist-table__cover"
                  :src="song.coverUrl || FALLBACK_COVER_URL"
                  :alt="song.name"
                  referrerpolicy="no-referrer"
                  @error="handleCoverError"
                />
                <div class="playlist-table__copy">
                  <div class="playlist-table__title">{{ song.name }}</div>
                  <div class="playlist-table__sub playlist-table__sub--mobile">
                    {{ song.artistNames.join(' / ') || '未知歌手' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="playlist-table__cell playlist-table__cell--artist">
              {{ song.artistNames.join(' / ') || '未知歌手' }}
            </div>
            <div class="playlist-table__cell playlist-table__cell--album">{{ song.albumName }}</div>
            <div class="playlist-table__cell playlist-table__cell--numeric">
              {{ formatDurationMs(song.duration) }}
            </div>
            <div class="playlist-table__cell playlist-table__cell--actions">
              <SongRowActions
                :disabled="song.playable === false"
                :is-downloaded="isLocalSong(song.id)"
                :is-favorite="isFavoriteSong(song.id)"
                @download="downloadSong(song)"
                @favorite="toggleFavoriteSong(song)"
                @play="handleTrackSelect(song)"
                @play-next="playNextSong(song)"
              />
              <button
                class="playlist-table__action song-action"
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
.playlist-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-width: 0;
  padding-bottom: 12px;
}

.playlist-detail__state {
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

.playlist-detail__state--error {
  color: #ffd7e4;
}

.playlist-hero {
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

.playlist-hero__backdrop,
.playlist-hero__veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.playlist-hero__backdrop {
  background-position: center;
  background-size: cover;
  filter: blur(44px) saturate(1.18);
  transform: scale(1.16);
  opacity: 0.38;
}

.playlist-hero__veil {
  background:
    radial-gradient(circle at 50% 8%, rgba(148, 178, 255, 0.24), transparent 32%),
    radial-gradient(circle at 18% 76%, rgba(161, 255, 138, 0.11), transparent 22%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08), transparent 22%, transparent 78%, rgba(255, 255, 255, 0.04));
}

.playlist-hero__cover-shell,
.playlist-hero__content {
  position: relative;
  z-index: 1;
}

.playlist-hero__cover-shell {
  width: 216px;
  min-width: 0;
}

.playlist-hero__cover {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 36px rgba(9, 7, 31, 0.34);
}

.playlist-hero__content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.playlist-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.playlist-hero__badge {
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

.playlist-hero__badge--type {
  background: rgba(255, 83, 176, 0.18);
  color: #ffd0e7;
}

.playlist-hero__title {
  margin: 14px 0 10px;
  color: rgba(251, 250, 255, 0.98);
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.14;
  letter-spacing: -0.03em;
}

.playlist-hero__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(233, 237, 255, 0.7);
  font-size: 13px;
}

.playlist-hero__avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.playlist-hero__creator {
  color: rgba(248, 250, 255, 0.9);
}

.playlist-hero__dot {
  opacity: 0.5;
}

.playlist-hero__desc {
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

.playlist-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: rgba(235, 240, 255, 0.78);
  font-size: 13px;
}

.playlist-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.playlist-hero__action,
.playlist-hero__icon {
  border: 0;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.playlist-hero__action:hover,
.playlist-hero__icon:hover {
  transform: translateY(-1px);
}

.playlist-hero__action {
  height: 44px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
}

.playlist-hero__action--primary {
  background: linear-gradient(90deg, #ff43a9, #ff6ca2);
  box-shadow: 0 12px 22px rgba(255, 72, 167, 0.26);
}

.playlist-hero__action--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(248, 250, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.playlist-hero__icon {
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

.playlist-hero__icon--active {
  background: rgba(255, 83, 176, 0.18);
  color: #ff8ac5;
}

.playlist-hero__hint {
  margin-top: 14px;
  color: rgba(255, 214, 235, 0.88);
  font-size: 12px;
}

.playlist-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
}

.playlist-toolbar__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  min-width: 0;
}

.playlist-toolbar__tab {
  color: rgba(234, 239, 255, 0.56);
  font-size: 13px;
}

.playlist-toolbar__tab--active {
  color: rgba(250, 251, 255, 0.96);
  font-weight: 600;
}

.playlist-toolbar__sort {
  color: rgba(228, 234, 255, 0.52);
  font-size: 12px;
}

.playlist-table {
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

.playlist-table__row {
  display: grid;
  grid-template-columns: 42px minmax(280px, 1.9fr) minmax(180px, 1.1fr) minmax(180px, 1fr) 72px 176px;
  align-items: center;
  gap: 16px;
  min-height: 62px;
  padding: 0 20px;
}

.playlist-table__row--head {
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

.playlist-table__body .playlist-table__row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(246, 248, 255, 0.9);
}

.playlist-table__body .playlist-table__row:last-child {
  border-bottom: 0;
}

.playlist-table__row--interactive {
  cursor: pointer;
  transition:
    background 180ms ease,
    box-shadow 180ms ease;
}

.playlist-table__row--interactive:hover {
  background: rgba(255, 255, 255, 0.05);
}

.playlist-table__row--interactive:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.playlist-table__row--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08)),
    rgba(255, 255, 255, 0.04);
}

.playlist-table__row--disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.playlist-table__cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-table__cell--rank,
.playlist-table__cell--numeric {
  color: rgba(235, 240, 255, 0.56);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.playlist-table__cell--numeric {
  text-align: right;
}

.playlist-table__cell--actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.playlist-table__main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.playlist-table__cover {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}

.playlist-table__copy {
  min-width: 0;
}

.playlist-table__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(250, 252, 255, 0.96);
  font-size: 14px;
  font-weight: 600;
}

.playlist-table__sub,
.playlist-table__cell--artist,
.playlist-table__cell--album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.playlist-table__sub {
  margin-top: 4px;
}

.playlist-table__sub--mobile {
  display: none;
}

.playlist-table__action {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(242, 246, 255, 0.74);
  cursor: pointer;
  transition: background 180ms ease;
}

.playlist-table__action:hover {
  background: rgba(255, 255, 255, 0.1);
}

.playlist-table__action--favorite {
  color: #ff7e9f;
}

.playlist-table__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #ff72bb;
}

.playlist-table__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.playlist-table__equalizer span:nth-child(1) {
  height: 7px;
}

.playlist-table__equalizer span:nth-child(2) {
  height: 13px;
  animation-delay: 0.18s;
}

.playlist-table__equalizer span:nth-child(3) {
  height: 9px;
  animation-delay: 0.34s;
}

.playlist-table__equalizer--paused span {
  height: 10px;
  animation: none;
}

.playlist-table__empty {
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
  .playlist-hero {
    grid-template-columns: 188px minmax(0, 1fr);
    gap: 24px;
    padding: 24px;
  }

  .playlist-hero__cover-shell {
    width: 188px;
  }

  .playlist-table__row {
    grid-template-columns: 38px minmax(240px, 1.7fr) minmax(150px, 1fr) minmax(140px, 0.9fr) 66px 168px;
  }
}

@media (max-width: 900px) {
  .playlist-hero {
    grid-template-columns: 1fr;
  }

  .playlist-hero__cover-shell {
    width: min(220px, 100%);
  }

  .playlist-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .playlist-table__row {
    grid-template-columns: 34px minmax(0, 1.7fr) minmax(0, 1fr) 64px 160px;
  }

  .playlist-table__cell--album {
    display: none;
  }
}

@media (max-width: 720px) {
  .playlist-detail {
    gap: 16px;
  }

  .playlist-hero {
    padding: 20px;
    border-radius: 28px;
  }

  .playlist-hero__title {
    font-size: 26px;
  }

  .playlist-table {
    border-radius: 24px;
  }

  .playlist-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 60px;
    gap: 12px;
    padding: 0 14px;
  }

  .playlist-table__cell--artist,
  .playlist-table__cell--actions {
    display: none;
  }

  .playlist-table__sub--mobile {
    display: block;
  }
}

@media (max-width: 560px) {
  .playlist-hero__actions {
    gap: 10px;
  }

  .playlist-hero__action {
    height: 42px;
    padding: 0 16px;
  }

  .playlist-table__cell--numeric {
    display: none;
  }

  .playlist-table__row {
    grid-template-columns: 26px minmax(0, 1fr);
  }
}
</style>
