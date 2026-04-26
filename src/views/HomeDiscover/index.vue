<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, Play } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import {
  getHotArtists,
  getHotSongs,
  getPlaylistCategories,
  getRecommendedPlaylists,
  type HomeArtist,
  type HomePlaylist,
  type HomeSong,
  type PlaylistCategoryGroup,
} from '@/api/home'
import SongRowActions from '@/components/SongRowActions.vue'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { usePlayerStore } from '@/stores/player'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'

type DiscoverSection = 'playlists' | 'artists' | 'songs'

interface SectionConfig {
  key: DiscoverSection
  title: string
}

interface FilterOption<T extends string | number> {
  label: string
  value: T
}

const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23ff5faf'/%3E%3Cstop offset='1' stop-color='%2351a8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='240' rx='42' fill='url(%23g)'/%3E%3Ccircle cx='120' cy='94' r='30' fill='rgba(255,255,255,.72)'/%3E%3Crect x='58' y='146' width='124' height='38' rx='19' fill='rgba(255,255,255,.48)'/%3E%3C/svg%3E"
const PAGE_SIZE: Record<DiscoverSection, number> = {
  artists: 30,
  playlists: 30,
  songs: 40,
}
const SECTIONS: SectionConfig[] = [
  {
    key: 'playlists',
    title: '推荐歌单',
  },
  {
    key: 'artists',
    title: '歌手',
  },
  {
    key: 'songs',
    title: '推荐歌曲',
  },
]
const ARTIST_AREA_OPTIONS: Array<FilterOption<number>> = [
  { label: '全部', value: -1 },
  { label: '华语', value: 7 },
  { label: '韩国', value: 16 },
  { label: '日本', value: 8 },
  { label: '欧美', value: 96 },
  { label: '入驻音乐人', value: -2 },
  { label: '其他', value: 0 },
]
const ARTIST_TYPE_OPTIONS: Array<FilterOption<number>> = [
  { label: '全部', value: -1 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
  { label: '组合', value: 3 },
]
const ARTIST_INITIAL_OPTIONS: Array<FilterOption<string | number>> = [
  { label: '全部', value: -1 },
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => ({ label: letter, value: letter.toLowerCase() })),
  { label: '#', value: 0 },
]
const QUICK_PLAYLIST_TAGS = ['Hi-Res', '精选', '经典', '网络', '游戏', 'DJ热碟', '情歌对唱', '舞曲', 'KTV']
const FALLBACK_PLAYLIST_GROUPS: PlaylistCategoryGroup[] = [
  {
    id: 'language',
    name: '语种',
    tags: ['华语', '欧美', '日语', '韩语', '粤语', '小语种', '法语'],
  },
  {
    id: 'style',
    name: '风格',
    tags: ['流行', '古风', '电子', '民谣', '摇滚', '说唱', '后摇', '中国风', 'R&B/Soul', '古典', '乡村', '爵士', '新世纪', '布鲁斯', '拉丁', '轻音乐', '中国传统', '金属', '雷鬼', '另类/独立'],
  },
  {
    id: 'mood',
    name: '心情',
    tags: ['怀旧', '伤感', '安静', '兴奋', '轻松', '治愈', '快乐', '甜蜜', '寂寞', '感动', '小清新', '励志', '减压', '失恋'],
  },
  {
    id: 'age',
    name: '年代',
    tags: ['70后', '80后', '90后', '00后'],
  },
]

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const libraryStore = useMusicLibraryStore()
const { currentTrack, isPlaying } = storeToRefs(playerStore)

const loadSentinel = ref<HTMLElement | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const hasMore = ref(true)
const categoriesLoading = ref(false)
const categoriesError = ref('')
const categories = ref<PlaylistCategoryGroup[]>([])
const playlists = ref<HomePlaylist[]>([])
const artists = ref<HomeArtist[]>([])
const songs = ref<HomeSong[]>([])
const playlistTag = ref('全部')
const playlistPanelOpen = ref(false)
const artistArea = ref(-1)
const artistType = ref(-1)
const artistInitial = ref<string | number>(-1)

