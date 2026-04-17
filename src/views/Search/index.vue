<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Disc3,
  Download,
  Info,
  LibraryBig,
  Play,
} from 'lucide-vue-next'
import {
  searchMvs,
  searchPlaylists,
  searchSongs,
  type SearchCategory,
  type SearchMv,
  type SearchMvsResponse,
  type SearchPlaylist,
  type SearchPlaylistsResponse,
  type SearchSong,
  type SearchSongsResponse,
} from '@/api/search'
import { usePlayerStore } from '@/stores/player'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'

type SearchResultState =
  | {
      type: 'song'
      keyword: string
      total: number
      items: SearchSong[]
    }
  | {
      type: 'playlist'
      keyword: string
      total: number
      items: SearchPlaylist[]
    }
  | {
      type: 'mv'
      keyword: string
      total: number
      items: SearchMv[]
    }

interface SearchTypeOption {
  value: SearchCategory
  label: string
}

const DEFAULT_SEARCH_TYPE: SearchCategory = 'song'
const SEARCH_TYPE_OPTIONS: SearchTypeOption[] = [
  { value: 'song', label: '单曲' },
  { value: 'playlist', label: '歌单' },
  { value: 'mv', label: 'MV' },
]
const SEARCH_PAGE_SIZES: Record<SearchCategory, number> = {
  song: 40,
  playlist: 18,
  mv: 18,
}
const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23f35bb4'/%3E%3Cstop offset='1' stop-color='%23508dff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='44' r='16' fill='rgba(255,255,255,.7)'/%3E%3Crect x='30' y='68' width='60' height='22' rx='11' fill='rgba(255,255,255,.46)'/%3E%3C/svg%3E"

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const loading = ref(false)
const error = ref('')
const searchResult = ref<SearchResultState | null>(null)
let searchRequestToken = 0

const activeType = computed(() => getRouteSearchType())
const activeTypeLabel = computed(() => {
  if (activeType.value === 'playlist') {
    return '歌单'
  }

  if (activeType.value === 'mv') {
    return 'MV'
  }

  return '单曲'
})
const hasKeyword = computed(() => Boolean(getRouteKeyword()))
const currentPage = computed(() => getRoutePage())
const currentPageSize = computed(() => getPageSize(activeType.value))
const songItems = computed(() => (searchResult.value?.type === 'song' ? searchResult.value.items : []))
const playlistItems = computed(() =>
  searchResult.value?.type === 'playlist' ? searchResult.value.items : [],
)
const mvItems = computed(() => (searchResult.value?.type === 'mv' ? searchResult.value.items : []))
const visibleItemCount = computed(() => {
  if (searchResult.value?.type === 'song') {
    return songItems.value.length
  }

  if (searchResult.value?.type === 'playlist') {
    return playlistItems.value.length
  }

  if (searchResult.value?.type === 'mv') {
    return mvItems.value.length
  }

  return 0
})
const playableSongs = computed(() => songItems.value.filter((song) => song.playable !== false))
const totalPages = computed(() => {
  if (!searchResult.value) {
    return 1
  }

  return Math.max(1, Math.ceil(searchResult.value.total / currentPageSize.value))
})
const hasPreviousPage = computed(() => currentPage.value > 1)
const hasNextPage = computed(() => currentPage.value < totalPages.value)
const startIndex = computed(() => (currentPage.value - 1) * currentPageSize.value)
const formattedTotalCount = computed(() => (searchResult.value?.total ?? 0).toLocaleString())
const searchKeyword = computed(() => searchResult.value?.keyword ?? getRouteKeyword())

function getPageSize(type: SearchCategory) {
  return SEARCH_PAGE_SIZES[type]
}

function getNormalizedQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function getRouteKeyword() {
  return getNormalizedQueryValue(route.query.q)
}

function getRouteSearchType(): SearchCategory {
  const queryValue = getNormalizedQueryValue(route.query.type)

  if (queryValue === 'playlist' || queryValue === 'mv' || queryValue === 'song') {
    return queryValue
  }

  return DEFAULT_SEARCH_TYPE
}

