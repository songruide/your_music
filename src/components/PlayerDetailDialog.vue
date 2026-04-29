<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ArrowRight,
  ChevronDown,
  Disc3,
  Languages,
  ListRestart,
  MessageSquareText,
  Pause,
  Play,
  Repeat1,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { SongCommentSeed } from '@/api/comment'
import { getSongLyrics } from '@/api/player'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import { usePlayerStore } from '@/stores/player'
import type { ArtistRef } from '@/types/music'
import { resolveAlbumRoute } from '@/utils/albumRoute'
import { mergeLyrics, type ParsedLyricLine } from '@/utils/lyrics'
import { getPlayerTrackArtists } from '@/utils/playerArtists'
import { buildSearchRoute } from '@/views/Search/utils'

const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff6cb8'/%3E%3Cstop offset='1' stop-color='%2368a7ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='360' height='360' rx='64' fill='url(%23g)'/%3E%3Ccircle cx='180' cy='138' r='48' fill='rgba(255,255,255,.72)'/%3E%3Crect x='92' y='218' width='176' height='54' rx='27' fill='rgba(255,255,255,.46)'/%3E%3C/svg%3E"
const ACTIVE_LYRIC_LEAD_SECONDS = 0.38
const ENGLISH_LYRIC_PATTERN = /[A-Za-z]/
const CJK_CHARACTER_PATTERN = /[\u3400-\u9fff]/

const router = useRouter()
const playerStore = usePlayerStore()
const {
  currentTime,
  currentTimeSeconds,
  currentTrack,
  durationLabel,
  error: playerError,
  hasNext,
  hasPrevious,
  isDetailVisible,
  isLoading,
  isMuted,
  isPlaying,
  playMode,
  playModeLabel,
  progressPercent,
  volumePercent,
} = storeToRefs(playerStore)

const lyricLines = ref<ParsedLyricLine[]>([])
const lyricsLoading = ref(false)
const lyricsError = ref('')
const showTranslatedLyrics = ref(false)
const activeLineElement = ref<HTMLElement | null>(null)
const commentsVisible = ref(false)

let requestToken = 0
let previousBodyOverflow = ''

const displayCover = computed(() => currentTrack.value?.coverUrl || FALLBACK_COVER_URL)
const displayAlbum = computed(() => currentTrack.value?.album?.trim() || '单曲收藏')
const currentArtists = computed(() => getPlayerTrackArtists(currentTrack.value))
const displayArtist = computed(() => currentArtists.value.map((artist) => artist.name).join(' / ') || '未知歌手')
const panelLabel = computed(() => (currentTrack.value ? `${currentTrack.value.title} 播放详情` : '播放详情'))
const playModeButtonLabel = computed(() => `播放模式：${playModeLabel.value}，点击切换`)
const commentButtonLabel = computed(() => (currentTrack.value ? `查看 ${currentTrack.value.title} 的评论` : '查看歌曲评论'))
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
const detailBackdropStyle = computed(() =>
  currentTrack.value?.coverUrl
    ? {
        backgroundImage: `url("${currentTrack.value.coverUrl}")`,
      }
    : undefined,
)
const activeLyricIndex = computed(() => {
  if (lyricLines.value.length === 0) {
    return -1
  }

  const currentSecond = currentTimeSeconds.value + ACTIVE_LYRIC_LEAD_SECONDS

  for (let index = lyricLines.value.length - 1; index >= 0; index -= 1) {
    if (currentSecond >= lyricLines.value[index].time) {
      return index
    }
  }

  return 0
})
const lyricsStateText = computed(() => {
  if (lyricsLoading.value) {
    return '正在加载歌词...'
  }

  if (lyricsError.value) {
    return lyricsError.value
  }

  if (lyricLines.value.length === 0) {
    return '这首歌暂时没有可展示歌词'
  }

  return ''
})
const lyricCountLabel = computed(() => (lyricLines.value.length > 0 ? `${lyricLines.value.length} 行` : '同步歌词'))
const hasManualTranslation = computed(() =>
  lyricLines.value.some((line) => line.translation && isEnglishLyricLine(line.text)),
)
const translationButtonLabel = computed(() => {
  if (!hasManualTranslation.value) {
    return '当前歌曲暂无可用的英文歌词翻译'
  }

  return showTranslatedLyrics.value ? '关闭歌词翻译' : '打开歌词翻译'
})