let requestToken = 0
let categoriesLoaded = false
let loadObserver: IntersectionObserver | null = null

const activeSection = computed<DiscoverSection>(() => {
  const value = route.params.section
  const section = Array.isArray(value) ? value[0] : value

  return section === 'artists' || section === 'songs' || section === 'playlists'
    ? section
    : 'playlists'
})
const activeConfig = computed(() => SECTIONS.find((item) => item.key === activeSection.value) ?? SECTIONS[0])
const activeItems = computed(() => {
  if (activeSection.value === 'artists') {
    return artists.value
  }

  if (activeSection.value === 'songs') {
    return songs.value
  }

  return playlists.value
})
const visiblePlaylistGroups = computed(() => {
  const groups = categories.value.length > 0 ? categories.value : FALLBACK_PLAYLIST_GROUPS

  return groups.filter((group) => group.tags.length > 0)
})

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

function handleCoverError(event: Event) {
  const image = event.target as HTMLImageElement | null

  if (!image || image.dataset.fallbackApplied === 'true') {
    return
  }

  image.dataset.fallbackApplied = 'true'
  image.src = FALLBACK_COVER_URL
}

function scrollToTop() {
  const scrollRoot = getPageScrollRoot()

  if (scrollRoot) {
    scrollRoot.scrollTo({
      top: 0,
      behavior: 'auto',
    })
    return
  }

  if (typeof window !== 'undefined') {
    window.scrollTo({
      top: 0,
      behavior: 'auto',
    })
  }
}

function openPlaylist(id: string) {
  if (!id) {
    return
  }

  void router.push({
    name: 'playlist-detail',
    params: { id },
  })
}

function openArtist(id: string) {
  if (!id) {
    return
  }

  void router.push({
    name: 'artist-detail',
    params: { id },
  })
}

function setPlaylistTag(tag: string) {
  if (!tag || tag === playlistTag.value) {
    return
  }

  playlistTag.value = tag
}

function togglePlaylistPanel() {
  playlistPanelOpen.value = !playlistPanelOpen.value

  if (playlistPanelOpen.value) {
    void loadPlaylistCategories()
  }
}

function setArtistArea(value: number) {
  artistArea.value = value
}

function setArtistType(value: number) {
  artistType.value = value
}

function setArtistInitial(value: string | number) {
  artistInitial.value = value
}

