<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Clock3, LogIn, Play, Trash2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import type { SongCommentSeed } from '@/api/comment'
import { getRecentPlaybackSongs } from '@/api/player'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { usePlayerStore, type PlayerTrack, type RecentPlayerTrack } from '@/stores/player'
import type { ArtistRef } from '@/types/music'
import { resolveAlbumRoute } from '@/utils/albumRoute'
import { buildArtistRoute } from '@/utils/artistRoute'
import RecentTrackRow from './components/RecentTrackRow.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const libraryStore = useMusicLibraryStore()
const playerStore = usePlayerStore()

const { currentIndex, currentTimeSeconds, currentTrack, queue } = storeToRefs(playerStore)
const { initialized, loggedIn, profile } = storeToRefs(authStore)

const remoteTracks = ref<RecentPlayerTrack[]>([])
const isLoading = ref(false)
const loadError = ref('')
const dismissedTrackMap = ref<Record<string, number>>({})
const activeSource = ref<'cloud' | 'queue'>('queue')
const isImmersivePage = computed(() => route.name === 'mini-player')
const activeSong = ref<SongCommentSeed | null>(null)
const songCommentsVisible = ref(false)

const RECENT_DISMISSED_STORAGE_KEY = 'your-music:recent-dismissed:v1'
const MAX_DISMISSED_TRACKS = 500

type RecentDismissedPayload = Record<string, Record<string, number>>

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readDismissedPayload(): RecentDismissedPayload {
  if (!canUseStorage()) {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(RECENT_DISMISSED_STORAGE_KEY)

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as RecentDismissedPayload
      : {}
  } catch {
    return {}
  }
}

function normalizeDismissedMap(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([trackId, dismissedAt]) => [trackId, Number(dismissedAt)])
      .filter(([trackId, dismissedAt]) => trackId && Number.isFinite(dismissedAt)),
  )
}

function writeDismissedPayload(payload: RecentDismissedPayload) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(RECENT_DISMISSED_STORAGE_KEY, JSON.stringify(payload))
}

const recentDismissedUserKey = computed(() =>
  loggedIn.value && profile.value?.userId ? `user:${profile.value.userId}` : 'guest',
)

function loadDismissedTrackMap() {
  const payload = readDismissedPayload()

  dismissedTrackMap.value = normalizeDismissedMap(payload[recentDismissedUserKey.value])
}

function persistDismissedTrackMap() {
  const payload = readDismissedPayload()
  const sortedEntries = Object.entries(dismissedTrackMap.value)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_DISMISSED_TRACKS)

  dismissedTrackMap.value = Object.fromEntries(sortedEntries)
  payload[recentDismissedUserKey.value] = dismissedTrackMap.value
  writeDismissedPayload(payload)
}

function isTrackDismissed(track: RecentPlayerTrack) {
  const dismissedAt = dismissedTrackMap.value[track.id]

  if (!dismissedAt) {
    return false
  }

  if (activeSource.value === 'cloud' && track.lastPlayedAt > dismissedAt) {
    return false
  }

  return true
}

function trackSeed(id: string) {
  return Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0)
}