function getRoutePage() {
  const rawValue = Number(getNormalizedQueryValue(route.query.page))

  if (!Number.isFinite(rawValue) || rawValue < 1) {
    return 1
  }

  return Math.floor(rawValue)
}

function buildSearchRoute(keyword: string, type: SearchCategory, page = 1) {
  const query: Record<string, string> = {}

  if (keyword) {
    query.q = keyword
  }

  if (type !== DEFAULT_SEARCH_TYPE) {
    query.type = type
  }

  if (page > 1) {
    query.page = String(page)
  }

  return {
    path: '/search',
    query,
  }
}

function normalizeSongResult(response: SearchSongsResponse): SearchResultState {
  return {
    type: 'song',
    keyword: response.keyword,
    total: response.total,
    items: response.songs,
  }
}

function normalizePlaylistResult(response: SearchPlaylistsResponse): SearchResultState {
  return {
    type: 'playlist',
    keyword: response.keyword,
    total: response.total,
    items: response.playlists,
  }
}

function normalizeMvResult(response: SearchMvsResponse): SearchResultState {
  return {
    type: 'mv',
    keyword: response.keyword,
    total: response.total,
    items: response.mvs,
  }
}

async function loadSearch(keyword: string, type: SearchCategory, page: number) {
  const requestToken = ++searchRequestToken
  const pageSize = getPageSize(type)
  const offset = (page - 1) * pageSize

  loading.value = true
  error.value = ''

  try {
    let nextState: SearchResultState

    if (type === 'song') {
      nextState = normalizeSongResult(await searchSongs(keyword, { limit: pageSize, offset }))
    } else if (type === 'playlist') {
      nextState = normalizePlaylistResult(await searchPlaylists(keyword, { limit: pageSize, offset }))
    } else {
      nextState = normalizeMvResult(await searchMvs(keyword, { limit: pageSize, offset }))
    }

    if (requestToken !== searchRequestToken) {
      return
    }

    const maxPage = Math.max(1, Math.ceil(nextState.total / pageSize))

    if (page > maxPage) {
      await router.replace(buildSearchRoute(keyword, type, maxPage))
      return
    }

    searchResult.value = nextState
  } catch (err) {
    if (requestToken !== searchRequestToken) {
      return
    }

    searchResult.value = null
    error.value = err instanceof Error ? err.message : '搜索失败，请稍后再试'
  } finally {
    if (requestToken === searchRequestToken) {
      loading.value = false
    }
  }
}

async function changePage(nextPage: number) {
  const keyword = getRouteKeyword()

  if (!keyword) {
    return
  }

  const safePage = Math.min(Math.max(nextPage, 1), totalPages.value)

  if (safePage === currentPage.value) {
    return
  }

  await router.push(buildSearchRoute(keyword, activeType.value, safePage))
}

async function switchSearchType(type: SearchCategory) {
  if (type === activeType.value) {
    return
  }

  const keyword = getRouteKeyword()
  await router.push(buildSearchRoute(keyword, type, 1))
}

function toPlayerTrack(song: SearchSong) {
  return buildPlayerTrack({
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    coverUrl: song.coverUrl,
    durationMs: song.duration,
  })
}

function formatPlayCount(value?: number) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return '0'
  }

  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, '')} 亿`
  }

  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(1).replace(/\.0$/, '')} 万`
  }

  return String(Math.round(value))
}

function formatTrackCount(value?: number) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return '0 首'
  }

  return `${Math.round(value)} 首`
}

function handleCoverError(event: Event) {
  const img = event.target as HTMLImageElement | null

  if (!img || img.dataset.fallbackApplied === 'true') {
    return
  }

  img.dataset.fallbackApplied = 'true'
  img.src = FALLBACK_COVER_URL
}