function toPlayerTrack(song: HomeSong) {
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

function createSongQueue() {
  return songs.value.filter((item) => item.playable !== false).map(toPlayerTrack)
}

function playSong(song: HomeSong) {
  if (song.playable === false) {
    return
  }

  if (currentTrack.value?.id === song.id) {
    void playerStore.togglePlay()
    return
  }

  const queue = createSongQueue()
  const startIndex = queue.findIndex((item) => item.id === song.id)

  if (startIndex < 0) {
    return
  }

  void playerStore.playQueue(queue, startIndex)
}

function playNextSong(song: HomeSong) {
  if (song.playable === false) {
    return
  }

  void playerStore.enqueueNextTrack(toPlayerTrack(song))
}

function downloadSong(song: HomeSong) {
  if (song.playable === false) {
    return
  }

  libraryStore.addLocalTrack(toPlayerTrack(song))
}

function toggleFavoriteSong(song: HomeSong) {
  libraryStore.toggleFavorite(toPlayerTrack(song))
}

function isFavoriteSong(songId: string) {
  return libraryStore.isFavorite(songId)
}

function isLocalSong(songId: string) {
  return libraryStore.isLocalTrack(songId)
}

function playAllSongs() {
  const queue = createSongQueue()

  if (queue.length === 0) {
    return
  }

  void playerStore.playQueue(queue, 0)
}

function mergeUniqueById<T extends { id: string }>(previousItems: T[], nextItems: T[]) {
  const seenIds = new Set(previousItems.map((item) => item.id))
  const uniqueItems = nextItems.filter((item) => {
    if (!item.id || seenIds.has(item.id)) {
      return false
    }

    seenIds.add(item.id)
    return true
  })

  return [...previousItems, ...uniqueItems]
}

async function loadPlaylistCategories() {
  if (categoriesLoaded || categoriesLoading.value) {
    return
  }

  categoriesLoading.value = true
  categoriesError.value = ''

  try {
    categories.value = await getPlaylistCategories()
    categoriesLoaded = true
  } catch (err) {
    categoriesError.value = err instanceof Error ? err.message : '分类加载失败'
  } finally {
    categoriesLoading.value = false
  }
}

async function fetchPage(section: DiscoverSection, offset: number) {
  const limit = PAGE_SIZE[section]

  if (section === 'artists') {
    return getHotArtists(limit, {
      area: artistArea.value === -2 ? -1 : artistArea.value,
      initial: artistInitial.value,
      offset,
      type: artistType.value,
    })
  }

  if (section === 'songs') {
    return getHotSongs(limit, {
      offset,
      source: 'top',
      type: 0,
    })
  }

  return getRecommendedPlaylists(limit, {
    cat: playlistTag.value,
    offset,
    order: 'hot',
  })
}

async function loadSectionPage(reset = false) {
  if ((loading.value || loadingMore.value) && !reset) {
    return
  }

  const section = activeSection.value
  const token = reset ? ++requestToken : requestToken
  const offset = reset ? 0 : activeItems.value.length

  if (reset) {
    loading.value = true
    hasMore.value = true
    error.value = ''
  } else {
    if (!hasMore.value) {
      return
    }

    loadingMore.value = true
  }

  try {
    const data = await fetchPage(section, offset)

    if (token !== requestToken) {
      return
    }

    if (section === 'artists') {
      artists.value = reset ? data as HomeArtist[] : mergeUniqueById(artists.value, data as HomeArtist[])
    } else if (section === 'songs') {
      songs.value = reset ? data as HomeSong[] : mergeUniqueById(songs.value, data as HomeSong[])
    } else {
      playlists.value = reset ? data as HomePlaylist[] : mergeUniqueById(playlists.value, data as HomePlaylist[])
    }

    hasMore.value = data.length >= PAGE_SIZE[section]
  } catch (err) {
    if (token === requestToken) {
      if (reset) {
        error.value = err instanceof Error ? err.message : '内容加载失败'
      }

      hasMore.value = false
    }
  } finally {
    if (token === requestToken) {
      loading.value = false
      loadingMore.value = false
      scheduleLoadObserver()
    }
  }
}

function getPageScrollRoot() {
  if (typeof document === 'undefined') {
    return null
  }

  const scrollRoot = document.querySelector<HTMLElement>('.layout__view-scroll')

  if (!scrollRoot) {
    return null
  }

  const overflowY = window.getComputedStyle(scrollRoot).overflowY

  return overflowY === 'auto' || overflowY === 'scroll' ? scrollRoot : null
}

function observeLoadSentinel() {
  loadObserver?.disconnect()
  loadObserver = null

  if (typeof IntersectionObserver === 'undefined' || !loadSentinel.value) {
    return
  }

  loadObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadSectionPage(false)
      }
    },
    {
      root: getPageScrollRoot(),
      rootMargin: '320px 0px',
      threshold: 0,
    },
  )
  loadObserver.observe(loadSentinel.value)
}

function scheduleLoadObserver() {
  void nextTick(() => {
    observeLoadSentinel()
  })
}

onMounted(() => {
  scheduleLoadObserver()
})

onBeforeUnmount(() => {
  loadObserver?.disconnect()
})

watch(
  () => [
    activeSection.value,
    playlistTag.value,
    artistArea.value,
    artistType.value,
    artistInitial.value,
  ],
  () => {
    scrollToTop()
    void loadSectionPage(true)
  },
  { immediate: true },
)
</script>

