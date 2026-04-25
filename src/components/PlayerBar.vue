<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Download, Heart, ListMusic, MessageSquareText, Volume2, VolumeX } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { SongCommentSeed } from '@/api/comment'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { usePlayerStore } from '@/stores/player'
import type { ArtistRef } from '@/types/music'
import { getPlayerTrackArtists } from '@/utils/playerArtists'
import { buildSearchRoute } from '@/views/Search/utils'

const router = useRouter()
const playerStore = usePlayerStore()
const libraryStore = useMusicLibraryStore()
const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23f35bb4'/%3E%3Cstop offset='1' stop-color='%23508dff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='44' r='16' fill='rgba(255,255,255,.7)'/%3E%3Crect x='30' y='68' width='60' height='22' rx='11' fill='rgba(255,255,255,.46)'/%3E%3C/svg%3E"
const playerShellRef = ref<HTMLElement | null>(null)
const commentsVisible = ref(false)
const queuePanelVisible = ref(false)
const {
  currentIndex,
  currentTime,
  currentTrack,
  durationLabel,
  hasNext,
  hasPrevious,
  isLoading,
  isMuted,
  isPlaying,
  progressPercent,
  queue,
  volumePercent,
} = storeToRefs(playerStore)

const volumeButtonLabel = computed(() => (isMuted.value || volumePercent.value === 0 ? '取消静音' : '静音'))
const queueButtonLabel = computed(() => (queue.value.length > 0 ? `播放队列，共 ${queue.value.length} 首` : '播放队列'))
const queueSourceText = computed(() =>
  currentTrack.value ? '来源：当前播放器队列' : '点击一首歌后这里会显示待播歌曲',
)
const hasCurrentTrack = computed(() => Boolean(currentTrack.value))
const currentTitle = computed(() => currentTrack.value?.title || '点击一首歌开始播放')
const currentArtists = computed(() => getPlayerTrackArtists(currentTrack.value))
const currentArtist = computed(() => currentArtists.value.map((artist) => artist.name).join(' / ') || '首页热门单曲已接入播放器')
const currentIsFavorite = computed(() => libraryStore.isFavorite(currentTrack.value?.id))
const currentIsLocal = computed(() => libraryStore.isLocalTrack(currentTrack.value?.id))
const commentSong = computed<SongCommentSeed | null>(() => {
  const track = currentTrack.value

  if (!track) {
    return null
  }

  return {
    id: track.id,
    title: track.title,
    artistNames: currentArtists.value.map((artist) => artist.name),
    albumName: track.album,
    coverUrl: track.coverUrl || FALLBACK_COVER_URL,
    duration: track.durationMs,
  }
})

function handleProgressInput(event: Event) {
  const input = event.target as HTMLInputElement
  playerStore.seekToPercent(Number(input.value))
}

function handleVolumeInput(event: Event) {
  const input = event.target as HTMLInputElement
  playerStore.setVolume(Number(input.value) / 100)
}

function handleCoverError(event: Event) {
  const img = event.target as HTMLImageElement | null

  if (!img || img.dataset.fallbackApplied === 'true') {
    return
  }

  img.dataset.fallbackApplied = 'true'
  img.src = FALLBACK_COVER_URL
}

function formatQueueIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function handleToggleCurrentFavorite() {
  if (!currentTrack.value) {
    return
  }

  libraryStore.toggleFavorite(currentTrack.value)
}

function handleDownloadCurrentTrack() {
  if (!currentTrack.value) {
    return
  }

  libraryStore.addLocalTrack(currentTrack.value)
}

function handleShowCurrentComments() {
  if (!currentTrack.value) {
    return
  }

  commentsVisible.value = true
}

async function handleOpenCurrentSong() {
  const track = currentTrack.value

  if (!track) {
    return
  }

  await router.push(buildSearchRoute(track.title, 'song'))
}

async function handleOpenCurrentArtist(artist: ArtistRef) {
  const artistName = String(artist.name ?? '').trim()

  if (!artistName) {
    return
  }

  if (artist.id) {
    await router.push({
      name: 'artist-detail',
      params: { id: artist.id },
    })
    return
  }

  await router.push(buildSearchRoute(artistName, 'song'))
}

function toggleQueuePanel() {
  if (queue.value.length === 0) {
    queuePanelVisible.value = false
    return
  }

  queuePanelVisible.value = !queuePanelVisible.value
}