function isEnglishLyricLine(text: string) {
  const normalizedText = text.replace(/\([^)]*\)|（[^）]*）/g, '').trim()

  return ENGLISH_LYRIC_PATTERN.test(normalizedText) && !CJK_CHARACTER_PATTERN.test(normalizedText)
}

function closeDialog() {
  playerStore.closeDetail()
}

function toggleTranslatedLyrics() {
  if (!hasManualTranslation.value) {
    return
  }

  showTranslatedLyrics.value = !showTranslatedLyrics.value
}

async function openArtist(artist: ArtistRef) {
  const artistName = artist.name.trim()

  if (!artistName) {
    return
  }

  closeDialog()

  if (artist.id) {
    await router.push({
      name: 'artist-detail',
      params: { id: artist.id },
    })
    return
  }

  await router.push(buildSearchRoute(artistName, 'song'))
}

async function openAlbum() {
  const track = currentTrack.value

  if (!track) {
    return
  }

  const targetRoute = await resolveAlbumRoute({
    id: track.id,
    albumId: track.albumId,
    albumName: displayAlbum.value,
  })

  if (!targetRoute) {
    return
  }

  closeDialog()
  await router.push(targetRoute)
}

function setActiveLineRef(element: Element | null, index: number) {
  if (index !== activeLyricIndex.value) {
    return
  }

  activeLineElement.value = element instanceof HTMLElement ? element : null
}

function handleCoverError(event: Event) {
  const image = event.target as HTMLImageElement | null

  if (!image || image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = FALLBACK_COVER_URL
}

function seekFromDetail(event: Event) {
  const input = event.target as HTMLInputElement | null

  if (!input) {
    return
  }

  playerStore.seekToPercent(Number(input.value))
}

function seekToLyricLine(seconds: number) {
  playerStore.seekToSeconds(seconds)
}

function handleShowCurrentComments() {
  if (!currentTrack.value) {
    return
  }

  commentsVisible.value = true
}

function handleKeydown(event: KeyboardEvent) {
  if (commentsVisible.value) {
    return
  }

  if (event.key === 'Escape' && isDetailVisible.value) {
    closeDialog()
  }
}

async function loadLyrics(songId: string) {
  const token = ++requestToken

  lyricLines.value = []
  lyricsError.value = ''
  lyricsLoading.value = true
  showTranslatedLyrics.value = false

  try {
    const payload = await getSongLyrics(songId)

    if (token !== requestToken) {
      return
    }

    if (payload.noLyric) {
      lyricLines.value = []
      lyricsError.value = '这是一首纯音乐，暂无歌词'
      return
    }

    if (payload.uncollected) {
      lyricLines.value = []
      lyricsError.value = '歌词暂未收录'
      return
    }

    lyricLines.value = mergeLyrics(payload.lyric, payload.translatedLyric)
    lyricsError.value = lyricLines.value.length > 0 ? '' : '歌词暂未收录'
  } catch (err) {
    if (token !== requestToken) {
      return
    }

    lyricLines.value = []
    lyricsError.value = err instanceof Error ? err.message : '歌词加载失败'
  } finally {
    if (token === requestToken) {
      lyricsLoading.value = false
    }
  }
}

watch(
  () => isDetailVisible.value,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      if (isOpen) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = previousBodyOverflow
      }
    }

    if (isOpen && currentTrack.value?.id) {
      void loadLyrics(currentTrack.value.id)
    }

    if (!isOpen) {
      requestToken += 1
      lyricsLoading.value = false
    }
  },
)

watch(
  () => currentTrack.value?.id,
  (songId) => {
    if (!isDetailVisible.value || !songId) {
      return
    }

    void loadLyrics(songId)
  },
)

watch(hasManualTranslation, (hasTranslation) => {
  if (!hasTranslation) {
    showTranslatedLyrics.value = false
  }
})