<template>
  <section class="discover-page">
    <header class="discover-title">
      <h1>{{ activeConfig.title }}</h1>
    </header>

    <section v-if="activeSection === 'artists'" class="filter-panel filter-panel--artist" aria-label="歌手筛选">
      <div class="filter-panel__row filter-panel__row--cards">
        <button
          v-for="option in ARTIST_AREA_OPTIONS"
          :key="`${option.label}-${option.value}`"
          class="filter-panel__tile"
          :class="{ 'filter-panel__tile--active': artistArea === option.value }"
          type="button"
          @click="setArtistArea(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="filter-panel__row filter-panel__row--cards filter-panel__row--compact">
        <button
          v-for="option in ARTIST_TYPE_OPTIONS"
          :key="option.value"
          class="filter-panel__tile"
          :class="{ 'filter-panel__tile--active': artistType === option.value }"
          type="button"
          @click="setArtistType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="filter-panel__row filter-panel__row--letters">
        <button
          v-for="option in ARTIST_INITIAL_OPTIONS"
          :key="option.value"
          class="filter-panel__letter"
          :class="{ 'filter-panel__letter--active': artistInitial === option.value }"
          type="button"
          @click="setArtistInitial(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section v-if="activeSection === 'playlists'" class="filter-panel filter-panel--playlist" aria-label="歌单筛选">
      <div class="filter-panel__row filter-panel__row--playlist">
        <button
          v-for="tag in QUICK_PLAYLIST_TAGS"
          :key="tag"
          class="filter-panel__tile"
          :class="{ 'filter-panel__tile--active': playlistTag === tag }"
          type="button"
          @click="setPlaylistTag(tag)"
        >
          {{ tag }}
        </button>
        <button
          class="filter-panel__tile filter-panel__tile--dropdown"
          :class="{ 'filter-panel__tile--active': playlistTag === '全部' }"
          type="button"
          @click="togglePlaylistPanel"
        >
          <span>全部</span>
          <ChevronDown class="filter-panel__chevron" :class="{ 'filter-panel__chevron--open': playlistPanelOpen }" />
        </button>
      </div>

      <div v-if="playlistPanelOpen" class="playlist-category-panel">
        <div v-if="categoriesLoading" class="playlist-category-panel__state">分类加载中...</div>
        <div v-else-if="categoriesError" class="playlist-category-panel__state playlist-category-panel__state--error">
          {{ categoriesError }}
        </div>
        <template v-else>
          <section
            v-for="group in visiblePlaylistGroups"
            :key="group.id"
            class="playlist-category-group"
          >
            <h3>{{ group.name }}</h3>
            <div class="playlist-category-group__tags">
              <button
                v-for="tag in group.tags"
                :key="`${group.id}-${tag}`"
                class="playlist-category-group__tag"
                :class="{ 'playlist-category-group__tag--active': playlistTag === tag }"
                type="button"
                @click="setPlaylistTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </section>
        </template>
      </div>
    </section>

    <div v-if="loading" class="discover-state">正在加载...</div>
    <div v-else-if="error" class="discover-state discover-state--error">{{ error }}</div>

    <section v-else-if="activeSection === 'playlists'" class="playlist-grid" aria-label="推荐歌单列表">
      <button
        v-for="item in playlists"
        :key="item.id"
        class="playlist-card"
        type="button"
        @click="openPlaylist(item.id)"
      >
        <div class="playlist-card__cover">
          <img
            :src="item.coverUrl || FALLBACK_COVER_URL"
            :alt="item.title"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />
          <span class="playlist-card__count">{{ formatPlayCount(item.playCount) }} 播放</span>
        </div>
        <div class="playlist-card__title">{{ item.title }}</div>
        <div class="playlist-card__meta">
          <span>{{ item.description || playlistTag }}</span>
          <span v-if="item.trackCount">{{ item.trackCount }} 首</span>
        </div>
      </button>
    </section>

    <section v-else-if="activeSection === 'artists'" class="artist-grid" aria-label="推荐歌手列表">
      <button
        v-for="item in artists"
        :key="item.id"
        class="artist-card"
        type="button"
        @click="openArtist(item.id)"
      >
        <img
          class="artist-card__avatar"
          :src="item.avatarUrl || FALLBACK_COVER_URL"
          :alt="item.name"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          @error="handleCoverError"
        />
        <div class="artist-card__name">{{ item.name }}</div>
        <div class="artist-card__meta">{{ item.musicCount ? `${item.musicCount} 首歌曲` : '热门歌手' }}</div>
      </button>
    </section>

    <section v-else class="song-panel" aria-label="推荐单曲列表">
      <div class="song-panel__head">
        <div>
          <div class="song-panel__eyebrow">Queue</div>
          <h2>推荐播放队列</h2>
        </div>
        <button class="song-panel__play-all" type="button" :disabled="songs.length === 0" @click="playAllSongs">
          <Play class="song-panel__play-icon" :stroke-width="2.2" />
          <span>播放全部</span>
        </button>
      </div>

      <div class="song-list">
        <article
          v-for="(song, index) in songs"
          :key="song.id"
          class="song-row song-action-row"
          :class="{
            'song-row--active': currentTrack?.id === song.id,
            'song-row--disabled': song.playable === false,
          }"
          :tabindex="song.playable === false ? -1 : 0"
          role="button"
          :aria-disabled="song.playable === false"
          @click="playSong(song)"
          @keydown.enter.prevent="playSong(song)"
          @keydown.space.prevent="playSong(song)"
        >
          <div class="song-row__rank">
            <span v-if="currentTrack?.id !== song.id">{{ index + 1 }}</span>
            <span v-else class="song-row__equalizer" :class="{ 'song-row__equalizer--paused': !isPlaying }">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
          <img
            class="song-row__cover"
            :src="song.coverUrl || FALLBACK_COVER_URL"
            :alt="song.name"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            @error="handleCoverError"
          />
          <div class="song-row__copy">
            <div class="song-row__title">{{ song.name }}</div>
            <div class="song-row__artists">{{ song.artistNames.join(' / ') || '未知歌手' }}</div>
          </div>
          <div class="song-row__album">{{ song.albumName || '单曲精选' }}</div>
          <div class="song-row__duration">{{ formatDurationMs(song.duration) }}</div>
          <div class="song-row__actions">
            <SongRowActions
              :disabled="song.playable === false"
              :is-downloaded="isLocalSong(song.id)"
              :is-favorite="isFavoriteSong(song.id)"
              @download="downloadSong(song)"
              @favorite="toggleFavoriteSong(song)"
              @play="playSong(song)"
              @play-next="playNextSong(song)"
            />
          </div>
        </article>
      </div>
    </section>

    <div v-if="!loading && !error" ref="loadSentinel" class="load-status">
      <span v-if="loadingMore">继续加载中...</span>
      <span v-else-if="hasMore">向下滚动加载更多</span>
      <span v-else>已加载全部可用内容</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.discover-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  padding-bottom: 12px;
}

