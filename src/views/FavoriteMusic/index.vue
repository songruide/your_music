<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Heart, Play, Trash2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useMusicLibraryStore, type LocalMusicTrack } from '@/stores/musicLibrary'
import { usePlayerStore, type PlayerTrack } from '@/stores/player'
import RecentTrackRow from '@/views/MiniPlayer/components/RecentTrackRow.vue'

const authStore = useAuthStore()
const libraryStore = useMusicLibraryStore()
const playerStore = usePlayerStore()

const { favoriteCollection } = storeToRefs(libraryStore)
const { displayName, loggedIn } = storeToRefs(authStore)
const { currentTrack } = storeToRefs(playerStore)

const visibleTracks = computed<LocalMusicTrack[]>(() =>
  favoriteCollection.value.map((track) => ({
    ...track,
    isFavorite: true,
  })),
)
const hasTracks = computed(() => visibleTracks.value.length > 0)
const favoriteCount = computed(() => visibleTracks.value.length)
const totalDurationLabel = computed(() => formatTotalDuration(visibleTracks.value))
const collectionCopy = computed(() =>
  loggedIn.value
    ? `${displayName.value} 的收藏歌曲会单独保存。`
    : '未登录时会保存到本机访客库，登录后会切换到对应账号。',
)

function formatTotalDuration(tracks: LocalMusicTrack[]) {
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

function toPlayerTrack(track: LocalMusicTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artists: track.artists?.map((artist) => ({ ...artist })),
    album: track.album,
    coverUrl: track.coverUrl,
    duration: track.duration,
    durationMs: track.durationMs,
    audioUrl: track.audioUrl,
    sourceMeta: track.sourceMeta,
    sourceExpiresAt: track.sourceExpiresAt,
  }
}

async function handlePlayAll() {
  if (!hasTracks.value) {
    return
  }

  await playerStore.playQueue(visibleTracks.value.map(toPlayerTrack), 0)
}

async function handleResumeTrack(track: LocalMusicTrack) {
  const queueTracks = visibleTracks.value.map(toPlayerTrack)
  const targetIndex = visibleTracks.value.findIndex((item) => item.id === track.id)

  if (targetIndex < 0) {
    return
  }

  await playerStore.playQueue(queueTracks, targetIndex, {
    startTimeSeconds: track.lastTimeSeconds,
  })
  libraryStore.markLocalTrackPlayed(track.id, track.lastTimeSeconds)
}

function handleToggleFavorite(trackId: string) {
  const targetTrack = visibleTracks.value.find((track) => track.id === trackId)

  if (!targetTrack) {
    return
  }

  libraryStore.toggleFavorite(targetTrack)
}

function handleRemoveTrack(trackId: string) {
  const targetTrack = visibleTracks.value.find((track) => track.id === trackId)

  if (!targetTrack) {
    return
  }

  libraryStore.toggleFavorite(targetTrack)
}
</script>

<template>
  <section class="local-page">
    <div class="local-shell">
      <span class="local-shell__glow local-shell__glow--pink"></span>
      <span class="local-shell__glow local-shell__glow--blue"></span>

      <header class="local-toolbar">
        <div class="local-toolbar__group">
          <div class="local-chip local-chip--active">
            <Heart class="local-chip__icon" :stroke-width="2" />
            <span>收藏音乐</span>
            <strong>{{ favoriteCount }}</strong>
          </div>
        </div>

        <div class="local-toolbar__group local-toolbar__group--actions">
          <button class="local-action local-action--ghost" type="button" :disabled="!hasTracks" @click="libraryStore.clearFavoriteTracks">
            <Trash2 class="local-action__icon" :stroke-width="1.8" />
            <span>清空</span>
          </button>
          <button class="local-action local-action--primary" type="button" :disabled="!hasTracks" @click="handlePlayAll">
            <Play class="local-action__icon" :stroke-width="1.8" />
            <span>播放全部</span>
          </button>
        </div>
      </header>

      <div class="local-meta">
        <p class="local-meta__text">
          <Heart class="local-meta__icon" :stroke-width="1.8" />
          <span>收藏的歌曲会收进这里。</span>
          <span class="local-meta__dot"></span>
          <span>{{ collectionCopy }}</span>
          <span class="local-meta__dot"></span>
          <span>总时长 {{ totalDurationLabel }}</span>
        </p>
      </div>

      <section class="local-board">
        <div class="local-board__header">
          <span>#</span>
          <span>歌曲</span>
          <span>歌手</span>
          <span>专辑</span>
          <span>时长</span>
          <span>操作</span>
        </div>

        <div class="local-board__body">
          <div v-if="!hasTracks" class="local-state">
            <Heart class="local-state__icon" :stroke-width="1.7" />
            <span>这里还没有收藏歌曲，先去点几首喜欢再回来。</span>
          </div>

          <RecentTrackRow
            v-for="(track, index) in visibleTracks"
            :key="track.id"
            :index="index"
            :track="track"
            :is-current="track.id === currentTrack?.id"
            @remove-track="handleRemoveTrack"
            @resume-track="handleResumeTrack"
            @toggle-favorite="handleToggleFavorite"
          />
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.local-page {
  min-height: 0;
  height: 100%;
  display: flex;
  color: #fff;
}