watch(activeLyricIndex, async () => {
  await nextTick()
  activeLineElement.value?.scrollIntoView({
    block: 'center',
    behavior: 'auto',
  })
})

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
    <Transition name="player-detail-sheet" appear>
      <div v-if="isDetailVisible && currentTrack" class="player-detail">
        <div class="player-detail__backdrop" :style="detailBackdropStyle" @click="closeDialog"></div>

        <section class="player-detail__panel" role="dialog" aria-modal="true" :aria-label="panelLabel">
          <button class="player-detail__collapse" type="button" aria-label="收起播放详情" @click="closeDialog">
            <ChevronDown class="player-detail__collapse-icon" :stroke-width="2.2" />
          </button>

          <div class="player-detail__ambient" aria-hidden="true">
            <span class="player-detail__glow player-detail__glow--pink"></span>
            <span class="player-detail__glow player-detail__glow--blue"></span>
          </div>

          <section class="player-detail__album">
            <div class="player-detail__vinyl-stage">
              <div class="player-detail__turntable-base" aria-hidden="true">
                <span class="player-detail__turntable-ring player-detail__turntable-ring--outer"></span>
                <span class="player-detail__turntable-ring player-detail__turntable-ring--inner"></span>
              </div>

              <div class="player-detail__tonearm" aria-hidden="true">
                <span class="player-detail__tonearm-head"></span>
              </div>

              <div class="player-detail__record-shell" :class="{ 'player-detail__record-shell--playing': isPlaying }">
                <div class="player-detail__record">
                  <img
                    class="player-detail__record-cover"
                    :src="displayCover"
                    :alt="currentTrack.title"
                    referrerpolicy="no-referrer"
                    @error="handleCoverError"
                  />
                </div>
              </div>
            </div>

            <div class="player-detail__song-copy">
              <div class="player-detail__eyebrow">
                <Disc3 class="player-detail__eyebrow-icon" :stroke-width="1.9" />
                <span>Now Playing</span>
              </div>
              <h2 class="player-detail__title">{{ currentTrack.title }}</h2>
              <div class="player-detail__artist-list" :title="displayArtist">
                <template v-for="(artist, index) in currentArtists" :key="`${artist.id || artist.name}-${index}`">
                  <button
                    class="player-detail__artist-link"
                    type="button"
                    :aria-label="`打开歌手 ${artist.name}`"
                    :title="artist.name"
                    @click="openArtist(artist)"
                  >
                    {{ artist.name }}
                  </button>
                  <span v-if="index < currentArtists.length - 1" class="player-detail__artist-separator">/</span>
                </template>
              </div>
              <button
                class="player-detail__album-name player-detail__album-name--interactive"
                type="button"
                :title="`打开专辑 ${displayAlbum}`"
                @click="openAlbum"
              >
                {{ displayAlbum }}
              </button>
            </div>

            <div class="player-detail__timeline-shell">
              <input
                class="player-detail__range"
                :style="{ '--player-detail-progress': `${progressPercent}%` }"
                type="range"
                min="0"
                max="100"
                step="0.1"
                :value="progressPercent"
                @input="seekFromDetail"
              />
              <div class="player-detail__timeline-labels">
                <span>{{ currentTime }}</span>
                <span>{{ durationLabel }}</span>
              </div>
            </div>

            <div class="player-detail__mini-controls">
              <button
                class="player-detail__mode-button"
                type="button"
                :aria-label="playModeButtonLabel"
                :title="playModeButtonLabel"
                :class="{ 'player-detail__mode-button--active': playMode !== 'sequential' }"
                @click="playerStore.cyclePlayMode()"
              >
                <Repeat1 v-if="playMode === 'single-loop'" class="player-detail__control-icon" :stroke-width="2" />
                <ListRestart v-else-if="playMode === 'list-loop'" class="player-detail__control-icon" :stroke-width="2" />
                <Shuffle v-else-if="playMode === 'shuffle'" class="player-detail__control-icon" :stroke-width="2" />
                <ArrowRight v-else class="player-detail__control-icon" :stroke-width="2" />
              </button>
              <button
                class="player-detail__icon-button"
                type="button"
                aria-label="上一首"
                :disabled="!hasPrevious"
                @click="playerStore.playPreviousTrack()"
              >
                <SkipBack class="player-detail__control-icon" :stroke-width="2.1" />
              </button>
              <button
                class="player-detail__play"
                type="button"
                :aria-label="isPlaying ? '暂停' : '播放'"
                :disabled="!currentTrack"
                @click="playerStore.togglePlay()"
              >
                <span v-if="isLoading" class="player-detail__loader" aria-hidden="true"></span>
                <Pause v-else-if="isPlaying" class="player-detail__play-icon" :stroke-width="2.1" />
                <Play v-else class="player-detail__play-icon player-detail__play-icon--play" :stroke-width="2.1" />
              </button>
              <button
                class="player-detail__icon-button"
                type="button"
                aria-label="下一首"
                :disabled="!hasNext"
                @click="playerStore.playNextTrack()"
              >
                <SkipForward class="player-detail__control-icon" :stroke-width="2.1" />
              </button>
            </div>

            <div class="player-detail__utility-row">
              <button
                class="player-detail__utility-pill player-detail__comment-pill"
                type="button"
                :aria-label="commentButtonLabel"
                :title="commentButtonLabel"
                @click="handleShowCurrentComments"
              >
                <MessageSquareText class="player-detail__utility-icon" :stroke-width="1.9" />
                <span>评论</span>
              </button>

              <div class="player-detail__volume-readout">
                <VolumeX
                  v-if="isMuted || volumePercent === 0"
                  class="player-detail__utility-icon"
                  :stroke-width="1.9"
                />
                <Volume2 v-else class="player-detail__utility-icon" :stroke-width="1.9" />
                <span class="player-detail__volume-track" aria-hidden="true">
                  <span class="player-detail__volume-fill" :style="{ width: `${volumePercent}%` }"></span>
                </span>
              </div>
            </div>

            <p
              v-if="playerError || isLoading"
              class="player-detail__status"
              :class="{ 'player-detail__status--error': playerError }"
            >
              {{ playerError || '正在缓冲音源...' }}
            </p>
          </section>

          <section class="player-detail__lyrics" aria-label="歌词">
            <div class="player-detail__lyrics-head">
              <span>Lyrics</span>
              <div class="player-detail__lyrics-actions">
                <button
                  class="player-detail__translation-toggle"
                  type="button"
                  :aria-label="translationButtonLabel"
                  :aria-pressed="showTranslatedLyrics"
                  :class="{ 'player-detail__translation-toggle--active': showTranslatedLyrics }"
                  :disabled="!hasManualTranslation"
                  :title="translationButtonLabel"
                  @click="toggleTranslatedLyrics"
                >
                  <Languages class="player-detail__translation-toggle-icon" :stroke-width="1.9" />
                  <span>歌词翻译</span>
                </button>
                <span>{{ lyricCountLabel }}</span>
              </div>
            </div>

            <div class="player-detail__lyrics-scroll">
              <div v-if="lyricsStateText" class="player-detail__lyrics-state">
                {{ lyricsStateText }}
              </div>

              <div
                v-for="(line, index) in lyricLines"
                v-else
                :key="`${line.time}-${index}`"
                :ref="(element) => setActiveLineRef(element, index)"
                class="player-detail__lyric-line"
                :class="{
                  'player-detail__lyric-line--active': index === activeLyricIndex,
                  'player-detail__lyric-line--past': index < activeLyricIndex,
                }"
                role="button"
                tabindex="0"
                @click="seekToLyricLine(line.time)"
                @keydown.enter.prevent="seekToLyricLine(line.time)"
                @keydown.space.prevent="seekToLyricLine(line.time)"
              >
                <div class="player-detail__lyric-text">{{ line.text }}</div>
                <div
                  v-if="showTranslatedLyrics && line.translation && isEnglishLyricLine(line.text)"
                  class="player-detail__lyric-translation"
                >
                  {{ line.translation }}
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </Transition>
  </Teleport>

  <SongCommentsDialog v-model="commentsVisible" :song="commentSong" />