.filter-panel button,
.playlist-card,
.artist-card,
.song-panel__play-all,
.song-row {
  font: inherit;
}

.song-panel__eyebrow {
  color: rgba(225, 231, 255, 0.56);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.discover-title {
  flex: 0 0 auto;
  padding: 0 4px;
}

.discover-title h1 {
  margin: 0;
  color: rgba(252, 250, 255, 0.98);
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.filter-panel {
  flex: 0 0 auto;
  padding: 22px 24px;
  border-radius: 0;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 111, 206, 0.14), transparent 26%),
    radial-gradient(circle at 82% 14%, rgba(75, 160, 255, 0.16), transparent 28%),
    linear-gradient(135deg, rgba(79, 24, 145, 0.62), rgba(22, 24, 92, 0.72));
  border: 1px solid var(--app-border);
  color: rgba(246, 248, 255, 0.88);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 36px rgba(8, 6, 30, 0.14);
}

.filter-panel__row {
  display: grid;
  gap: 14px 16px;
}

.filter-panel__row + .filter-panel__row {
  margin-top: 18px;
}

.filter-panel__row--cards {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.filter-panel__row--compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: min(550px, 100%);
}

.filter-panel__row--playlist {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.filter-panel__row--letters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 21px;
}

.filter-panel__tile {
  min-height: 45px;
  padding: 0 14px;
  border: 0;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(239, 243, 255, 0.76);
  cursor: pointer;
  font-size: 16px;
  text-align: center;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.filter-panel__tile:hover {
  transform: translateY(-1px);
}

.filter-panel__tile--active {
  background: #1d8cff;
  color: #fff;
}

.filter-panel__tile--dropdown {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.filter-panel__chevron {
  width: 15px;
  height: 15px;
  transition: transform 180ms ease;
}

.filter-panel__chevron--open {
  transform: rotate(180deg);
}

.filter-panel__letter {
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(239, 243, 255, 0.78);
  cursor: pointer;
  font-size: 17px;
  line-height: 1.4;
}

.filter-panel__letter--active {
  color: #1d8cff;
}

.playlist-category-panel {
  margin-top: 22px;
  padding-top: 6px;
}

.playlist-category-panel__state {
  min-height: 120px;
  display: grid;
  place-items: center;
  color: rgba(226, 233, 255, 0.64);
}

.playlist-category-panel__state--error {
  color: #b4485f;
}

.playlist-category-group {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 20px;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.playlist-category-group h3 {
  margin: 0;
  color: rgba(252, 250, 255, 0.96);
  font-size: 22px;
  line-height: 1.3;
}

.playlist-category-group__tags {
  display: grid;
  grid-template-columns: repeat(7, minmax(72px, 1fr));
  gap: 18px 28px;
}

.playlist-category-group__tag {
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(231, 237, 255, 0.78);
  cursor: pointer;
  font-size: 15px;
  line-height: 1.6;
  text-align: left;
}

.playlist-category-group__tag--active {
  color: #1d8cff;
}

.discover-state {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  min-height: 260px;
  border-radius: 28px;
  background: rgba(20, 13, 63, 0.46);
  color: rgba(243, 246, 255, 0.76);
}

.discover-state--error {
  color: #ffd4e4;
}

.playlist-grid {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 18px 14px;
}

.playlist-card,
.artist-card {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 180ms ease;
}

.playlist-card:hover,
.playlist-card:focus-visible,
.artist-card:hover,
.artist-card:focus-visible {
  outline: none;
  transform: translateY(-3px);
}

.playlist-card__cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.08);
}

.playlist-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 220ms ease;
}

