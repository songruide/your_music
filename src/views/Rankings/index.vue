<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { BarChart3, Crown, Play, RefreshCw, TrendingUp } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import {
  getRankingDetail,
  getRankings,
  type RankingDetail,
  type RankingSummary,
  type RankingTrack,
} from '@/api/ranking'
import SongRowActions from '@/components/SongRowActions.vue'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { usePlayerStore } from '@/stores/player'
import type { ArtistRef } from '@/types/music'
import { resolveAlbumRoute } from '@/utils/albumRoute'
import { buildArtistRoute } from '@/utils/artistRoute'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'

const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2320d2a1'/%3E%3Cstop offset='1' stop-color='%235e7cff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='42' fill='url(%23g)'/%3E%3Cpath d='M76 150h88v18H76zM90 112h18v50H90zM118 82h18v80h-18zM146 102h18v60h-18z' fill='rgba(255,255,255,.72)'/%3E%3C/svg%3E"
const DETAIL_TRACK_LIMIT = 100

const router = useRouter()
const playerStore = usePlayerStore()
const libraryStore = useMusicLibraryStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const rankings = ref<RankingSummary[]>([])
const rankingDetail = ref<RankingDetail | null>(null)
const activeRankingId = ref('')
const rankingsLoading = ref(true)
const detailLoading = ref(false)
const rankingsError = ref('')
const detailError = ref('')

let detailRequestToken = 0

const activeSummary = computed(() =>
  rankings.value.find((item) => item.id === activeRankingId.value) ?? rankings.value[0] ?? null,
)
const activeRanking = computed<RankingDetail | RankingSummary | null>(() => rankingDetail.value ?? activeSummary.value)
const activeTracks = computed(() => rankingDetail.value?.tracks ?? [])
const activeDescription = computed(() => {
  const description = activeRanking.value?.description?.trim()

  return description || '收录当前平台热度最高的歌曲，适合直接从第一首开始播放。'
})
const hasPlayableTracks = computed(() => activeTracks.value.some((track) => track.playable !== false))
const updatedAtLabel = computed(() => formatDate(activeRanking.value?.updateTime))