function closeQueuePanel() {
  queuePanelVisible.value = false
}

function handleQueueTrackSelect(index: number) {
  if (index < 0 || index >= queue.value.length) {
    return
  }

  if (index === currentIndex.value) {
    void playerStore.togglePlay()
    return
  }

  void playerStore.playTrackAtIndex(index)
}

function handleDocumentPointerDown(event: MouseEvent) {
  if (!queuePanelVisible.value) {
    return
  }

  const target = event.target as Node | null

  if (!target || playerShellRef.value?.contains(target)) {
    return
  }

  closeQueuePanel()
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeQueuePanel()
  }
}

watch(
  () => queue.value.length,
  (length) => {
    if (length === 0) {
      closeQueuePanel()
    }
  },
)

if (typeof window !== 'undefined') {
  window.addEventListener('mousedown', handleDocumentPointerDown)
  window.addEventListener('keydown', handleWindowKeydown)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousedown', handleDocumentPointerDown)
    window.removeEventListener('keydown', handleWindowKeydown)
  }
})
</script>

<template>
  <footer class="player" aria-label="Playback controls">
    <div ref="playerShellRef" class="player__shell">
      <div class="player__meta">
        <button
          class="player__cover-button"
          type="button"
          :disabled="!currentTrack"
          aria-label="打开播放详情"
          @click="playerStore.openDetail()"
        >
          <div class="player__cover-box">
            <img
              v-if="currentTrack?.coverUrl"
              class="player__cover"
              :src="currentTrack.coverUrl"
              :alt="currentTrack.title"
              referrerpolicy="no-referrer"
              @error="handleCoverError"
            />
            <div v-else class="player__cover player__cover--placeholder" aria-hidden="true"></div>
          </div>
        </button>

        <div class="player__meta-body">
          <div class="player__identity" :class="{ 'player__identity--disabled': !currentTrack }">
            <div class="player__copy">
              <button
                class="player__text-action player__text-action--title"
                type="button"
                :disabled="!currentTrack"
                :title="currentTitle"
                :aria-label="`搜索歌曲 ${currentTitle}`"
                @click="handleOpenCurrentSong"
              >
                <span class="player__name">{{ currentTitle }}</span>
              </button>

              <div
                v-if="hasCurrentTrack && currentArtists.length > 0"
                class="player__artist-list"
                :title="currentArtist"
              >
                <template v-for="(artist, index) in currentArtists" :key="`${artist.id || artist.name}-${index}`">
                  <button
                    class="player__artist-link"
                    type="button"
                    :title="artist.name"
                    :aria-label="`打开歌手 ${artist.name}`"
                    @click="handleOpenCurrentArtist(artist)"
                  >
                    <span class="player__artist-name">{{ artist.name }}</span>
                  </button>
                  <span v-if="index < currentArtists.length - 1" class="player__artist-separator" aria-hidden="true"> / </span>
                </template>
              </div>

              <span v-else class="player__artist player__artist--placeholder">{{ currentArtist }}</span>
            </div>
          </div>

          <div class="player__track-actions" aria-label="Current song actions">
            <button
              class="player__track-action"
              :class="{ 'player__track-action--favorite': currentIsFavorite }"
              type="button"
              :disabled="!currentTrack"
              :title="currentIsFavorite ? '取消收藏' : '收藏歌曲'"
              :aria-label="currentIsFavorite ? '取消收藏' : '收藏歌曲'"
              @click="handleToggleCurrentFavorite"
            >
              <Heart class="player__track-action-icon" :fill="currentIsFavorite ? 'currentColor' : 'none'" :stroke-width="2.1" />
            </button>

            <button
              class="player__track-action"
              :class="{ 'player__track-action--downloaded': currentIsLocal }"
              type="button"
              :disabled="!currentTrack"
              :title="currentIsLocal ? '已在本地音乐' : '下载到本地音乐'"
              :aria-label="currentIsLocal ? '已在本地音乐' : '下载到本地音乐'"
              @click="handleDownloadCurrentTrack"
            >
              <Download class="player__track-action-icon" :stroke-width="2.1" />
            </button>

            <button
              class="player__track-action"
              type="button"
              :disabled="!currentTrack"
              title="查看歌曲评论"
              aria-label="查看歌曲评论"
              @click="handleShowCurrentComments"
            >
              <MessageSquareText class="player__track-action-icon" :stroke-width="2.1" />
            </button>
          </div>
        </div>
      </div>

      <div class="player__transport">
        <button
          class="player__icon-button player__skip player__skip--prev"
          aria-label="Previous track"
          :disabled="!hasPrevious"
          @click="playerStore.playPreviousTrack()"
        >
          <span class="player__chevron"></span>
          <span class="player__chevron"></span>
        </button>
        <button
          class="player__play"
          :aria-label="isPlaying ? 'Pause' : 'Play'"
          :disabled="!currentTrack"
          :class="{ 'player__play--loading': isLoading }"
          @click="playerStore.togglePlay()"
        >
          <span v-if="isLoading" class="player__loader" aria-hidden="true"></span>
          <span v-else-if="isPlaying" class="player__pause-icon" aria-hidden="true">
            <span></span>
            <span></span>
          </span>
          <span v-else class="player__play-icon" aria-hidden="true"></span>
        </button>
        <button
          class="player__icon-button player__skip player__skip--next"
          aria-label="Next track"
          :disabled="!hasNext"
          @click="playerStore.playNextTrack()"
        >
          <span class="player__chevron"></span>
          <span class="player__chevron"></span>
        </button>
      </div>

      <div class="player__tools">
        <div class="player__mix-console" aria-label="Volume and queue controls">
          <button
            class="player__icon-button player__icon-button--console"
            :aria-label="volumeButtonLabel"
            @click="playerStore.toggleMute()"
          >
            <VolumeX v-if="isMuted || volumePercent === 0" class="player__lucide-icon" :stroke-width="1.85" />
            <Volume2 v-else class="player__lucide-icon" :stroke-width="1.85" />
          </button>
          <input
            class="player__range player__range--volume"
            :style="{ '--player-progress': `${volumePercent}%` }"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="volumePercent"
            @input="handleVolumeInput"
          />
          <button
            class="player__icon-button player__icon-button--console"
            :aria-label="queueButtonLabel"
            :class="{ 'player__icon-button--active': queuePanelVisible }"
            @click="toggleQueuePanel()"
          >
            <ListMusic class="player__lucide-icon" :stroke-width="1.85" />
          </button>
        </div>
      </div>

      <div class="player__timeline">
        <span class="player__time">{{ currentTime }}</span>
        <input
          class="player__range player__range--progress"
          :style="{ '--player-progress': `${progressPercent}%` }"
          type="range"
          min="0"
          max="100"
          step="0.1"
          :value="progressPercent"
          :disabled="!currentTrack"
          @input="handleProgressInput"
        />
        <span class="player__time">{{ durationLabel }}</span>
      </div>

      <section v-if="queuePanelVisible" class="player__queue-panel" aria-label="播放队列">
        <header class="player__queue-head">
          <div class="player__queue-title">播放队列</div>
          <div class="player__queue-meta">共{{ queue.length }}首</div>
        </header>

        <div class="player__queue-subline">{{ queueSourceText }}</div>

        <div v-if="queue.length === 0" class="player__queue-empty">当前还没有待播歌曲。</div>

        <div v-else class="player__queue-list">
          <button
            v-for="(track, index) in queue"
            :key="`${track.id}-${index}`"
            class="player__queue-item"
            :class="{ 'player__queue-item--active': index === currentIndex }"
            type="button"
            @click="handleQueueTrackSelect(index)"
          >
            <div class="player__queue-order">{{ formatQueueIndex(index) }}</div>
            <img
              class="player__queue-cover"
              :src="track.coverUrl || FALLBACK_COVER_URL"
              :alt="track.title"
              referrerpolicy="no-referrer"
              @error="handleCoverError"
            />
            <div class="player__queue-copy">
              <div class="player__queue-name">{{ track.title }}</div>
              <div class="player__queue-artist">{{ track.artist }}</div>
            </div>
            <div class="player__queue-duration">{{ track.duration }}</div>
          </button>
        </div>
      </section>
    </div>

    <SongCommentsDialog v-model="commentsVisible" :song="commentSong" />
  </footer>