.playlist-card:hover .playlist-card__cover img {
  transform: scale(1.05);
}

.playlist-card__count {
  position: absolute;
  right: 10px;
  top: 10px;
  min-height: 24px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(10, 8, 28, 0.64);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11px;
}

.playlist-card__title,
.artist-card__name {
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(250, 251, 255, 0.96);
  font-weight: 700;
}

.playlist-card__title {
  display: -webkit-box;
  min-height: 40px;
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.playlist-card__meta,
.artist-card__meta {
  overflow: hidden;
  margin-top: 6px;
  display: flex;
  gap: 8px;
  color: rgba(218, 226, 255, 0.56);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artist-grid {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 22px 18px;
}

.artist-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.artist-card__avatar {
  width: min(100%, 132px);
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 0 0 4px rgba(103, 78, 220, 0.14),
    0 14px 26px rgba(8, 5, 27, 0.2);
}

.artist-card__name {
  max-width: 100%;
  margin-top: 12px;
  font-size: 14px;
  white-space: nowrap;
}

.artist-card__meta {
  justify-content: center;
}

.song-panel {
  flex: 0 0 auto;
  overflow: visible;
  border: 1px solid rgba(196, 189, 255, 0.14);
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 60%, rgba(113, 255, 131, 0.08), transparent 20%),
    radial-gradient(circle at 52% 18%, rgba(192, 81, 255, 0.12), transparent 20%),
    linear-gradient(135deg, rgba(24, 21, 56, 0.88), rgba(12, 11, 42, 0.94));
}

.song-panel__head {
  min-height: 68px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.song-panel__head h2 {
  margin: 4px 0 0;
  color: rgba(250, 252, 255, 0.96);
  font-size: 18px;
}

.song-panel__play-all {
  height: 38px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff43a9, #ff6ca2);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.song-panel__play-all:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.song-panel__play-icon {
  width: 15px;
  height: 15px;
}

.song-list {
  display: grid;
}

.song-row {
  display: grid;
  grid-template-columns: 42px 48px minmax(0, 1.3fr) minmax(150px, 0.7fr) 68px 136px;
  align-items: center;
  gap: 14px;
  min-height: 70px;
  padding: 0 18px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 180ms ease;
}

.song-row:last-child {
  border-bottom: 0;
}

.song-row:hover,
.song-row:focus-visible {
  outline: none;
  background: rgba(255, 255, 255, 0.05);
}

.song-row--active {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.08)),
    rgba(255, 255, 255, 0.04);
}