</template>

<style scoped lang="scss">
.player-detail {
  position: fixed;
  inset: 0;
  z-index: 60;
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
}

.player-detail__backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 18% 30%, rgba(245, 91, 255, 0.18), transparent 24%),
    radial-gradient(circle at 64% 88%, rgba(56, 179, 255, 0.2), transparent 28%),
    rgba(7, 8, 16, 0.7);
  background-position: center;
  background-size: cover;
  backdrop-filter: blur(24px);
}

.player-detail__backdrop::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(254, 109, 255, 0.42), transparent 16%, transparent 84%, rgba(86, 126, 255, 0.34)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
}

.player-detail__panel {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(340px, 38vw) minmax(0, 1fr);
  gap: clamp(18px, 2.4vw, 38px);
  align-items: center;
  padding: 58px clamp(20px, 3.2vw, 44px) 20px;
  background:
    radial-gradient(circle at 16% 18%, rgba(225, 255, 220, 0.22), transparent 24%),
    radial-gradient(circle at 45% 88%, rgba(90, 210, 255, 0.24), transparent 28%),
    linear-gradient(100deg, rgba(244, 241, 236, 0.88), rgba(236, 238, 241, 0.78) 46%, rgba(244, 231, 237, 0.82));
  color: #171923;
}

.player-detail__panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.24), transparent 18%, transparent 76%, rgba(255, 255, 255, 0.18)),
    radial-gradient(circle at 72% 24%, rgba(255, 255, 255, 0.42), transparent 24%);
}