function formatDate(value?: number) {
  if (!Number.isFinite(value) || !value) {
    return '最近更新'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '最近更新'
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function formatPlayCount(value?: number) {
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

function formatRank(index: number) {
  return String(index + 1).padStart(2, '0')
}

function handleCoverError(event: Event) {
  const image = event.target as HTMLImageElement | null

  if (!image || image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = FALLBACK_COVER_URL
}

function toPlayerTrack(song: RankingTrack) {
  return buildPlayerTrack({
    id: song.id,
    title: song.name,
    artists: song.artists,
    artistNames: song.artistNames,
    albumId: song.albumId,
    albumName: song.albumName,
    coverUrl: song.coverUrl || activeRanking.value?.coverUrl || FALLBACK_COVER_URL,
    durationMs: song.duration,
  })
}

function createPlayerQueue() {
  return activeTracks.value.filter((track) => track.playable !== false).map(toPlayerTrack)
}

function selectRanking(id: string) {
  if (!id || id === activeRankingId.value) {
    return
  }

  activeRankingId.value = id
}

function handleTrackSelect(song: RankingTrack) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = createPlayerQueue()
  const startIndex = queue.findIndex((track) => track.id === song.id)

  if (startIndex < 0) {
    return
  }

  void playerStore.playQueue(queue, startIndex)
}

function playAll() {
  const queue = createPlayerQueue()

  if (queue.length === 0) {
    return
  }

  void playerStore.playQueue(queue, 0)
}

function isFavoriteSong(songId: string) {
  return libraryStore.isFavorite(songId)
}

function isLocalSong(songId: string) {
  return libraryStore.isLocalTrack(songId)
}

function toggleFavoriteSong(song: RankingTrack) {
  libraryStore.toggleFavorite(toPlayerTrack(song))
}

function playNextSong(song: RankingTrack) {
  if (song.playable === false) {
    return
  }

  void playerStore.enqueueNextTrack(toPlayerTrack(song))
}

function downloadSong(song: RankingTrack) {
  if (song.playable === false) {
    return
  }

  libraryStore.addLocalTrack(toPlayerTrack(song))
}

function handleOpenArtist(artist: ArtistRef) {
  const targetRoute = buildArtistRoute(artist)

  if (!targetRoute) {
    return
  }

  void router.push(targetRoute)
}

async function handleOpenAlbum(song: Pick<RankingTrack, 'id' | 'albumId' | 'albumName'>) {
  const targetRoute = await resolveAlbumRoute({
    id: song.id,
    albumId: song.albumId,
    albumName: song.albumName,
  })

  if (!targetRoute) {
    return
  }

  await router.push(targetRoute)
}

async function loadRankings() {
  rankingsLoading.value = true
  rankingsError.value = ''

  try {
    const data = await getRankings()

    rankings.value = data
    activeRankingId.value = data[0]?.id ?? ''
  } catch (error) {
    rankings.value = []
    activeRankingId.value = ''
    rankingsError.value = error instanceof Error ? error.message : '排行榜加载失败'
  } finally {
    rankingsLoading.value = false
  }
}

async function loadRankingDetail(id: string) {
  const token = ++detailRequestToken

  rankingDetail.value = null
  detailLoading.value = true
  detailError.value = ''

  try {
    const data = await getRankingDetail(id, DETAIL_TRACK_LIMIT)

    if (token !== detailRequestToken) {
      return
    }

    const summary = rankings.value.find((item) => item.id === id)

    rankingDetail.value = {
      ...summary,
      ...data,
      coverUrl: data.coverUrl || summary?.coverUrl || '',
      description: data.description || summary?.description || '',
      updateFrequency: data.updateFrequency || summary?.updateFrequency || '',
      previewTracks: data.previewTracks.length ? data.previewTracks : summary?.previewTracks ?? [],
    }
  } catch (error) {
    if (token === detailRequestToken) {
      detailError.value = error instanceof Error ? error.message : '榜单歌曲加载失败'
    }
  } finally {
    if (token === detailRequestToken) {
      detailLoading.value = false
    }
  }
}

watch(activeRankingId, (id) => {
  if (!id) {
    rankingDetail.value = null
    detailError.value = ''
    detailLoading.value = false
    return
  }

  void loadRankingDetail(id)
})

onMounted(() => {
  void loadRankings()
})
</script>

<template>
  <section class="rankings-page">
    <div v-if="rankingsLoading" class="rankings-state">排行榜加载中...</div>
    <div v-else-if="rankingsError" class="rankings-state rankings-state--error">
      <span>{{ rankingsError }}</span>
      <button class="rankings-state__action" type="button" @click="loadRankings">
        <RefreshCw :size="14" :stroke-width="2" />
        <span>重新加载</span>
      </button>
    </div>
    <div v-else-if="rankings.length === 0" class="rankings-state">暂时没有可用榜单。</div>

    <template v-else>
      <aside class="ranking-nav" aria-label="排行榜列表">
        <header class="ranking-nav__head">
          <div class="ranking-nav__icon">
            <BarChart3 :size="18" :stroke-width="2.2" />
          </div>
          <div>
            <h1>排行榜</h1>
            <p>共 {{ rankings.length }} 个榜单</p>
          </div>
        </header>

        <div class="ranking-nav__list">
          <button
            v-for="(ranking, index) in rankings"
            :key="ranking.id"
            class="ranking-nav__item"
            :class="{ 'ranking-nav__item--active': ranking.id === activeRankingId }"
            type="button"
            @click="selectRanking(ranking.id)"
          >
            <img
              class="ranking-nav__cover"
              :src="ranking.coverUrl || FALLBACK_COVER_URL"
              :alt="ranking.name"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="handleCoverError"
            />
            <div class="ranking-nav__copy">
              <div class="ranking-nav__name">
                <Crown v-if="index === 0" class="ranking-nav__crown" :stroke-width="2" />
                <span>{{ ranking.name }}</span>
              </div>
              <div class="ranking-nav__meta">{{ ranking.updateFrequency || '最近更新' }}</div>
              <div v-if="ranking.previewTracks.length" class="ranking-nav__preview">
                {{ ranking.previewTracks.map((track) => track.title).join(' / ') }}
              </div>
            </div>
          </button>
        </div>
      </aside>

      <section class="ranking-main">
        <header class="ranking-hero">
          <img
            class="ranking-hero__cover"
            :src="activeRanking?.coverUrl || FALLBACK_COVER_URL"
            :alt="activeRanking?.name || '排行榜'"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />

          <div class="ranking-hero__content">
            <div class="ranking-hero__badges">
              <span class="ranking-hero__badge ranking-hero__badge--accent">
                <TrendingUp :size="13" :stroke-width="2.2" />
                <span>{{ activeRanking?.updateFrequency || '榜单' }}</span>
              </span>
              <span class="ranking-hero__badge">{{ updatedAtLabel }}</span>
            </div>

            <h2>{{ activeRanking?.name || '排行榜' }}</h2>
            <p>{{ activeDescription }}</p>

            <div class="ranking-hero__stats">
              <span>{{ activeRanking?.trackCount || activeTracks.length }} 首歌曲</span>
              <span>{{ formatPlayCount(activeRanking?.playCount) }} 次播放</span>
              <span>{{ formatPlayCount(activeRanking?.subscribedCount) }} 收藏</span>
            </div>

            <button class="ranking-hero__play" type="button" :disabled="!hasPlayableTracks" @click="playAll">
              <Play :size="16" :stroke-width="2.3" />
              <span>播放全部</span>
            </button>
          </div>
        </header>

        <section class="ranking-table" aria-label="榜单歌曲">
          <div class="ranking-table__row ranking-table__row--head">
            <div class="ranking-table__cell ranking-table__cell--rank">#</div>
            <div class="ranking-table__cell">歌曲</div>
            <div class="ranking-table__cell ranking-table__cell--artist">歌手</div>
            <div class="ranking-table__cell ranking-table__cell--album">专辑</div>
            <div class="ranking-table__cell ranking-table__cell--time">时长</div>
            <div class="ranking-table__cell ranking-table__cell--actions">操作</div>
          </div>

          <div v-if="detailLoading && activeTracks.length === 0" class="ranking-table__state">
            正在加载榜单歌曲...
          </div>
          <div v-else-if="detailError && activeTracks.length === 0" class="ranking-table__state ranking-table__state--error">
            <span>{{ detailError }}</span>
            <button class="ranking-table__reload" type="button" @click="loadRankingDetail(activeRankingId)">
              <RefreshCw :size="14" :stroke-width="2" />
              <span>重试</span>
            </button>
          </div>
          <div v-else-if="activeTracks.length === 0" class="ranking-table__state">这个榜单暂时没有歌曲。</div>

          <div v-else class="ranking-table__body">
            <article
              v-for="(song, index) in activeTracks"
              :key="song.id"
              class="ranking-table__row ranking-table__row--song song-action-row"
              :class="{
                'ranking-table__row--active': currentTrack?.id === song.id,
                'ranking-table__row--disabled': song.playable === false,
              }"
              :tabindex="song.playable === false ? -1 : 0"
              role="button"
              :aria-disabled="song.playable === false"
              @click="handleTrackSelect(song)"
              @keydown.enter.prevent="handleTrackSelect(song)"
              @keydown.space.prevent="handleTrackSelect(song)"
            >
              <div class="ranking-table__cell ranking-table__cell--rank">
                <span v-if="currentTrack?.id !== song.id" :class="{ 'ranking-table__top-rank': index < 3 }">
                  {{ formatRank(index) }}
                </span>
                <span v-else class="ranking-table__equalizer" :class="{ 'ranking-table__equalizer--paused': !isPlaying }">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>

              <div class="ranking-table__cell">
                <div class="ranking-table__song">
                  <img
                    class="ranking-table__cover"
                    :src="song.coverUrl || activeRanking?.coverUrl || FALLBACK_COVER_URL"
                    :alt="song.name"
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    @error="handleCoverError"
                  />
                  <div class="ranking-table__copy">
                    <div class="ranking-table__title">{{ song.name }}</div>
                    <div class="ranking-table__mobile-artists">
                      <template v-if="song.artists.length">
                        <template v-for="(artist, artistIndex) in song.artists" :key="`${artist.id || artist.name}-${artistIndex}`">
                          <button
                            class="ranking-table__artist-link"
                            type="button"
                            :title="artist.id ? `打开歌手 ${artist.name}` : `搜索歌手 ${artist.name}`"
                            @click.stop="handleOpenArtist(artist)"
                          >
                            {{ artist.name }}
                          </button>
                          <span v-if="artistIndex < song.artists.length - 1" class="ranking-table__artist-separator"> / </span>
                        </template>
                      </template>
                      <span v-else>未知歌手</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ranking-table__cell ranking-table__cell--artist">
                <template v-if="song.artists.length">
                  <template v-for="(artist, artistIndex) in song.artists" :key="`${artist.id || artist.name}-${artistIndex}`">
                    <button
                      class="ranking-table__artist-link"
                      type="button"
                      :title="artist.id ? `打开歌手 ${artist.name}` : `搜索歌手 ${artist.name}`"
                      @click.stop="handleOpenArtist(artist)"
                    >
                      {{ artist.name }}
                    </button>
                    <span v-if="artistIndex < song.artists.length - 1" class="ranking-table__artist-separator"> / </span>
                  </template>
                </template>
                <span v-else>未知歌手</span>
              </div>

              <div class="ranking-table__cell ranking-table__cell--album">
                <button
                  class="ranking-table__album-link"
                  type="button"
                  :title="song.albumName"
                  :aria-label="`打开专辑 ${song.albumName}`"
                  @click.stop="handleOpenAlbum(song)"
                >
                  {{ song.albumName }}
                </button>
              </div>
              <div class="ranking-table__cell ranking-table__cell--time">{{ formatDurationMs(song.duration) }}</div>
              <div class="ranking-table__cell ranking-table__cell--actions">
                <SongRowActions
                  :disabled="song.playable === false"
                  :is-downloaded="isLocalSong(song.id)"
                  :is-favorite="isFavoriteSong(song.id)"
                  @download="downloadSong(song)"
                  @favorite="toggleFavoriteSong(song)"
                  @play="handleTrackSelect(song)"
                  @play-next="playNextSong(song)"
                />
              </div>
            </article>
          </div>
        </section>
      </section>
    </template>
  </section>
</template>

<style scoped lang="scss">
.rankings-page {
  width: 100%;
  min-width: 0;
  min-height: 100%;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
  color: #fff;
}

.rankings-state {
  grid-column: 1 / -1;
  min-height: 340px;
  padding: 28px;
  display: grid;
  place-items: center;
  gap: 14px;
  border: 1px solid rgba(214, 207, 255, 0.16);
  background:
    radial-gradient(circle at 18% 18%, rgba(32, 210, 161, 0.14), transparent 24%),
    radial-gradient(circle at 68% 28%, rgba(108, 160, 255, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(18, 12, 58, 0.6);
  color: rgba(245, 247, 255, 0.82);
  text-align: center;
}

.rankings-state--error {
  color: #ffd7e4;
}

.rankings-state__action,
.ranking-table__reload {
  min-height: 34px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
}

.ranking-nav,
.ranking-main {
  min-width: 0;
}

.ranking-nav {
  position: sticky;
  top: 0;
  align-self: start;
  max-height: calc(100dvh - var(--layout-player-height, 78px) - 72px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(205, 196, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)),
    rgba(16, 14, 50, 0.78);
  box-shadow: 0 18px 34px rgba(7, 7, 28, 0.18);
}

.ranking-nav__head {
  min-height: 60px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.ranking-nav__icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(32, 210, 161, 0.14);
  color: #7bf1cf;
}

.ranking-nav__head h1 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.ranking-nav__head p {
  margin: 4px 0 0;
  color: rgba(225, 232, 255, 0.54);
  font-size: 12px;
}

.ranking-nav__list {
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.ranking-nav__list::-webkit-scrollbar,
.ranking-table__body::-webkit-scrollbar {
  width: 10px;
}

.ranking-nav__list::-webkit-scrollbar-thumb,
.ranking-table__body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

.ranking-nav__item {
  width: 100%;
  min-height: 58px;
  padding: 6px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background 180ms ease,
    transform 180ms ease;
}

.ranking-nav__item:hover,
.ranking-nav__item:focus-visible,
.ranking-nav__item--active {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
}

.ranking-nav__item:hover {
  transform: translateY(-1px);
}

.ranking-nav__item--active {
  box-shadow: inset 0 0 0 1px rgba(123, 241, 207, 0.2);
}

.ranking-nav__cover {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.ranking-nav__copy {
  min-width: 0;
}

.ranking-nav__name {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(250, 252, 255, 0.96);
  font-size: 12px;
  font-weight: 700;
}

.ranking-nav__name span,
.ranking-nav__meta,
.ranking-nav__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-nav__crown {
  width: 13px;
  height: 13px;
  flex: none;
  color: #ffe08a;
}

.ranking-nav__meta {
  margin-top: 3px;
  color: rgba(225, 232, 255, 0.56);
  font-size: 11px;
}

.ranking-nav__preview {
  margin-top: 3px;
  color: rgba(225, 232, 255, 0.38);
  font-size: 11px;
}

.ranking-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 12px;
}

.ranking-hero {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 16px;
  overflow: hidden;
  padding: 16px;
  border: 1px solid rgba(205, 196, 255, 0.18);
  background:
    radial-gradient(circle at 82% 16%, rgba(32, 210, 161, 0.16), transparent 26%),
    radial-gradient(circle at 18% 70%, rgba(255, 94, 167, 0.1), transparent 22%),
    linear-gradient(135deg, rgba(44, 31, 106, 0.9), rgba(16, 24, 74, 0.92));
  box-shadow: 0 22px 48px rgba(8, 7, 34, 0.22);
}

.ranking-hero__cover {
  width: 128px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 34px rgba(7, 7, 28, 0.3);
}

.ranking-hero__content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.ranking-hero__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ranking-hero__badge {
  min-height: 22px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(247, 244, 255, 0.82);
  font-size: 11px;
}

.ranking-hero__badge--accent {
  background: rgba(32, 210, 161, 0.14);
  color: #b8ffe9;
}

.ranking-hero h2 {
  margin: 10px 0 6px;
  color: rgba(251, 250, 255, 0.98);
  font-size: 28px;
  line-height: 1.16;
}

.ranking-hero p {
  max-width: 820px;
  margin: 0;
  color: rgba(239, 241, 255, 0.68);
  font-size: 12px;
  line-height: 1.6;
}

.ranking-hero__stats {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  color: rgba(235, 240, 255, 0.78);
  font-size: 12px;
}

.ranking-hero__play {
  width: fit-content;
  height: 34px;
  margin-top: 12px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #20d2a1, #5e7cff);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.ranking-hero__play:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.ranking-hero__play:not(:disabled):hover {
  transform: translateY(-1px);
}

.ranking-table {
  overflow: hidden;
  border: 1px solid rgba(196, 189, 255, 0.14);
  background:
    radial-gradient(circle at 20% 60%, rgba(32, 210, 161, 0.08), transparent 20%),
    radial-gradient(circle at 52% 18%, rgba(192, 81, 255, 0.1), transparent 20%),
    linear-gradient(135deg, rgba(24, 21, 56, 0.88), rgba(12, 11, 42, 0.94));
}

.ranking-table__row {
  display: grid;
  grid-template-columns: 40px minmax(220px, 1.6fr) minmax(130px, 0.85fr) minmax(130px, 0.85fr) 62px 136px;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 14px;
}

.ranking-table__row--head {
  min-height: 40px;
  color: rgba(235, 240, 255, 0.44);
  font-size: 11px;
  background: rgba(12, 11, 40, 0.88);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.ranking-table__row--head .ranking-table__cell--time,
.ranking-table__row--head .ranking-table__cell--actions {
  justify-self: end;
  text-align: right;
}

.ranking-table__body {
  max-height: 820px;
  overflow: auto;
}

.ranking-table__row--song {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 180ms ease;
}

.ranking-table__row--song:last-child {
  border-bottom: 0;
}

.ranking-table__row--song:hover,
.ranking-table__row--song:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.05);
}

.ranking-table__row--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08)),
    rgba(255, 255, 255, 0.04);
}

.ranking-table__row--disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.ranking-table__cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-table__cell--rank,
.ranking-table__cell--time {
  color: rgba(235, 240, 255, 0.56);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.ranking-table__cell--time,
.ranking-table__cell--actions {
  justify-self: end;
}

.ranking-table__top-rank {
  color: #7bf1cf;
  font-weight: 800;
}

.ranking-table__song {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ranking-table__cover {
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 10px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.ranking-table__copy {
  min-width: 0;
}

.ranking-table__title,
.ranking-table__mobile-artists {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-table__title {
  color: rgba(250, 252, 255, 0.96);
  font-size: 13px;
  font-weight: 700;
}

.ranking-table__mobile-artists {
  display: none;
  margin-top: 5px;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.ranking-table__cell--artist,
.ranking-table__cell--album {
  color: rgba(226, 233, 255, 0.56);
  font-size: 11px;
}

.ranking-table__artist-link {
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: color 180ms ease;
}

.ranking-table__artist-link:hover,
.ranking-table__artist-link:focus-visible {
  color: rgba(255, 255, 255, 0.92);
  outline: none;
}

.ranking-table__album-link {
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: color 180ms ease;
}

.ranking-table__album-link:hover,
.ranking-table__album-link:focus-visible {
  color: rgba(255, 255, 255, 0.92);
  outline: none;
}

.ranking-table__artist-separator {
  color: rgba(226, 233, 255, 0.34);
}

.ranking-table__action {
  width: 30px;
  height: 30px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(242, 246, 255, 0.74);
  cursor: pointer;
}

.ranking-table__action:hover {
  background: rgba(255, 255, 255, 0.1);
}

.ranking-table__action--favorite {
  color: #ff7e9f;
}

.ranking-table__state {
  min-height: 220px;
  padding: 24px;
  display: grid;
  place-items: center;
  gap: 12px;
  color: rgba(234, 239, 255, 0.58);
  text-align: center;
}

.ranking-table__state--error {
  color: #ffd7e4;
}

.ranking-table__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #7bf1cf;
}

.ranking-table__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.ranking-table__equalizer span:nth-child(1) {
  height: 7px;
}

.ranking-table__equalizer span:nth-child(2) {
  height: 13px;
  animation-delay: 0.18s;
}

.ranking-table__equalizer span:nth-child(3) {
  height: 9px;
  animation-delay: 0.34s;
}

.ranking-table__equalizer--paused span {
  height: 10px;
  animation: none;
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
  .rankings-page {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .ranking-table__row {
    grid-template-columns: 38px minmax(200px, 1.5fr) minmax(120px, 0.9fr) 62px 132px;
  }

  .ranking-table__cell--album {
    display: none;
  }
}

@media (max-width: 900px) {
  .rankings-page {
    grid-template-columns: 1fr;
  }

  .ranking-nav {
    position: static;
    max-height: none;
  }

  .ranking-nav__list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: visible;
  }

  .ranking-hero {
    grid-template-columns: 116px minmax(0, 1fr);
  }

  .ranking-hero__cover {
    width: 116px;
  }

  .ranking-hero h2 {
    font-size: 24px;
  }

  .ranking-table__row {
    grid-template-columns: 34px minmax(0, 1fr) 60px 128px;
  }

  .ranking-table__cell--artist {
    display: none;
  }

  .ranking-table__mobile-artists {
    display: block;
  }
}

@media (max-width: 640px) {
  .ranking-nav__list {
    grid-template-columns: 1fr;
  }

  .ranking-hero {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .ranking-hero__cover {
    width: min(140px, 100%);
  }

  .ranking-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 128px;
    gap: 12px;
    padding: 0 12px;
  }

  .ranking-table__cell--time {
    display: none;
  }

  .ranking-table__row--head .ranking-table__cell--actions {
    justify-self: end;
  }
}
</style>