function handleTrackSelect(song: SearchSong) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = playableSongs.value.map(toPlayerTrack)
  const startAt = queue.findIndex((item) => item.id === song.id)

  if (startAt < 0) {
    return
  }

  void playerStore.playQueue(queue, startAt)
}

function playAll() {
  const queue = playableSongs.value.map(toPlayerTrack)

  if (queue.length === 0) {
    return
  }

  void playerStore.playQueue(queue, 0)
}

watch(
  () => [route.query.q, route.query.type, route.query.page],
  ([queryKeyword]) => {
    const keyword = getNormalizedQueryValue(queryKeyword)
    const type = getRouteSearchType()
    const page = getRoutePage()

    if (!keyword) {
      searchRequestToken += 1
      loading.value = false
      error.value = ''
      searchResult.value = null
      return
    }

    void loadSearch(keyword, type, page)
  },
  { immediate: true },
)
</script>

<template>
  <section class="search-page">
    <article class="search-shell">
      <header class="search-toolbar search-toolbar--compact">
        <div class="search-toolbar__left">
          <div class="search-tabs" role="tablist" aria-label="搜索类型">
            <button
              v-for="option in SEARCH_TYPE_OPTIONS"
              :key="option.value"
              class="search-tabs__item"
              :class="{ 'search-tabs__item--active': option.value === activeType }"
              :aria-selected="option.value === activeType"
              role="tab"
              type="button"
              @click="switchSearchType(option.value)"
            >
              <Disc3 v-if="option.value === 'song'" class="search-tabs__icon" :stroke-width="1.85" />
              <LibraryBig
                v-else-if="option.value === 'playlist'"
                class="search-tabs__icon"
                :stroke-width="1.85"
              />
              <Clapperboard v-else class="search-tabs__icon" :stroke-width="1.85" />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <div v-if="hasKeyword" class="search-toolbar__right">
          <button
            v-if="activeType === 'song'"
            class="search-toolbar__play-all"
            type="button"
            :disabled="playableSongs.length === 0"
            @click="playAll"
          >
            <Play class="search-toolbar__play-icon" :stroke-width="2" />
            <span>播放全部</span>
          </button>

          <div class="search-toolbar__query">
            <span>搜索</span>
            <strong>"{{ searchKeyword }}"</strong>
          </div>
          <div class="search-toolbar__count">{{ formattedTotalCount }} 条结果</div>

          <div class="search-pager" aria-label="分页">
            <button
              class="search-pager__button"
              type="button"
              :disabled="!hasPreviousPage"
              @click="changePage(currentPage - 1)"
            >
              <ChevronLeft :stroke-width="1.9" />
            </button>
            <span class="search-pager__label">{{ currentPage }} / {{ totalPages }}</span>
            <button
              class="search-pager__button"
              type="button"
              :disabled="!hasNextPage"
              @click="changePage(currentPage + 1)"
            >
              <ChevronRight :stroke-width="1.9" />
            </button>
          </div>
        </div>
      </header>

      <div v-if="!hasKeyword" class="search-status search-status--inline">
        在顶部固定搜索框输入关键词后，这里会展示 {{ activeTypeLabel }} 结果并支持分页。
      </div>

      <div v-else-if="error" class="search-status search-status--error">{{ error }}</div>
      <div v-else-if="loading && !searchResult" class="search-status search-status--inline">
        正在搜索 {{ activeTypeLabel }}...
      </div>
      <div v-else-if="searchResult && visibleItemCount === 0" class="search-status search-status--inline">
        没有找到相关 {{ activeTypeLabel }}。
      </div>

      <section v-else-if="searchResult" class="search-board" :class="`search-board--${searchResult.type}`">
        <div class="search-board__scroll">
          <div v-if="searchResult.type === 'song'" class="search-table__row search-table__row--head">
            <div class="search-table__cell search-table__cell--rank">#</div>
            <div class="search-table__cell">歌曲</div>
            <div class="search-table__cell search-table__cell--artist">歌手</div>
            <div class="search-table__cell search-table__cell--album">专辑</div>
            <div class="search-table__cell search-table__cell--numeric">时长</div>
            <div class="search-table__cell search-table__cell--actions">操作</div>
          </div>

          <div v-else-if="searchResult.type === 'playlist'" class="search-table__row search-table__row--head">
            <div class="search-table__cell search-table__cell--rank">#</div>
            <div class="search-table__cell">歌单</div>
            <div class="search-table__cell search-table__cell--artist">创建者</div>
            <div class="search-table__cell search-table__cell--numeric">曲目</div>
            <div class="search-table__cell search-table__cell--numeric">播放量</div>
          </div>

          <div v-else class="search-table__row search-table__row--head">
            <div class="search-table__cell search-table__cell--rank">#</div>
            <div class="search-table__cell">MV</div>
            <div class="search-table__cell search-table__cell--artist">歌手</div>
            <div class="search-table__cell search-table__cell--numeric">时长</div>
            <div class="search-table__cell search-table__cell--numeric">播放量</div>
          </div>

          <div v-if="searchResult.type === 'song'" class="search-table__body">
            <article
              v-for="(song, index) in songItems"
              :key="song.id"
              class="search-table__row search-table__row--interactive"
              :class="{
                'search-table__row--active': currentTrack?.id === song.id,
                'search-table__row--disabled': song.playable === false,
              }"
              :tabindex="song.playable === false ? -1 : 0"
              role="button"
              :aria-disabled="song.playable === false"
              @click="handleTrackSelect(song)"
              @keydown.enter.prevent="handleTrackSelect(song)"
              @keydown.space.prevent="handleTrackSelect(song)"
            >
              <div class="search-table__cell search-table__cell--rank">
                <span v-if="currentTrack?.id !== song.id">{{ startIndex + index + 1 }}</span>
                <span v-else class="search-table__equalizer" :class="{ 'search-table__equalizer--paused': !isPlaying }">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>

              <div class="search-table__cell">
                <div class="search-table__main">
                  <img
                    class="search-table__cover"
                    :src="song.coverUrl"
                    :alt="song.name"
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                    referrerpolicy="no-referrer"
                    @error="handleCoverError"
                  />
                  <div class="search-table__copy">
                    <div class="search-table__title">{{ song.name }}</div>
                    <div class="search-table__sub search-table__sub--mobile">
                      {{ song.artistNames.join(' / ') || '未知歌手' }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="search-table__cell search-table__cell--artist">
                {{ song.artistNames.join(' / ') || '未知歌手' }}
              </div>
              <div class="search-table__cell search-table__cell--album">{{ song.albumName }}</div>
              <div class="search-table__cell search-table__cell--numeric">
                {{ formatDurationMs(song.duration) }}
              </div>
              <div class="search-table__cell search-table__cell--actions">
                <button class="search-table__action" type="button" title="歌曲详情稍后支持" @click.stop>
                  <Info :stroke-width="1.9" />
                </button>
                <button class="search-table__action" type="button" title="下载稍后支持" @click.stop>
                  <Download :stroke-width="1.9" />
                </button>
              </div>
            </article>
          </div>

          <div v-else-if="searchResult.type === 'playlist'" class="search-table__body">
            <article v-for="(playlist, index) in playlistItems" :key="playlist.id" class="search-table__row">
              <div class="search-table__cell search-table__cell--rank">{{ startIndex + index + 1 }}</div>
              <div class="search-table__cell">
                <div class="search-table__main">
                  <img
                    class="search-table__cover"
                    :src="playlist.coverUrl"
                    :alt="playlist.name"
                    loading="lazy"
                    decoding="async"
                    fetchpriority="low"
                    referrerpolicy="no-referrer"
                    @error="handleCoverError"
                  />
                  <div class="search-table__copy">
                    <div class="search-table__title">{{ playlist.name }}</div>
                    <div class="search-table__sub">
                      {{ playlist.description || '公开歌单结果，后面可以继续接歌单详情。' }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="search-table__cell search-table__cell--artist">
                {{ playlist.creatorName || '未知创建者' }}
              </div>
              <div class="search-table__cell search-table__cell--numeric">
                {{ formatTrackCount(playlist.trackCount) }}
              </div>
              <div class="search-table__cell search-table__cell--numeric">
                {{ formatPlayCount(playlist.playCount) }}
              </div>
            </article>
          </div>

          <div v-else class="search-table__body">
            <article v-for="(mv, index) in mvItems" :key="mv.id" class="search-table__row">
              <div class="search-table__cell search-table__cell--rank">{{ startIndex + index + 1 }}</div>
              <div class="search-table__cell">
                <div class="search-table__main">
                  <div class="search-table__cover-frame">
                    <img
                      class="search-table__cover search-table__cover--wide"
                      :src="mv.coverUrl"
                      :alt="mv.name"
                      loading="lazy"
                      decoding="async"
                      fetchpriority="low"
                      referrerpolicy="no-referrer"
                      @error="handleCoverError"
                    />
                    <span class="search-table__duration-badge">{{ formatDurationMs(mv.duration) }}</span>
                  </div>
                  <div class="search-table__copy">
                    <div class="search-table__title">{{ mv.name }}</div>
                    <div class="search-table__sub">MV 结果先支持搜索浏览，后面可以继续接播放页和详情页。</div>
                  </div>
                </div>
              </div>
              <div class="search-table__cell search-table__cell--artist">
                {{ mv.artistNames.join(' / ') || '未知歌手' }}
              </div>
              <div class="search-table__cell search-table__cell--numeric">
                {{ formatDurationMs(mv.duration) }}
              </div>
              <div class="search-table__cell search-table__cell--numeric">
                {{ formatPlayCount(mv.playCount) }}
              </div>
            </article>
          </div>
        </div>

        <div v-if="loading" class="search-board__overlay">正在更新这一页结果...</div>
      </section>
    </article>
  </section>
</template>

<style scoped lang="scss">
.search-page {
  width: 100%;
}

.search-shell {
  position: relative;
  display: grid;
  gap: 18px;
  min-height: 0;
  padding: 24px 24px 18px;
  overflow: hidden;
  border-radius: 30px;
  background:
    radial-gradient(circle at 12% 88%, rgba(255, 72, 159, 0.24), transparent 28%),
    radial-gradient(circle at 36% 84%, rgba(255, 183, 71, 0.18), transparent 25%),
    radial-gradient(circle at 58% 76%, rgba(90, 232, 148, 0.2), transparent 28%),
    radial-gradient(circle at 86% 78%, rgba(255, 124, 52, 0.18), transparent 22%),
    linear-gradient(135deg, rgba(71, 25, 117, 0.92), rgba(15, 28, 74, 0.9) 38%, rgba(14, 11, 44, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 26px 80px rgba(4, 8, 28, 0.28);
  backdrop-filter: blur(22px);
}

.search-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 18%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.04));
}

.search-toolbar,
.search-status,
.search-board {
  position: relative;
  z-index: 1;
}

.search-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.search-toolbar__left,
.search-toolbar__right {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.search-tabs {
  display: inline-flex;
  align-items: center;
  width: 152px;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(20, 11, 51, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-tabs__item {
  height: 24px;
  min-width: 0;
  flex: 1;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(234, 240, 255, 0.58);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease;
}

.search-tabs__item:hover {
  color: rgba(250, 252, 255, 0.9);
}

.search-tabs__item--active {
  color: #fff;
  background: linear-gradient(180deg, #ff6bbf, #ef4c8a);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 4px 10px rgba(239, 76, 138, 0.24);
}

.search-tabs__icon {
  width: 10px;
  height: 10px;
  flex: none;
}

.search-toolbar__right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.search-toolbar__play-all {
  width: 74px;
  height: 24px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(180deg, #ff61b4, #ef4c8a);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 6px 14px rgba(239, 76, 138, 0.2);
}

.search-toolbar__play-all:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

.search-toolbar__play-icon,
.search-toolbar__query-icon {
  width: 10px;
  height: 10px;
  flex: none;
}

.search-toolbar__query,
.search-toolbar__count {
  color: rgba(232, 238, 255, 0.72);
  font-size: 12px;
  white-space: nowrap;
}

.search-toolbar__query {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: min(28vw, 220px);
  overflow: hidden;
}

.search-toolbar__query strong {
  color: #ff8ec7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.search-pager {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(17, 13, 46, 0.44);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.search-pager__button {
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(240, 244, 255, 0.82);
  cursor: pointer;
}

.search-pager__button:disabled {
  cursor: not-allowed;
  opacity: 0.28;
}

.search-pager__label {
  min-width: 42px;
  color: rgba(244, 247, 255, 0.88);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.search-toolbar__search-form {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.search-toolbar__search-field,
.search-empty__field {
  min-width: min(360px, 72vw);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  background: rgba(18, 12, 48, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.search-toolbar__field-icon,
.search-empty__field-icon {
  width: 16px;
  height: 16px;
  color: rgba(234, 239, 255, 0.6);
}

.search-toolbar__search-input,
.search-empty__input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 14px;
}

.search-toolbar__search-input::placeholder,
.search-empty__input::placeholder {
  color: rgba(226, 234, 255, 0.42);
}

.search-toolbar__search-submit,
.search-empty__submit {
  height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(180deg, #ff6cc1, #ee4c8a);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 10px 20px rgba(238, 76, 138, 0.2);
}

.search-status {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(12, 10, 36, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.search-empty__hint,
.search-status {
  color: rgba(232, 238, 255, 0.78);
  font-size: 14px;
}

.search-status--inline {
  min-height: 72px;
  display: grid;
  place-items: center;
}

.search-status--error {
  color: #ffd8e6;
}

.search-board {
  position: relative;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(8, 9, 31, 0.78), rgba(14, 11, 37, 0.68)),
    rgba(9, 8, 28, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 44px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.search-board__scroll {
  max-height: min(64vh, 690px);
  overflow: auto;
}

.search-board__scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.search-board__scroll::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

.search-board__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: start center;
  padding-top: 18px;
  background: linear-gradient(180deg, rgba(10, 9, 34, 0.32), rgba(10, 9, 34, 0.12));
  color: rgba(244, 247, 255, 0.86);
  font-size: 13px;
  pointer-events: none;
}

.search-table__row {
  display: grid;
  align-items: center;
  gap: 16px;
  min-height: 58px;
  padding: 0 18px;
}

.search-board--song .search-table__row {
  grid-template-columns: 42px minmax(280px, 1.9fr) minmax(180px, 1.15fr) minmax(180px, 1.1fr) 74px 92px;
}

.search-board--playlist .search-table__row,
.search-board--mv .search-table__row {
  grid-template-columns: 42px minmax(340px, 2fr) minmax(180px, 1.05fr) 88px 108px;
}

.search-table__row--head {
  position: sticky;
  top: 0;
  z-index: 2;
  min-height: 48px;
  color: rgba(239, 244, 255, 0.5);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background:
    linear-gradient(180deg, rgba(27, 23, 60, 0.9), rgba(17, 15, 46, 0.84)),
    rgba(18, 16, 50, 0.86);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(18px);
}

.search-table__body .search-table__row {
  color: rgba(247, 249, 255, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.search-table__body .search-table__row:last-child {
  border-bottom: 0;
}

.search-table__row--interactive {
  cursor: pointer;
  transition:
    background 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.search-table__row--interactive:hover {
  background: rgba(255, 255, 255, 0.06);
}

.search-table__row--interactive:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.07);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.search-table__row--active {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.08));
}

.search-table__row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-table__cell {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-table__cell--rank,
.search-table__cell--numeric {
  color: rgba(236, 241, 255, 0.58);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.search-table__cell--numeric {
  text-align: right;
}

.search-table__cell--actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.search-table__main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-table__cover-frame {
  position: relative;
  flex-shrink: 0;
}

.search-table__cover {
  width: 42px;
  height: 42px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.search-table__cover--wide {
  width: 84px;
  height: 48px;
  border-radius: 14px;
}

.search-table__duration-badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(5, 6, 18, 0.68);
  color: #fff;
  font-size: 10px;
  line-height: 1;
}

.search-table__copy {
  min-width: 0;
}

.search-table__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(250, 252, 255, 0.96);
  font-size: 14px;
  font-weight: 600;
}

.search-table__sub,
.search-table__cell--artist,
.search-table__cell--album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.search-table__sub {
  margin-top: 4px;
}

.search-table__sub--mobile {
  display: none;
}

.search-table__action {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(242, 246, 255, 0.76);
  cursor: pointer;
  transition: background 180ms ease;
}

.search-table__action:hover {
  background: rgba(255, 255, 255, 0.12);
}

.search-table__action svg {
  width: 14px;
  height: 14px;
}

.search-table__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #ff72bb;
}

.search-table__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.search-table__equalizer span:nth-child(1) {
  height: 7px;
}

.search-table__equalizer span:nth-child(2) {
  height: 13px;
  animation-delay: 0.18s;
}

.search-table__equalizer span:nth-child(3) {
  height: 9px;
  animation-delay: 0.34s;
}

.search-table__equalizer--paused span {
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

@media (max-width: 1200px) {
  .search-toolbar {
    align-items: start;
  }

  .search-toolbar,
  .search-toolbar__right {
    display: grid;
  }

  .search-toolbar__right {
    justify-content: start;
  }

  .search-board--song .search-table__row {
    grid-template-columns: 38px minmax(220px, 1.7fr) minmax(150px, 1fr) minmax(140px, 0.9fr) 66px 86px;
  }
}

@media (max-width: 960px) {
  .search-shell {
    padding: 18px 16px 14px;
  }

  .search-toolbar__search-form,
  .search-empty__form {
    width: 100%;
    display: grid;
  }

  .search-toolbar__search-field,
  .search-empty__field {
    min-width: 0;
    width: 100%;
  }

  .search-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .search-tabs__item {
    justify-content: center;
  }

  .search-board--song .search-table__row {
    grid-template-columns: 34px minmax(0, 1.5fr) minmax(0, 1fr) 64px 78px;
  }

  .search-board--playlist .search-table__row,
  .search-board--mv .search-table__row {
    grid-template-columns: 34px minmax(0, 1.6fr) minmax(0, 1fr) 86px;
  }

  .search-table__cell--album {
    display: none;
  }

  .search-board--playlist .search-table__cell--numeric:first-of-type {
    display: none;
  }
}

@media (max-width: 720px) {
  .search-toolbar__query strong {
    font-size: 22px;
  }

  .search-board__scroll {
    max-height: none;
  }

  .search-board--song .search-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 60px;
  }

  .search-board--playlist .search-table__row,
  .search-board--mv .search-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 88px;
  }

  .search-table__cell--artist,
  .search-table__cell--actions {
    display: none;
  }

  .search-table__sub--mobile {
    display: block;
  }

  .search-table__cover--wide {
    width: 72px;
    height: 42px;
  }
}

@media (max-width: 560px) {
  .search-toolbar__query,
  .search-toolbar__count {
    font-size: 12px;
  }

  .search-toolbar__query strong {
    font-size: 18px;
  }

  .search-toolbar__right {
    gap: 10px;
  }

  .search-pager {
    width: 100%;
    justify-content: space-between;
  }

  .search-empty h1 {
    font-size: 40px;
  }

  .search-board--playlist .search-table__row,
  .search-board--mv .search-table__row {
    grid-template-columns: 26px minmax(0, 1fr);
  }

  .search-table__cell--numeric {
    display: none;
  }

  .search-table__row {
    gap: 12px;
    padding: 0 12px;
  }
}
</style>