.player-detail__collapse {
  position: absolute;
  z-index: 3;
  top: 14px;
  right: 14px;
  width: 20px;
  height: 20px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: rgba(21, 23, 32, 0.74);
  cursor: pointer;
  opacity: 0.82;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.player-detail__collapse-icon {
  width: 16px;
  height: 16px;
}

.player-detail__collapse:hover,
.player-detail__collapse:focus-visible {
  outline: none;
  opacity: 1;
  transform: translateY(1px);
}

.player-detail__ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.player-detail__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(56px);
  opacity: 0.26;
}

.player-detail__glow--pink {
  width: 340px;
  height: 210px;
  left: -60px;
  bottom: 18%;
  background: #ff63d8;
}

.player-detail__glow--blue {
  width: 420px;
  height: 220px;
  right: 12%;
  bottom: -80px;
  background: #53b8ff;
}

.player-detail__album,
.player-detail__lyrics {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.player-detail__album {
  align-self: center;
  justify-self: center;
  width: min(380px, 100%);
  min-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.player-detail__vinyl-stage {
  position: relative;
  width: min(340px, 100%);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.player-detail__turntable-base {
  position: absolute;
  inset: 30px;
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.12) 42%, rgba(255, 255, 255, 0.03) 66%, transparent 74%);
  box-shadow:
    0 24px 42px rgba(58, 64, 84, 0.1);
  filter: blur(4px);
}

.player-detail__turntable-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(92, 100, 122, 0.1);
}

.player-detail__turntable-ring--outer {
  width: 78%;
  height: 78%;
  border-color: rgba(92, 100, 122, 0.04);
}

.player-detail__turntable-ring--inner {
  width: 56%;
  height: 56%;
  border-color: rgba(92, 100, 122, 0.03);
}

.player-detail__tonearm {
  position: absolute;
  top: 8px;
  right: 34px;
  z-index: 2;
  width: 96px;
  height: 148px;
  transform: rotate(14deg);
  transform-origin: 72px 22px;
  pointer-events: none;
}

.player-detail__tonearm::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 60px;
  width: 8px;
  height: 104px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(235, 238, 245, 0.96), rgba(154, 160, 176, 0.84));
  box-shadow:
    inset 2px 0 2px rgba(255, 255, 255, 0.4),
    0 6px 14px rgba(94, 100, 118, 0.16);
}