</template>

<style scoped lang="scss">
.player {
  position: relative;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.player__shell {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  grid-template-areas:
    'timeline timeline timeline'
    'meta transport tools';
  align-items: center;
  gap: 6px 16px;
  min-height: 58px;
  padding: 6px 14px 7px;
  border-radius: 18px 18px 0 0;
  background:
    linear-gradient(90deg, rgba(55, 12, 88, 0.94) 0%, rgba(33, 38, 121, 0.92) 52%, rgba(18, 20, 71, 0.94) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -20px 36px rgba(6, 10, 30, 0.18),
    0 12px 24px rgba(5, 2, 18, 0.2);
  pointer-events: auto;
}

.player__shell::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.05)),
    radial-gradient(circle at 50% 50%, rgba(53, 154, 255, 0.18), transparent 26%);
}

.player__meta,
.player__transport,
.player__tools,
.player__timeline {
  position: relative;
  z-index: 1;
}

.player__meta {
  grid-area: meta;
  justify-self: start;
  min-width: 0;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  column-gap: 12px;
  color: inherit;
}

.player__cover-button,
.player__text-action {
  min-width: 0;
  padding: 0;
  border: 0;
  appearance: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: opacity 180ms ease;
}

.player__cover-button {
  display: block;
}

.player__identity {
  display: block;
  width: 100%;
  min-width: 0;
}

