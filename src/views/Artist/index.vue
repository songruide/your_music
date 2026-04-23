<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Heart, MessageSquareMore, Play, Share2, Shuffle } from 'lucide-vue-next'
import type { SongCommentSeed } from '@/api/comment'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import { useRoute, useRouter } from 'vue-router'
import { getArtistDetail, type ArtistDetail, type ArtistMv, type ArtistSong } from '@/api/artist'
import type { MvPlaybackSeed } from '@/api/mv'
import { usePlayerStore } from '@/stores/player'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'
import { debounce } from '@/utils/timing'
import MvPlayerDialog from '@/views/Mv/components/MvPlayerDialog.vue'

const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff5faf'/%3E%3Cstop offset='1' stop-color='%2351a8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='42' fill='url(%23g)'/%3E%3Ccircle cx='120' cy='94' r='30' fill='rgba(255,255,255,.72)'/%3E%3Crect x='58' y='146' width='124' height='38' rx='19' fill='rgba(255,255,255,.48)'/%3E%3C/svg%3E"

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const loading = ref(true)
const error = ref('')
const artist = ref<ArtistDetail | null>(null)
const actionHint = ref('')
const isFollowed = ref(false)
const activePanel = ref<'songs' | 'albums' | 'mvs'>('songs')
const activeSong = ref<SongCommentSeed | null>(null)
const activeMv = ref<MvPlaybackSeed | null>(null)
const playerVisible = ref(false)
const songCommentsVisible = ref(false)

let requestToken = 0
const clearActionHint = debounce(() => {
  actionHint.value = ''
}, 1800)

const artistId = computed(() => {
  const value = route.params.id

  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return typeof value === 'string' ? value : ''
})

const currentTrackId = computed(() => currentTrack.value?.id ?? '')
const displayAlias = computed(() => artist.value?.alias.filter(Boolean).slice(0, 3) ?? [])
const artistDescription = computed(
  () =>
    artist.value?.description?.trim() ||
    '把这个歌手最有代表性的热门歌曲先排在一起，适合从头试听他的声音质感和创作气质。',
)
const heroBackdropStyle = computed(() => {
  const coverUrl = artist.value?.coverUrl?.trim()

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

function toPlayerTrack(song: ArtistSong) {
  return buildPlayerTrack({
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    coverUrl: song.coverUrl,
    durationMs: song.duration,
  })
}

function createPlayerQueue(tracks: ArtistSong[]) {
  return tracks.filter((track) => track.playable !== false).map(toPlayerTrack)
}

function handleTrackSelect(song: ArtistSong) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = createPlayerQueue(artist.value?.songs ?? [])
  const startIndex = queue.findIndex((track) => track.id === song.id)

  if (startIndex < 0) {
    return
  }

  void playerStore.playQueue(queue, startIndex)
}

function playAll() {
  const queue = createPlayerQueue(artist.value?.songs ?? [])

  if (queue.length === 0) {
    showActionHint('这个歌手暂时没有可播放歌曲')
    return
  }

  void playerStore.playQueue(queue, 0)
}

function playRandom() {
  const queue = createPlayerQueue(artist.value?.songs ?? [])

  if (queue.length === 0) {
    showActionHint('这个歌手暂时没有可播放歌曲')
    return
  }

  for (let index = queue.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[queue[index], queue[randomIndex]] = [queue[randomIndex], queue[index]]
  }

  void playerStore.playQueue(queue, 0)
}

function toggleFollowed() {
  isFollowed.value = !isFollowed.value
  showActionHint(isFollowed.value ? '已关注歌手' : '已取消关注')
}

function openSongComments(song: ArtistSong) {
  activeSong.value = {
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl || artist.value?.coverUrl || FALLBACK_COVER_URL,
    duration: song.duration,
  }
  songCommentsVisible.value = true
}

function openMv(mv: ArtistMv) {
  activeMv.value = {
    id: mv.id,
    title: mv.title,
    artistNames: mv.artistNames,
    coverUrl: mv.coverUrl,
  }
  playerVisible.value = true
}

function openAlbum(albumId: string) {
  if (!albumId) {
    return
  }

  void router.push({
    name: 'album-detail',
    params: { id: albumId },
  })
}

function switchPanel(panel: 'songs' | 'albums' | 'mvs') {
  activePanel.value = panel
}

async function shareArtist() {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    showActionHint('当前环境暂不支持复制链接')
    return
  }

  try {
    await navigator.clipboard.writeText(window.location.href)
    showActionHint('歌手链接已复制')
  } catch {
    showActionHint('复制失败，请稍后再试')
  }
}