.player-detail__tonearm::after {
  content: '';
  position: absolute;
  top: 0;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(246, 247, 250, 0.96), rgba(186, 193, 206, 0.92));
  box-shadow: 0 10px 22px rgba(76, 78, 92, 0.18);
}

.player-detail__tonearm-head {
  position: absolute;
  left: 38px;
  bottom: 12px;
  width: 42px;
  height: 24px;
  border-radius: 6px;
  transform: rotate(6deg);
  background: linear-gradient(135deg, rgba(120, 127, 146, 0.96), rgba(74, 80, 97, 0.94));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 10px 20px rgba(56, 58, 70, 0.18);
}

.player-detail__record-shell {
  position: relative;
  z-index: 1;
  width: clamp(214px, 20vw, 252px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(circle at 50% 50%, transparent 0 17%, rgba(255, 255, 255, 0.08) 18% 18.7%, transparent 19.5%),
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06) 0 28%, transparent 29%),
    repeating-radial-gradient(circle at 50% 50%, #050507 0 6px, #0d0e12 7px 10px, #0b0c10 11px 13px);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 0 42px rgba(255, 255, 255, 0.06),
    0 22px 36px rgba(25, 25, 36, 0.2);
}

.player-detail__record-shell::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: rgba(241, 242, 245, 0.92);
  box-shadow: 0 0 0 2px rgba(32, 34, 44, 0.12);
}

.player-detail__record-shell--playing {
  animation: recordSpin 16s linear infinite;
}

.player-detail__record {
  width: 84px;
  aspect-ratio: 1;
  padding: 6px;
  border-radius: 999px;
  background: rgba(246, 247, 248, 0.96);
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.42),
    0 6px 18px rgba(0, 0, 0, 0.14);
}

.player-detail__record-cover {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  object-fit: cover;
}

.player-detail__song-copy {
  width: min(316px, 100%);
  text-align: center;
}

.player-detail__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  color: rgba(37, 42, 55, 0.58);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.player-detail__eyebrow-icon {
  width: 11px;
  height: 11px;
}

.player-detail__title {
  margin: 8px 0 3px;
  color: rgba(18, 19, 28, 0.94);
  font-size: clamp(16px, 1.5vw, 21px);
  line-height: 1.12;
  letter-spacing: -0.03em;
}

.player-detail__artist-list,
.player-detail__status {
  margin: 0;
  color: rgba(44, 49, 65, 0.58);
}

.player-detail__artist-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 3px 7px;
  font-size: 10px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.player-detail__artist-link {
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  transition:
    color 180ms ease,
    transform 180ms ease;
}

.player-detail__artist-link:hover,
.player-detail__artist-link:focus-visible {
  outline: none;
  color: rgba(34, 37, 51, 0.86);
  transform: translateY(-1px);
}

.player-detail__artist-separator {
  color: rgba(44, 49, 65, 0.3);
}