.song-row--disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.song-row__rank,
.song-row__duration {
  color: rgba(235, 240, 255, 0.56);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.song-row__cover {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.song-row__copy {
  min-width: 0;
}

.song-row__title,
.song-row__artists,
.song-row__album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-row__title {
  color: rgba(250, 252, 255, 0.96);
  font-size: 14px;
  font-weight: 700;
}

.song-row__artists {
  margin-top: 5px;
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.song-row__album {
  color: rgba(226, 233, 255, 0.52);
  font-size: 12px;
}

.song-row__duration {
  text-align: right;
}

.song-row__actions {
  display: flex;
  justify-content: flex-end;
  color: rgba(239, 244, 255, 0.6);
}

.song-row__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 2px;
  height: 14px;
  color: #ff72bb;
}

.song-row__equalizer span {
  width: 3px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.song-row__equalizer span:nth-child(1) {
  height: 7px;
}

.song-row__equalizer span:nth-child(2) {
  height: 13px;
  animation-delay: 0.18s;
}

.song-row__equalizer span:nth-child(3) {
  height: 9px;
  animation-delay: 0.34s;
}

.song-row__equalizer--paused span {
  height: 10px;
  animation: none;
}

.load-status {
  flex: 0 0 auto;
  min-height: 46px;
  display: grid;
  place-items: center;
  color: rgba(225, 232, 255, 0.58);
  font-size: 12px;
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

@media (max-width: 1180px) {
  .playlist-grid,
  .artist-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .filter-panel__row--cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .filter-panel__row--playlist {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .playlist-category-group__tags {
    grid-template-columns: repeat(4, minmax(72px, 1fr));
  }
}

@media (max-width: 900px) {
  .discover-page {
    min-height: 100%;
  }

  .playlist-grid,
  .artist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-panel__row--cards,
  .filter-panel__row--compact,
  .filter-panel__row--playlist {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .playlist-category-group {
    grid-template-columns: 1fr;
  }

  .playlist-category-group__tags {
    grid-template-columns: repeat(3, minmax(72px, 1fr));
  }

  .song-row {
    grid-template-columns: 34px 44px minmax(0, 1fr) 62px 128px;
  }

  .song-row__album {
    display: none;
  }
}

@media (max-width: 560px) {
  .filter-panel {
    border-radius: 0;
    padding: 18px;
  }

  .playlist-grid,
  .artist-grid {
    grid-template-columns: 1fr;
  }

  .filter-panel__row--cards,
  .filter-panel__row--compact,
  .filter-panel__row--playlist {
    grid-template-columns: 1fr;
  }

  .filter-panel__row--letters {
    gap: 8px 14px;
  }

  .playlist-category-group__tags {
    grid-template-columns: repeat(2, minmax(72px, 1fr));
  }

  .song-panel__head {
    align-items: flex-start;
    flex-direction: column;
    padding: 16px;
  }

  .song-row {
    grid-template-columns: 28px 42px minmax(0, 1fr);
    gap: 10px;
    padding: 0 12px;
  }

  .song-row__duration,
  .song-row__actions {
    display: none;
  }
}
</style>