function formatTotalDuration(tracks: RecentPlayerTrack[]) {
  const totalMinutes = Math.max(
    Math.round(
      tracks.reduce((sum, track) => sum + (track.durationMs ?? 0), 0) / 1000 / 60,
    ),
    0,
  )

  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return minutes > 0 ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`
}

function buildFallbackOrder(tracks: PlayerTrack[], activeIndex: number) {
  if (!tracks.length) {
    return []
  }

  if (activeIndex >= 0 && activeIndex < tracks.length) {
    return [
      tracks[activeIndex],
      ...tracks.slice(0, activeIndex).reverse(),
      ...tracks.slice(activeIndex + 1),
    ]
  }

  return [...tracks].reverse()
}

function toPlayerTrack(track: RecentPlayerTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artists: track.artists?.map((artist) => ({ ...artist })),
    albumId: track.albumId,
    album: track.album,
    coverUrl: track.coverUrl,
    duration: track.duration,
    durationMs: track.durationMs,
    audioUrl: track.audioUrl,
    sourceMeta: track.sourceMeta,
    sourceExpiresAt: track.sourceExpiresAt,
  }
}

const fallbackTracks = computed<RecentPlayerTrack[]>(() => {
  const now = Date.now()
  const orderedQueue = buildFallbackOrder(queue.value, currentIndex.value)

  return orderedQueue.map((track, index) => {
    const seed = trackSeed(track.id || String(index + 1))
    const durationSeconds = track.durationMs ? track.durationMs / 1000 : 0
    const progressRatio = ((seed % 54) + 18) / 100
    const syntheticResumeSeconds =
      durationSeconds > 0
        ? Math.min(Math.round(durationSeconds * progressRatio), Math.max(Math.round(durationSeconds) - 8, 0))
        : 0

    return {
      ...track,
      album: track.album || '单曲收藏',
      isFavorite: libraryStore.isFavorite(track.id),
      lastPlayedAt: now - index * 18 * 60 * 1000,
      lastTimeSeconds: currentTrack.value?.id === track.id ? currentTimeSeconds.value : syntheticResumeSeconds,
      playCount: Math.max(1, 7 - Math.floor(index / 3)) + (seed % 4),
    }
  })
})

const baseTracks = computed(() => (remoteTracks.value.length ? remoteTracks.value : fallbackTracks.value))

const visibleTracks = computed(() => {
  return baseTracks.value
    .filter((track) => !isTrackDismissed(track))
    .map((track) => ({
      ...track,
      isFavorite: libraryStore.isFavorite(track.id),
    }))
})

const sourceCopy = computed(() => {
  if (!loggedIn.value) {
    return '未登录，当前展示的是本地播放队列。'
  }

  if (activeSource.value === 'cloud') {
    return '已同步云端最近播放记录。'
  }

  return '云端最近播放暂时不可用，已回退到本地播放队列。'
})
const totalDurationLabel = computed(() => formatTotalDuration(visibleTracks.value))
const currentTrackCount = computed(() => (currentTrack.value ? 1 : 0))
const hasTracks = computed(() => visibleTracks.value.length > 0)
const surfaceNotice = computed(() => {
  if (!loadError.value) {
    return ''
  }

  return activeSource.value === 'cloud' || fallbackTracks.value.length === 0
    ? loadError.value
    : `${loadError.value}，已切换到本地播放队列。`
})

async function loadRecentTracks() {
  if (!loggedIn.value) {
    remoteTracks.value = []
    activeSource.value = 'queue'
    loadError.value = ''
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const tracks = await getRecentPlaybackSongs(40)

    remoteTracks.value = tracks.map((track) => ({
      ...track,
      album: track.album || '单曲收藏',
      isFavorite: libraryStore.isFavorite(track.id),
    }))
    activeSource.value = remoteTracks.value.length ? 'cloud' : 'queue'
  } catch (error) {
    remoteTracks.value = []
    activeSource.value = 'queue'
    loadError.value = error instanceof Error ? error.message : '最近播放加载失败'
  } finally {
    isLoading.value = false
  }
}

function handleToggleFavorite(trackId: string) {
  const targetTrack = visibleTracks.value.find((track) => track.id === trackId)

  if (!targetTrack) {
    return
  }

  libraryStore.toggleFavorite(toPlayerTrack(targetTrack))
}

function handleRemoveTrack(trackId: string) {
  if (dismissedTrackMap.value[trackId]) {
    return
  }

  dismissedTrackMap.value = {
    ...dismissedTrackMap.value,
    [trackId]: Date.now(),
  }
  persistDismissedTrackMap()
}

function handleClearTracks() {
  const dismissedAt = Date.now()

  dismissedTrackMap.value = {
    ...dismissedTrackMap.value,
    ...Object.fromEntries(visibleTracks.value.map((track) => [track.id, dismissedAt])),
  }
  persistDismissedTrackMap()
}

function handleOpenArtist(artist: ArtistRef) {
  const targetRoute = buildArtistRoute(artist)

  if (!targetRoute) {
    return
  }

  void router.push(targetRoute)
}

async function handleOpenAlbum(track: RecentPlayerTrack) {
  const targetRoute = await resolveAlbumRoute({
    id: track.id,
    albumId: track.albumId,
    albumName: track.album,
  })

  if (!targetRoute) {
    return
  }

  await router.push(targetRoute)
}

function handlePlayNext(track: RecentPlayerTrack) {
  void playerStore.enqueueNextTrack(toPlayerTrack(track))
}

function handleDownloadTrack(track: RecentPlayerTrack) {
  libraryStore.addLocalTrack(toPlayerTrack(track))
}

function handleShowComments(track: RecentPlayerTrack) {
  activeSong.value = {
    id: track.id,
    title: track.title,
    artistNames: track.artists?.map((artist) => artist.name).filter(Boolean) ?? [track.artist],
    albumName: track.album,
    coverUrl: track.coverUrl,
    duration: track.durationMs,
  }
  songCommentsVisible.value = true
}

async function handlePlayAll() {
  if (!hasTracks.value) {
    return
  }

  await playerStore.playQueue(visibleTracks.value.map(toPlayerTrack), 0)
}

async function handleResumeTrack(track: RecentPlayerTrack) {
  const queueTracks = visibleTracks.value.map(toPlayerTrack)
  const targetIndex = visibleTracks.value.findIndex((item) => item.id === track.id)

  if (targetIndex < 0) {
    return
  }

  await playerStore.playQueue(queueTracks, targetIndex, {
    startTimeSeconds: track.lastTimeSeconds,
  })
}

watch(
  [initialized, loggedIn],
  ([ready, isLoggedIn]) => {
    if (!ready) {
      return
    }

    loadDismissedTrackMap()

    if (isLoggedIn) {
      void loadRecentTracks()
      return
    }

    remoteTracks.value = []
    activeSource.value = 'queue'
    loadError.value = ''
  },
  { immediate: true },
)

watch(
  () => route.name,
  (routeName) => {
    if (routeName === 'mini-player') {
      if (currentTrack.value) {
        playerStore.openDetail()
      }
      return
    }

    playerStore.closeDetail()
  },
  { immediate: true },
)

watch(
  () => currentTrack.value?.id,
  (trackId) => {
    if (isImmersivePage.value && trackId) {
      playerStore.openDetail()
    }
  },
)

onBeforeUnmount(() => {
  if (isImmersivePage.value) {
    playerStore.closeDetail()
  }
})
</script>

<template>
  <section class="recent-page" :class="{ 'recent-page--immersive': isImmersivePage }">
    <div class="recent-shell" :class="{ 'recent-shell--immersive': isImmersivePage }">
      <span class="recent-shell__glow recent-shell__glow--pink"></span>
      <span class="recent-shell__glow recent-shell__glow--blue"></span>

      <header class="recent-toolbar">
        <div class="recent-toolbar__group">
          <div class="recent-chip recent-chip--active">
            <Play class="recent-chip__icon" :stroke-width="2" />
            <span>播放列表</span>
            <strong>{{ visibleTracks.length }}</strong>
          </div>
          <div class="recent-chip">
            <Clock3 class="recent-chip__icon" :stroke-width="2" />
            <span>最近播放</span>
            <strong>{{ currentTrackCount }}</strong>
          </div>
        </div>

        <div class="recent-toolbar__group recent-toolbar__group--actions">
          <button class="recent-action recent-action--ghost" type="button" :disabled="!hasTracks" @click="handleClearTracks">
            <Trash2 class="recent-action__icon" :stroke-width="1.8" />
            <span>清空</span>
          </button>
          <button class="recent-action recent-action--primary" type="button" :disabled="!hasTracks" @click="handlePlayAll">
            <Play class="recent-action__icon" :stroke-width="1.8" />
            <span>播放全部</span>
          </button>
        </div>
      </header>

      <div class="recent-meta">
        <p class="recent-meta__text">
          <span>{{ sourceCopy }}</span>
          <span class="recent-meta__dot"></span>
          <span>总时长 {{ totalDurationLabel }}</span>
        </p>
        <button
          v-if="!loggedIn"
          class="recent-meta__login"
          type="button"
          @click="authStore.openLoginDialog('qr')"
        >
          <LogIn class="recent-action__icon" :stroke-width="1.8" />
          <span>登录同步</span>
        </button>
      </div>

      <section class="recent-board">
        <div class="recent-board__header">
          <span>#</span>
          <span>歌曲</span>
          <span>歌手</span>
          <span>专辑</span>
          <span>时长</span>
          <span>操作</span>
        </div>

        <div class="recent-board__body">
          <div v-if="isLoading && !hasTracks" class="recent-state">正在同步最近播放...</div>
          <div v-else-if="!hasTracks" class="recent-state">这里还没有最近播放记录，先去点几首歌试试。</div>

          <RecentTrackRow
            v-for="(track, index) in visibleTracks"
            :key="track.id"
            :index="index"
            :track="track"
            :is-current="track.id === currentTrack?.id"
            @download-track="handleDownloadTrack"
            @open-album="handleOpenAlbum"
            @play-next="handlePlayNext"
            @remove-track="handleRemoveTrack"
            @resume-track="handleResumeTrack"
            @show-comments="handleShowComments"
            @toggle-favorite="handleToggleFavorite"
            @open-artist="handleOpenArtist"
          />
        </div>
      </section>

      <p v-if="surfaceNotice" class="recent-notice">{{ surfaceNotice }}</p>
    </div>

    <SongCommentsDialog v-model="songCommentsVisible" :song="activeSong" />
  </section>
</template>

<style scoped lang="scss">
.recent-page {
  min-height: 0;
  height: 100%;
  display: flex;
  color: #fff;
}

.recent-page--immersive {
  min-height: 100dvh;
}

.recent-shell,
.recent-board {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  backdrop-filter: blur(24px);
}

.recent-shell {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  padding: 10px 10px 12px;
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(90deg, rgba(177, 55, 230, 0.96) 0%, rgba(89, 28, 152, 0.96) 23%, rgba(36, 18, 107, 0.98) 58%, rgba(15, 14, 61, 0.99) 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 20px 38px rgba(9, 7, 32, 0.18);
}

.recent-shell--immersive {
  border-radius: 0;
  padding: 20px 24px;
  background: var(--app-panel-bg);
  box-shadow: none;
}

.recent-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 22%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.03));
  pointer-events: none;
}

.recent-shell__glow {
  position: absolute;
  width: 280px;
  height: 160px;
  border-radius: 999px;
  filter: blur(64px);
  opacity: 0.34;
  pointer-events: none;
}

.recent-shell__glow--pink {
  top: -54px;
  left: 14%;
  background: rgba(255, 76, 230, 0.72);
}

.recent-shell__glow--blue {
  left: 38%;
  bottom: -38px;
  width: 360px;
  background: rgba(41, 181, 255, 0.42);
}

.recent-toolbar,
.recent-meta,
.recent-board,
.recent-notice {
  position: relative;
  z-index: 1;
}

.recent-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 4px 4px 0;
}

.recent-toolbar__group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.recent-toolbar__group--actions {
  margin-left: auto;
}

.recent-chip,
.recent-action,
.recent-badge,
.recent-sort__tab {
  border: 0;
  font: inherit;
}

.recent-chip {
  min-height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  background: rgba(12, 12, 40, 0.28);
  color: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  font-size: 11px;
}

.recent-chip--active {
  background: linear-gradient(180deg, rgba(255, 104, 208, 0.96), rgba(216, 88, 239, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 20px rgba(245, 90, 213, 0.16);
}

.recent-chip strong {
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 10px;
}

.recent-chip__icon,
.recent-action__icon,
.recent-meta__login svg {
  width: 12px;
  height: 12px;
  flex: none;
}

.recent-action {
  min-height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease,
    opacity 180ms ease;
  font-size: 11px;
}

.recent-action:disabled,
.recent-meta__login:disabled {
  cursor: not-allowed;
  opacity: 0.54;
}

.recent-action:not(:disabled):hover,
.recent-meta__login:not(:disabled):hover {
  transform: translateY(-1px);
}

.recent-action--ghost {
  background: rgba(9, 10, 34, 0.34);
  color: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.recent-action--primary {
  background: linear-gradient(180deg, rgba(255, 104, 207, 0.96), rgba(181, 72, 244, 0.88));
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 22px rgba(248, 91, 212, 0.18);
}

.recent-meta {
  margin: 8px 4px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.recent-meta__text {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: rgba(225, 232, 255, 0.54);
  font-size: 11px;
}

.recent-meta__dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
}

.recent-meta__login {
  min-height: 24px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: rgba(9, 10, 34, 0.34);
  color: rgba(255, 255, 255, 0.76);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  transition:
    transform 180ms ease,
    background 180ms ease,
    opacity 180ms ease;
  font-size: 11px;
}

.recent-notice {
  margin: 10px 4px 0;
  color: rgba(255, 218, 232, 0.74);
  font-size: 12px;
}

.recent-board {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background:
    radial-gradient(circle at 14% 8%, rgba(245, 85, 205, 0.08), transparent 24%),
    radial-gradient(circle at 54% 100%, rgba(44, 190, 255, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(7, 9, 34, 0.9), rgba(6, 8, 30, 0.82));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 10px 24px rgba(6, 8, 28, 0.12);
}

.recent-board__header {
  display: grid;
  grid-template-columns: 38px minmax(0, 2.5fr) minmax(0, 1.65fr) minmax(0, 1.6fr) 74px 202px;
  gap: 14px;
  padding: 12px 18px 10px;
  color: rgba(228, 235, 255, 0.42);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.recent-board__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 4px 0 10px;
  overflow: auto;
}

.recent-board__body::-webkit-scrollbar {
  width: 10px;
}

.recent-board__body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

.recent-state {
  min-height: 240px;
  padding: 0 24px;
  display: grid;
  place-items: center;
  color: rgba(231, 236, 255, 0.62);
  font-size: 14px;
  text-align: center;
}

@media (max-width: 960px) {
  .recent-board__header {
    grid-template-columns: 34px minmax(0, 2.2fr) minmax(0, 1.2fr) 74px 184px;
  }

  .recent-board__header span:nth-child(4) {
    display: none;
  }
}

@media (max-width: 720px) {
  .recent-shell {
    min-height: calc(100vh - 156px);
    height: auto;
    padding: 10px;
  }

  .recent-meta {
    margin-bottom: 10px;
  }

  .recent-board__header {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .recent-board__header span:nth-child(1),
  .recent-board__header span:nth-child(3),
  .recent-board__header span:nth-child(4) {
    display: none;
  }

  .recent-board__header span:nth-child(5),
  .recent-board__header span:nth-child(6) {
    justify-self: end;
  }
}

@media (max-width: 960px) {
  .recent-page {
    min-height: 100%;
    height: auto;
    display: block;
    padding-bottom: 10px;
  }

  .recent-shell {
    min-height: calc(100vh - 176px);
    height: auto;
  }
}

@media (max-width: 560px) {
  .recent-toolbar__group--actions,
  .recent-meta {
    width: 100%;
  }

  .recent-action,
  .recent-meta__login {
    flex: 1 1 auto;
    justify-content: center;
  }

  .recent-board__header {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .recent-board__header span:nth-child(5),
  .recent-board__header span:nth-child(6) {
    display: none;
  }
}
</style>