.player-detail__album-name {
  padding: 0;
  border: 0;
  background: transparent;
  margin-top: 4px;
  color: rgba(44, 49, 65, 0.38);
  font-size: 9px;
  font: inherit;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.player-detail__album-name--interactive {
  cursor: pointer;
  transition:
    color 180ms ease,
    transform 180ms ease;
}

.player-detail__album-name--interactive:hover,
.player-detail__album-name--interactive:focus-visible {
  outline: none;
  color: rgba(34, 37, 51, 0.82);
  transform: translateY(-1px);
}

.player-detail__timeline-shell {
  width: min(316px, 100%);
}

.player-detail__mini-controls {
  width: min(316px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px 38px 24px minmax(0, 1fr);
  align-items: center;
  justify-items: center;
  gap: 14px;
}

.player-detail__mini-controls .player-detail__mode-button {
  grid-column: 1;
  justify-self: end;
}

.player-detail__mini-controls .player-detail__icon-button:first-of-type {
  grid-column: 2;
}

.player-detail__mini-controls .player-detail__play {
  grid-column: 3;
}

.player-detail__mini-controls .player-detail__icon-button:last-of-type {
  grid-column: 4;
}

.player-detail__icon-button,
.player-detail__mode-button,
.player-detail__play {
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.player-detail__icon-button,
.player-detail__mode-button {
  width: 24px;
  height: 24px;
  background: transparent;
  color: rgba(24, 27, 36, 0.72);
}

.player-detail__mode-button--active {
  color: rgba(190, 73, 224, 0.92);
}

.player-detail__icon-button:disabled,
.player-detail__play:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.player-detail__play {
  width: 38px;
  height: 38px;
  color: #fff;
  background: linear-gradient(180deg, #f064ce, #ba59ed);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    0 12px 26px rgba(193, 82, 221, 0.28);
}

.player-detail__control-icon {
  width: 13px;
  height: 13px;
}

.player-detail__play-icon {
  width: 14px;
  height: 14px;
}

.player-detail__play-icon--play {
  margin-left: 3px;
}

.player-detail__loader {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.36);
  border-top-color: #fff;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

.player-detail__decorative-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(24, 27, 36, 0.42);
}

.player-detail__decorative-icon-svg {
  width: 13px;
  height: 13px;
}

.player-detail__timeline-labels {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(36, 40, 54, 0.36);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.player-detail__range {
  --player-detail-progress: 0%;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  outline: none;
  background:
    linear-gradient(90deg, #d85cf2 0%, #c949ef var(--player-detail-progress), rgba(24, 27, 38, 0.12) var(--player-detail-progress), rgba(24, 27, 38, 0.12) 100%);
}

.player-detail__range::-webkit-slider-thumb {
  appearance: none;
  width: 0;
  height: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}

.player-detail__range::-moz-range-thumb {
  width: 0;
  height: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}

.player-detail__utility-row {
  width: min(316px, 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(24, 27, 36, 0.5);
  font-size: 10px;
}

.player-detail__utility-pill,
.player-detail__volume-readout {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.player-detail__utility-pill {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition:
    color 180ms ease,
    transform 180ms ease;
}

.player-detail__comment-pill:hover,
.player-detail__comment-pill:focus-visible {
  outline: none;
  color: rgba(24, 27, 36, 0.82);
  transform: translateY(-1px);
}

.player-detail__utility-icon {
  width: 12px;
  height: 12px;
  color: rgba(24, 27, 36, 0.54);
}

.player-detail__volume-track {
  width: 64px;
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(24, 27, 36, 0.12);
}

.player-detail__volume-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d85cf2, #c949ef);
}

.player-detail__status {
  min-height: 17px;
  color: rgba(24, 27, 36, 0.4);
  font-size: 10px;
}

.player-detail__status--error {
  color: #a83358;
}

.player-detail__lyrics {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px clamp(4px, 1vw, 12px) 8px 0;
}

.player-detail__lyrics-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 10px 10px;
  color: rgba(28, 31, 42, 0.48);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.player-detail__lyrics-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.player-detail__translation-toggle {
  padding: 6px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.46);
  color: rgba(24, 27, 36, 0.72);
  font: inherit;
  letter-spacing: 0.08em;
  text-transform: none;
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.player-detail__translation-toggle:hover,
.player-detail__translation-toggle:focus-visible {
  outline: none;
  color: rgba(20, 22, 32, 0.92);
  background: rgba(255, 255, 255, 0.68);
  transform: translateY(-1px);
}

.player-detail__translation-toggle--active {
  color: #fff;
  background: linear-gradient(135deg, rgba(230, 96, 214, 0.94), rgba(185, 94, 237, 0.92));
  box-shadow: 0 10px 20px rgba(191, 83, 223, 0.18);
}

.player-detail__translation-toggle:disabled {
  color: rgba(24, 27, 36, 0.34);
  background: rgba(255, 255, 255, 0.24);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.player-detail__translation-toggle-icon {
  width: 12px;
  height: 12px;
}

.player-detail__lyrics-scroll {
  position: relative;
  min-height: 0;
  height: calc(100vh - 96px);
  min-height: calc(100dvh - 96px);
  overflow-y: auto;
  padding: 31vh 18px;
  scroll-behavior: auto;
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
}

.player-detail__lyrics-scroll::-webkit-scrollbar {
  width: 8px;
}

.player-detail__lyrics-scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(26, 29, 42, 0.18);
  background-clip: padding-box;
}

.player-detail__lyrics-state {
  min-height: 280px;
  display: grid;
  place-items: center;
  color: rgba(38, 43, 58, 0.46);
  font-size: 15px;
  text-align: center;
}

.player-detail__lyric-line {
  max-width: 620px;
  margin: 0 auto;
  padding: 11px 14px;
  border-radius: 14px;
  color: rgba(41, 44, 58, 0.36);
  cursor: pointer;
  text-align: center;
  transform: scale(0.94);
  transition:
    color 220ms ease,
    background 220ms ease,
    transform 220ms ease,
    opacity 220ms ease;
}

.player-detail__lyric-line:hover,
.player-detail__lyric-line:focus-visible {
  outline: none;
  color: rgba(24, 28, 40, 0.72);
  background: rgba(255, 255, 255, 0.08);
}

.player-detail__lyric-line--past {
  color: rgba(41, 44, 58, 0.24);
}

.player-detail__lyric-line--active {
  color: rgba(19, 20, 30, 0.96);
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.player-detail__lyric-text {
  font-size: clamp(15px, 1.8vw, 19px);
  font-weight: 700;
  line-height: 1.55;
}

.player-detail__lyric-translation {
  margin-top: 5px;
  color: rgba(44, 49, 64, 0.46);
  font-size: 12px;
  line-height: 1.6;
}

.player-detail-sheet-enter-active,
.player-detail-sheet-leave-active {
  transition: opacity 320ms ease;
}

.player-detail-sheet-enter-active .player-detail__backdrop,
.player-detail-sheet-leave-active .player-detail__backdrop {
  transition:
    opacity 320ms ease,
    backdrop-filter 320ms ease;
}

.player-detail-sheet-enter-active .player-detail__panel,
.player-detail-sheet-leave-active .player-detail__panel {
  transition:
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 320ms ease,
    box-shadow 320ms ease;
}

.player-detail-sheet-enter-from {
  opacity: 0;
}

.player-detail-sheet-enter-from .player-detail__backdrop,
.player-detail-sheet-leave-to .player-detail__backdrop {
  opacity: 0;
  backdrop-filter: blur(0px);
}

.player-detail-sheet-enter-from .player-detail__panel {
  opacity: 0;
  transform: translateY(100px);
}

.player-detail-sheet-leave-to {
  opacity: 0;
}

.player-detail-sheet-leave-to .player-detail__panel {
  opacity: 0.86;
  transform: translateY(calc(100dvh - 140px));
}

@keyframes recordSpin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .player-detail__panel {
    grid-template-columns: 1fr;
    gap: 12px;
    overflow-y: auto;
    padding: 56px 16px 16px;
  }

  .player-detail__album {
    min-width: 0;
    width: 100%;
    padding-top: 0;
  }

  .player-detail__vinyl-stage {
    width: min(320px, 100%);
  }

  .player-detail__lyrics {
    min-height: 420px;
    padding: 0;
  }

  .player-detail__lyrics-scroll {
    height: min(460px, calc(100vh - 430px));
    min-height: min(460px, calc(100dvh - 430px));
    max-height: none;
    padding: 148px 10px;
  }
}

@media (max-width: 560px) {
  .player-detail__panel {
    padding: 52px 12px 12px;
  }

  .player-detail__collapse {
    top: 12px;
    right: 12px;
  }

  .player-detail__record-shell {
    width: min(220px, 62vw);
  }

  .player-detail__turntable-base {
    inset: 24px;
  }

  .player-detail__record {
    width: 78px;
  }

  .player-detail__tonearm {
    top: 10px;
    right: 30px;
    transform: scale(0.78) rotate(16deg);
  }

  .player-detail__album {
    min-width: 0;
  }

  .player-detail__lyrics {
    min-height: 360px;
  }

  .player-detail__lyrics-scroll {
    height: min(360px, calc(100vh - 364px));
    min-height: min(360px, calc(100dvh - 364px));
    padding: 128px 6px;
  }
}
</style>