.local-shell,
.local-board {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  backdrop-filter: blur(24px);
}

.local-shell {
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

.local-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 22%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.03));
  pointer-events: none;
}

.local-shell__glow {
  position: absolute;
  width: 280px;
  height: 160px;
  border-radius: 999px;
  filter: blur(64px);
  opacity: 0.34;
  pointer-events: none;
}

.local-shell__glow--pink {
  top: -54px;
  left: 14%;
  background: rgba(255, 76, 230, 0.72);
}

.local-shell__glow--blue {
  left: 38%;
  bottom: -38px;
  width: 360px;
  background: rgba(41, 181, 255, 0.42);
}

.local-toolbar,
.local-meta,
.local-board {
  position: relative;
  z-index: 1;
}

.local-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 4px 4px 0;
}

.local-toolbar__group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.local-toolbar__group--actions {
  margin-left: auto;
}

.local-chip,
.local-action {
  border: 0;
  font: inherit;
}

.local-chip {
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

.local-chip--active {
  background: linear-gradient(180deg, rgba(255, 104, 208, 0.96), rgba(216, 88, 239, 0.88));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 20px rgba(245, 90, 213, 0.16);
}

.local-chip strong {
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

.local-chip__icon,
.local-action__icon,
.local-meta__icon {
  width: 12px;
  height: 12px;
  flex: none;
}

.local-action {
  min-height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
  font-size: 11px;
}

.local-action:disabled {
  cursor: not-allowed;
  opacity: 0.54;
}

.local-action:not(:disabled):hover {
  transform: translateY(-1px);
}

.local-action--ghost {
  background: rgba(9, 10, 34, 0.34);
  color: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.local-action--primary {
  background: linear-gradient(180deg, rgba(255, 104, 207, 0.96), rgba(181, 72, 244, 0.88));
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 10px 22px rgba(248, 91, 212, 0.18);
}

.local-meta {
  margin: 8px 4px 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.local-meta__text {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: rgba(225, 232, 255, 0.54);
  font-size: 11px;
}

.local-meta__dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
}

.local-board {
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

.local-board__header {
  display: grid;
  grid-template-columns: 38px minmax(0, 2.5fr) minmax(0, 1.65fr) minmax(0, 1.6fr) 74px 96px;
  gap: 14px;
  padding: 12px 18px 10px;
  color: rgba(228, 235, 255, 0.42);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.local-board__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 4px 0 10px;
  overflow: auto;
}

.local-board__body::-webkit-scrollbar {
  width: 10px;
}

.local-board__body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

.local-state {
  min-height: 240px;
  padding: 0 24px;
  display: grid;
  place-items: center;
  gap: 10px;
  color: rgba(231, 236, 255, 0.62);
  font-size: 14px;
  text-align: center;
}

.local-state__icon {
  width: 34px;
  height: 34px;
  color: rgba(255, 255, 255, 0.36);
}

@media (max-width: 960px) {
  .local-board__header {
    grid-template-columns: 34px minmax(0, 2.2fr) minmax(0, 1.2fr) 74px 92px;
  }

  .local-board__header span:nth-child(4) {
    display: none;
  }
}

@media (max-width: 720px) {
  .local-shell {
    min-height: calc(100vh - 156px);
    height: auto;
    padding: 10px;
  }

  .local-board__header {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .local-board__header span:nth-child(1),
  .local-board__header span:nth-child(3),
  .local-board__header span:nth-child(4) {
    display: none;
  }

  .local-board__header span:nth-child(5),
  .local-board__header span:nth-child(6) {
    justify-self: end;
  }
}

@media (max-width: 960px) {
  .local-page {
    min-height: 100%;
    height: auto;
    display: block;
    padding-bottom: 10px;
  }

  .local-shell {
    min-height: calc(100vh - 176px);
    height: auto;
  }
}

@media (max-width: 560px) {
  .local-toolbar__group--actions,
  .local-meta {
    width: 100%;
  }

  .local-action {
    flex: 1 1 auto;
    justify-content: center;
  }

  .local-board__header {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .local-board__header span:nth-child(5),
  .local-board__header span:nth-child(6) {
    display: none;
  }
}
</style>