async function loadArtist(id: string) {
  const token = ++requestToken

  loading.value = true
  error.value = ''

  try {
    const data = await getArtistDetail(id)

    if (token !== requestToken) {
      return
    }

    artist.value = data
    activePanel.value = 'songs'
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    artist.value = null
    error.value = err instanceof Error ? err.message : '歌手加载失败'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

watch(
  artistId,
  (id) => {
    if (!id) {
      artist.value = null
      loading.value = false
      error.value = '歌手不存在'
      return
    }

    void loadArtist(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearActionHint.cancel()
})
</script>

<template>
  <section class="artist-detail">
    <div v-if="loading" class="artist-detail__state">歌手加载中...</div>
    <div v-else-if="error" class="artist-detail__state artist-detail__state--error">
      {{ error }}
    </div>
    <template v-else-if="artist">
      <header class="artist-hero">
        <div class="artist-hero__backdrop" :style="heroBackdropStyle"></div>
        <div class="artist-hero__veil"></div>

        <div class="artist-hero__cover-shell">
          <img
            class="artist-hero__cover"
            :src="artist.coverUrl || FALLBACK_COVER_URL"
            :alt="artist.name"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />
        </div>

        <div class="artist-hero__content">
          <div class="artist-hero__badges">
            <span class="artist-hero__badge artist-hero__badge--type">歌手</span>
            <span v-for="alias in displayAlias" :key="alias" class="artist-hero__badge">
              {{ alias }}
            </span>
          </div>

          <h1 class="artist-hero__title">{{ artist.name }}</h1>

          <p class="artist-hero__desc">{{ artistDescription }}</p>

          <div class="artist-hero__stats">
            <span>{{ artist.musicCount }} 首热门歌曲</span>
            <span>{{ artist.albumCount }} 张专辑</span>
            <span>{{ artist.mvCount }} 支 MV</span>
            <span>{{ formatCount(artist.followedCount) }} 人关注</span>
          </div>

          <div class="artist-hero__actions">
            <button class="artist-hero__action artist-hero__action--primary" type="button" @click="playAll">
              <Play :size="16" :stroke-width="2.25" />
              <span>播放全部</span>
            </button>
            <button class="artist-hero__action artist-hero__action--ghost" type="button" @click="playRandom">
              <Shuffle :size="16" :stroke-width="2.2" />
              <span>随机播放</span>
            </button>
            <button
              class="artist-hero__icon"
              :class="{ 'artist-hero__icon--active': isFollowed }"
              type="button"
              :title="isFollowed ? '取消关注' : '关注歌手'"
              @click="toggleFollowed"
            >
              <Heart :size="16" :stroke-width="2.2" />
            </button>
            <button class="artist-hero__icon" type="button" title="复制歌手链接" @click="shareArtist">
              <Share2 :size="16" :stroke-width="2.2" />
            </button>
          </div>

          <div v-if="actionHint" class="artist-hero__hint">{{ actionHint }}</div>
        </div>
      </header>

      <div class="artist-toolbar">
        <div class="artist-toolbar__tabs">
          <button
            class="artist-toolbar__tab"
            :class="{ 'artist-toolbar__tab--active': activePanel === 'songs' }"
            type="button"
            @click="switchPanel('songs')"
          >
            热门歌曲 {{ artist.songs.length }}
          </button>
          <button
            class="artist-toolbar__tab"
            :class="{ 'artist-toolbar__tab--active': activePanel === 'albums' }"
            type="button"
            @click="switchPanel('albums')"
          >
            专辑 {{ artist.albumCount }}
          </button>
          <button
            class="artist-toolbar__tab"
            :class="{ 'artist-toolbar__tab--active': activePanel === 'mvs' }"
            type="button"
            @click="switchPanel('mvs')"
          >
            MV {{ artist.mvCount }}
          </button>
        </div>
        <div class="artist-toolbar__sort">
          {{
            activePanel === 'songs'
              ? '默认排序'
              : activePanel === 'albums'
                ? '点击专辑卡片查看详情'
                : '点击 MV 卡片直接播放'
          }}
        </div>
      </div>

      <section v-if="activePanel === 'songs'" class="artist-table">
        <div class="artist-table__row artist-table__row--head">
          <div class="artist-table__cell artist-table__cell--rank">#</div>
          <div class="artist-table__cell">歌曲</div>
          <div class="artist-table__cell artist-table__cell--artist">歌手</div>
          <div class="artist-table__cell artist-table__cell--album">专辑</div>
          <div class="artist-table__cell artist-table__cell--numeric">时长</div>
          <div class="artist-table__cell artist-table__cell--actions">操作</div>
        </div>

        <div v-if="artist.songs.length === 0" class="artist-table__empty">
          这个歌手暂时还没有可展示的歌曲。
        </div>

        <div v-else class="artist-table__body">
          <article
            v-for="(song, index) in artist.songs"
            :key="song.id"
            class="artist-table__row artist-table__row--interactive"
            :class="{
              'artist-table__row--active': currentTrackId === song.id,
              'artist-table__row--disabled': song.playable === false,
            }"
            :tabindex="song.playable === false ? -1 : 0"
            role="button"
            :aria-disabled="song.playable === false"
            @click="handleTrackSelect(song)"
            @keydown.enter.prevent="handleTrackSelect(song)"
            @keydown.space.prevent="handleTrackSelect(song)"
          >
            <div class="artist-table__cell artist-table__cell--rank">
              <span v-if="currentTrackId !== song.id">{{ index + 1 }}</span>
              <span v-else class="artist-table__equalizer" :class="{ 'artist-table__equalizer--paused': !isPlaying }">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>

            <div class="artist-table__cell">
              <div class="artist-table__main">
                <img
                  class="artist-table__cover"
                  :src="song.coverUrl || artist.coverUrl || FALLBACK_COVER_URL"
                  :alt="song.name"
                  referrerpolicy="no-referrer"
                  @error="handleCoverError"
                />
                <div class="artist-table__copy">
                  <div class="artist-table__title">{{ song.name }}</div>
                  <div class="artist-table__sub artist-table__sub--mobile">
                    {{ song.artistNames.join(' / ') || '未知歌手' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="artist-table__cell artist-table__cell--artist">
              {{ song.artistNames.join(' / ') || '未知歌手' }}
            </div>
            <div class="artist-table__cell artist-table__cell--album">{{ song.albumName }}</div>
            <div class="artist-table__cell artist-table__cell--numeric">
              {{ formatDurationMs(song.duration) }}
            </div>
            <div class="artist-table__cell artist-table__cell--actions">
              <button
                class="artist-table__action"
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

      <section v-else-if="activePanel === 'mvs'" class="artist-section">
        <div class="artist-section__head">
          <div>
            <div class="artist-section__eyebrow">MV</div>
            <h2>热门 MV</h2>
          </div>
        </div>
        <div v-if="artist.mvs.length > 0" class="artist-mv-grid">
          <button
            v-for="mv in artist.mvs"
            :key="mv.id"
            class="artist-mv-card"
            type="button"
            @click="openMv(mv)"
          >
            <div class="artist-mv-card__cover-wrap">
              <img
                class="artist-mv-card__cover"
                :src="mv.coverUrl || artist.coverUrl || FALLBACK_COVER_URL"
                :alt="mv.title"
                referrerpolicy="no-referrer"
                @error="handleCoverError"
              />
              <span class="artist-mv-card__play">
                <Play :size="14" :stroke-width="2.1" />
              </span>
            </div>
            <div class="artist-mv-card__title">{{ mv.title }}</div>
            <div class="artist-mv-card__meta">
              <span>{{ formatDurationMs(mv.duration) }}</span>
              <span>{{ formatCount(mv.playCount) }} 播放</span>
            </div>
          </button>
        </div>
        <div v-else class="artist-section__empty">这个歌手暂时还没有可展示的 MV。</div>
      </section>

      <section v-else class="artist-section">
        <div class="artist-section__head">
          <div>
            <div class="artist-section__eyebrow">Albums</div>
            <h2>热门专辑</h2>
          </div>
        </div>
        <div v-if="artist.albums.length > 0" class="artist-album-grid">
          <button
            v-for="item in artist.albums"
            :key="item.id"
            class="artist-album-card"
            type="button"
            @click="openAlbum(item.id)"
          >
            <img
              class="artist-album-card__cover"
              :src="item.coverUrl || artist.coverUrl || FALLBACK_COVER_URL"
              :alt="item.title"
              referrerpolicy="no-referrer"
              @error="handleCoverError"
            />
            <div class="artist-album-card__title">{{ item.title }}</div>
            <div class="artist-album-card__meta">
              <span>{{ item.publishYear || '未标注年份' }}</span>
              <span v-if="item.trackCount">{{ item.trackCount }} 首</span>
            </div>
          </button>
        </div>
        <div v-else class="artist-section__empty">这个歌手暂时还没有可展示的专辑。</div>
      </section>
    </template>

    <MvPlayerDialog v-model="playerVisible" :mv="activeMv" />
    <SongCommentsDialog v-model="songCommentsVisible" :song="activeSong" />
  </section>
</template>

<style scoped lang="scss">
.artist-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-width: 0;
  padding-bottom: 12px;
}

.artist-detail__state {
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

.artist-detail__state--error {
  color: #ffd7e4;
}

.artist-hero {
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

.artist-hero__backdrop,
.artist-hero__veil {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.artist-hero__backdrop {
  background-position: center;
  background-size: cover;
  filter: blur(44px) saturate(1.18);
  transform: scale(1.16);
  opacity: 0.38;
}

.artist-hero__veil {
  background:
    radial-gradient(circle at 50% 8%, rgba(148, 178, 255, 0.24), transparent 32%),
    radial-gradient(circle at 18% 76%, rgba(161, 255, 138, 0.11), transparent 22%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08), transparent 22%, transparent 78%, rgba(255, 255, 255, 0.04));
}

.artist-hero__cover-shell,
.artist-hero__content {
  position: relative;
  z-index: 1;
}

.artist-hero__cover-shell {
  width: 216px;
  min-width: 0;
}

.artist-hero__cover {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 18px 36px rgba(9, 7, 31, 0.34);
}

.artist-hero__content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.artist-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.artist-hero__badge {
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

.artist-hero__badge--type {
  background: rgba(255, 83, 176, 0.18);
  color: #ffd0e7;
}

.artist-hero__title {
  margin: 14px 0 12px;
  color: rgba(251, 250, 255, 0.98);
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1.14;
  letter-spacing: -0.03em;
}

.artist-hero__desc {
  display: -webkit-box;
  overflow: hidden;
  margin: 0 0 18px;
  max-width: 960px;
  color: rgba(239, 241, 255, 0.68);
  font-size: 13px;
  line-height: 1.8;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.artist-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: rgba(235, 240, 255, 0.78);
  font-size: 13px;
}

.artist-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.artist-hero__action,
.artist-hero__icon {
  border: 0;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.artist-hero__action:hover,
.artist-hero__icon:hover {
  transform: translateY(-1px);
}

.artist-hero__action {
  height: 44px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
}

.artist-hero__action--primary {
  background: linear-gradient(90deg, #ff43a9, #ff6ca2);
  box-shadow: 0 12px 22px rgba(255, 72, 167, 0.26);
}

.artist-hero__action--ghost {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(248, 250, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.artist-hero__icon {
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

.artist-hero__icon--active {
  background: rgba(255, 83, 176, 0.18);
  color: #ff8ac5;
}

.artist-hero__hint {
  margin-top: 14px;
  color: rgba(255, 214, 235, 0.88);
  font-size: 12px;
}

.artist-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
}

.artist-toolbar__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  min-width: 0;
}

.artist-toolbar__tab {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: rgba(234, 239, 255, 0.56);
  font-size: 13px;
  transition: color 180ms ease;
}

.artist-toolbar__tab:hover {
  color: rgba(243, 246, 255, 0.8);
}

.artist-toolbar__tab--active {
  color: rgba(250, 251, 255, 0.96);
  font-weight: 600;
}

.artist-toolbar__sort {
  color: rgba(228, 234, 255, 0.52);
  font-size: 12px;
}

.artist-table {
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

.artist-table__row {
  display: grid;
  grid-template-columns: 42px minmax(280px, 1.9fr) minmax(180px, 1.1fr) minmax(180px, 1fr) 72px 78px;
  align-items: center;
  gap: 16px;
  min-height: 62px;
  padding: 0 20px;
}

.artist-table__row--head {
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

.artist-table__body .artist-table__row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(246, 248, 255, 0.9);
}

.artist-table__body .artist-table__row:last-child {
  border-bottom: 0;
}

.artist-table__row--interactive {
  cursor: pointer;
  transition:
    background 180ms ease,
    box-shadow 180ms ease;
}

.artist-table__row--interactive:hover {
  background: rgba(255, 255, 255, 0.05);
}

.artist-table__row--interactive:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.artist-table__row--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08)),
    rgba(255, 255, 255, 0.04);
}

.artist-table__row--disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.artist-table__cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-table__cell--rank,
.artist-table__cell--numeric {
  color: rgba(235, 240, 255, 0.56);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.artist-table__cell--numeric {
  text-align: right;
}

.artist-table__cell--actions {
  display: flex;
  justify-content: flex-end;
}

.artist-table__main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.artist-table__cover {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}

.artist-table__copy {
  min-width: 0;
}

.artist-table__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(250, 252, 255, 0.96);
  font-size: 14px;
  font-weight: 600;
}

.artist-table__sub,
.artist-table__cell--artist,
.artist-table__cell--album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.artist-table__sub {
  margin-top: 4px;
}

.artist-table__sub--mobile {
  display: none;
}

.artist-table__action {
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

.artist-table__action:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
}

.artist-table__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #ff72bb;
}

.artist-table__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.artist-table__equalizer span:nth-child(1) {
  height: 7px;
}

.artist-table__equalizer span:nth-child(2) {
  height: 13px;
  animation-delay: 0.18s;
}

.artist-table__equalizer span:nth-child(3) {
  height: 9px;
  animation-delay: 0.34s;
}

.artist-table__equalizer--paused span {
  height: 10px;
  animation: none;
}

.artist-table__empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  padding: 24px;
  color: rgba(234, 239, 255, 0.54);
  text-align: center;
}

.artist-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.artist-section__empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px solid rgba(196, 189, 255, 0.14);
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 60%, rgba(113, 255, 131, 0.08), transparent 20%),
    radial-gradient(circle at 52% 18%, rgba(192, 81, 255, 0.12), transparent 20%),
    linear-gradient(135deg, rgba(24, 21, 56, 0.88), rgba(12, 11, 42, 0.94));
  color: rgba(234, 239, 255, 0.54);
  text-align: center;
}

.artist-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
}

.artist-section__head h2 {
  margin: 4px 0 0;
  color: rgba(248, 250, 255, 0.96);
  font-size: 20px;
}

.artist-section__eyebrow {
  color: rgba(214, 222, 255, 0.5);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.artist-mv-grid,
.artist-album-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.artist-mv-card,
.artist-album-card {
  min-width: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 180ms ease;
}

.artist-mv-card:hover,
.artist-mv-card:focus-visible,
.artist-album-card:hover,
.artist-album-card:focus-visible {
  transform: translateY(-2px);
  outline: none;
}

.artist-mv-card__cover-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  aspect-ratio: 16 / 9;
  background: rgba(255, 255, 255, 0.08);
}

.artist-mv-card__cover,
.artist-album-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artist-mv-card__play {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(10, 12, 26, 0.62);
  color: #fff;
  backdrop-filter: blur(12px);
}

.artist-mv-card__title,
.artist-album-card__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(250, 252, 255, 0.96);
  font-size: 14px;
  font-weight: 600;
}

.artist-mv-card__meta,
.artist-album-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.artist-album-card__cover {
  aspect-ratio: 1;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
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
  .artist-hero {
    grid-template-columns: 188px minmax(0, 1fr);
    gap: 24px;
    padding: 24px;
  }

  .artist-hero__cover-shell {
    width: 188px;
  }

  .artist-table__row {
    grid-template-columns: 38px minmax(240px, 1.7fr) minmax(150px, 1fr) minmax(140px, 0.9fr) 66px 72px;
  }
}

@media (max-width: 900px) {
  .artist-hero {
    grid-template-columns: 1fr;
  }

  .artist-hero__cover-shell {
    width: min(220px, 100%);
  }

  .artist-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .artist-table__row {
    grid-template-columns: 34px minmax(0, 1.7fr) minmax(0, 1fr) 64px 68px;
  }

  .artist-table__cell--album {
    display: none;
  }

  .artist-mv-grid,
  .artist-album-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .artist-detail {
    gap: 16px;
  }

  .artist-hero {
    padding: 20px;
    border-radius: 28px;
  }

  .artist-hero__title {
    font-size: 26px;
  }

  .artist-table {
    border-radius: 24px;
  }

  .artist-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 60px 60px;
    gap: 12px;
    padding: 0 14px;
  }

  .artist-table__cell--artist {
    display: none;
  }

  .artist-table__sub--mobile {
    display: block;
  }

  .artist-section__head h2 {
    font-size: 18px;
  }
}

@media (max-width: 560px) {
  .artist-hero__actions {
    gap: 10px;
  }

  .artist-hero__action {
    height: 42px;
    padding: 0 16px;
  }

  .artist-table__cell--numeric {
    display: none;
  }

  .artist-table__row {
    grid-template-columns: 26px minmax(0, 1fr) 48px;
  }

  .artist-mv-grid,
  .artist-album-grid {
    grid-template-columns: 1fr;
  }
}
</style>