.player__meta-body {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: start;
  row-gap: 5px;
}

.player__cover-button:disabled,
.player__text-action:disabled {
  cursor: default;
  opacity: 1;
}

.player__cover-button:not(:disabled):hover,
.player__text-action:not(:disabled):hover {
  opacity: 0.88;
}

.player__cover-button:focus-visible,
.player__text-action:focus-visible,
.player__artist-link:focus-visible,
.player__track-action:focus-visible {
  outline: 1px solid rgba(255, 151, 224, 0.7);
  outline-offset: 2px;
}

.player__cover-box {
  flex: none;
  width: 56px;
  height: 56px;
}

.player__cover {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12px;
  object-fit: cover;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 10px 22px rgba(7, 6, 24, 0.24);
}

.player__cover--placeholder {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    linear-gradient(135deg, rgba(255, 118, 209, 0.62), rgba(79, 141, 255, 0.68));
}

.player__copy {
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding-top: 1px;
}

.player__text-action {
  min-width: 0;
  width: 100%;
}

.player__identity--disabled .player__copy {
  gap: 3px;
}

.player__name,
.player__artist {
  display: block;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player__name {
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.player__artist-list {
  min-width: 0;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 2px;
  color: rgba(255, 255, 255, 0.64);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
}

.player__artist-link {
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: color 180ms ease, opacity 180ms ease;
}

.player__artist-link:hover {
  color: rgba(255, 255, 255, 0.9);
}

.player__artist-name {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player__artist-separator {
  flex: none;
  color: rgba(255, 255, 255, 0.34);
  white-space: pre;
}

.player__artist {
  display: -webkit-box;
  color: rgba(255, 255, 255, 0.64);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  white-space: normal;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.player__artist--placeholder {
  cursor: default;
}

.player__track-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.player__track-action {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  cursor: pointer;
  transition:
    color 180ms ease,
    background 180ms ease,
    opacity 180ms ease,
    transform 180ms ease;
}

.player__track-action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  transform: translateY(-1px);
}

.player__track-action:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.player__track-action--favorite {
  color: #ff7485;
}

.player__track-action--downloaded {
  color: #d8cbff;
}

.player__track-action-icon {
  width: 14px;
  height: 14px;
}

.player__transport {
  grid-area: transport;
  display: flex;
  justify-self: center;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.player__timeline {
  grid-area: timeline;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.player__time {
  color: rgba(255, 255, 255, 0.7);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.player__icon-button,
.player__play {
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #fff;
  cursor: pointer;
}

.player__icon-button {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: transparent;
}

.player__icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.player__skip {
  gap: 1px;
}

.player__skip--prev .player__chevron {
  transform: scaleX(-1);
}

.player__chevron,
.player__play-icon {
  display: block;
  background: currentColor;
}

.player__chevron {
  width: 5px;
  height: 8px;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.player__play {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(180deg, #f45fe6, #bb46f0);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 10px 18px rgba(239, 80, 222, 0.28);
}

.player__play:disabled {
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
}

.player__play--loading {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 0 0 8px rgba(255, 110, 228, 0.12);
}

.player__play-icon {
  width: 8px;
  height: 10px;
  margin-left: 2px;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}

.player__pause-icon {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.player__pause-icon span {
  width: 3px;
  height: 9px;
  border-radius: 999px;
  background: currentColor;
}

.player__loader {
  width: 11px;
  height: 11px;
  border: 2px solid rgba(255, 255, 255, 0.34);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.player__tools {
  grid-area: tools;
  display: flex;
  justify-self: end;
  justify-content: flex-end;
  align-items: center;
  gap: 0;
}

.player__mix-console {
  min-width: 0;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.player__icon-button--console {
  flex: none;
}

.player__icon-button--active {
  background: rgba(255, 255, 255, 0.08);
}

.player__range {
  --player-progress: 0%;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  outline: none;
  background:
    linear-gradient(90deg, #ff76d1 0%, #f04dff var(--player-progress), rgba(255, 255, 255, 0.16) var(--player-progress), rgba(255, 255, 255, 0.16) 100%);
}

.player__range:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.player__range::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(240, 77, 255, 0.22);
}

.player__range::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(240, 77, 255, 0.22);
}

.player__range--volume {
  width: 88px;
  min-width: 88px;
}

.player__queue-panel {
  position: absolute;
  right: 18px;
  bottom: calc(100% + 14px);
  width: min(388px, calc(100vw - 42px));
  max-height: min(520px, 62vh);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 104, 208, 0.12), transparent 22%),
    radial-gradient(circle at 80% 16%, rgba(73, 166, 255, 0.16), transparent 26%),
    linear-gradient(180deg, rgba(19, 15, 58, 0.96), rgba(15, 20, 64, 0.94));
  border: 1px solid rgba(210, 202, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 28px 54px rgba(5, 7, 24, 0.34);
  pointer-events: auto;
}

.player__queue-head,
.player__queue-subline {
  padding-left: 16px;
  padding-right: 16px;
}

.player__queue-head {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.player__queue-title {
  color: rgba(250, 250, 255, 0.96);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.player__queue-meta,
.player__queue-subline {
  color: rgba(221, 228, 255, 0.58);
  font-size: 12px;
}

.player__queue-subline {
  padding-top: 10px;
  padding-bottom: 10px;
}

.player__queue-empty {
  min-height: 160px;
  display: grid;
  place-items: center;
  padding: 24px;
  color: rgba(226, 232, 255, 0.58);
  font-size: 13px;
  text-align: center;
}

.player__queue-list {
  overflow: auto;
  padding: 6px 0 10px;
}

.player__queue-list::-webkit-scrollbar {
  width: 10px;
}

.player__queue-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  background-clip: padding-box;
}

.player__queue-item {
  width: calc(100% - 12px);
  margin: 0 6px;
  min-height: 68px;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 34px 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 180ms ease,
    transform 180ms ease;
}

.player__queue-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}

.player__queue-item--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06)),
    rgba(255, 255, 255, 0.04);
}

.player__queue-order {
  color: rgba(226, 233, 255, 0.5);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.player__queue-cover {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.player__queue-copy {
  min-width: 0;
}

.player__queue-name,
.player__queue-artist,
.player__queue-duration {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player__queue-name {
  color: rgba(248, 250, 255, 0.96);
  font-size: 15px;
  font-weight: 600;
}

.player__queue-item--active .player__queue-name,
.player__queue-item--active .player__queue-duration {
  color: #7fb0ff;
}

.player__queue-artist {
  margin-top: 4px;
  color: rgba(220, 228, 255, 0.58);
  font-size: 12px;
}

.player__queue-duration {
  padding-left: 8px;
  color: rgba(235, 240, 255, 0.58);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.player__lucide-icon {
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.9);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .player__shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      'timeline'
      'meta'
      'transport'
      'tools';
    justify-items: stretch;
    gap: 10px;
    height: auto;
    min-height: 58px;
    padding: 10px 12px;
    border-radius: 18px 18px 0 0;
  }

  .player__transport,
  .player__tools {
    justify-content: center;
  }

  .player__queue-panel {
    right: 0;
    left: 0;
    width: 100%;
    bottom: calc(100% + 10px);
  }
}

@media (max-width: 640px) {
  .player__timeline {
    grid-template-columns: 1fr;
  }

  .player__time {
    display: none;
  }

  .player__debug-panel {
    grid-template-columns: 1fr;
  }

  .player__mix-console {
    width: 100%;
    justify-content: center;
  }

  .player__queue-item {
    grid-template-columns: 28px 40px minmax(0, 1fr);
  }

  .player__queue-duration {
    display: none;
  }
}
</style>
