import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  searchMvs,
  searchPlaylists,
  searchSongs,
  type SearchCategory,
  type SearchSong,
} from '@/api/search'
import { usePlayerStore } from '@/stores/player'
import type { ArtistRef } from '@/types/music'
import { resolveAlbumRoute } from '@/utils/albumRoute'
import { buildPlayerTrack } from '@/utils/playerTrack'
import { getPageSize, getSearchTypeLabel } from './constants'
import type { SearchResultState } from './types'
import {
  buildSearchRoute,
  getRouteKeyword,
  getRoutePage,
  getRouteSearchType,
  normalizeMvResult,
  normalizePlaylistResult,
  normalizeSongResult,
} from './utils'

// 搜索页的“页面状态容器”。
// 这里把路由解析、搜索请求、分页切换、播放器联动都集中管理，
// 组件层只负责接 props 渲染，避免展示组件里再混业务逻辑。
export function useSearchPage() {
  const route = useRoute()
  const router = useRouter()
  const playerStore = usePlayerStore()
  const { currentTrack, isPlaying } = storeToRefs(playerStore)

  const loading = ref(false)
  const error = ref('')
  const searchResult = ref<SearchResultState | null>(null)
  let searchRequestToken = 0

  const activeType = computed(() => getRouteSearchType(route.query))
  const activeTypeLabel = computed(() => getSearchTypeLabel(activeType.value))
  const hasKeyword = computed(() => Boolean(getRouteKeyword(route.query)))
  const currentPage = computed(() => getRoutePage(route.query))
  const currentPageSize = computed(() => getPageSize(activeType.value))
  const currentTrackId = computed(() => currentTrack.value?.id)

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
  const canPlayAll = computed(() => playableSongs.value.length > 0)
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
  const searchKeyword = computed(() => searchResult.value?.keyword ?? getRouteKeyword(route.query))

  async function loadSearch(keyword: string, type: SearchCategory, page: number) {
    // requestToken 用来丢弃过期请求，避免用户连续切页/切类型时旧响应把新结果覆盖掉。
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

      // 当 URL 里的 page 超出最大页数时，直接把路由修正到最后一页，
      // 让地址栏和展示结果始终保持一致。
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
    const keyword = getRouteKeyword(route.query)

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

    const keyword = getRouteKeyword(route.query)
    await router.push(buildSearchRoute(keyword, type, 1))
  }

  function toPlayerTrack(song: SearchSong) {
    return buildPlayerTrack({
      id: song.id,
      title: song.name,
      artists: song.artists,
      artistNames: song.artistNames,
      albumId: song.albumId,
      albumName: song.albumName,
      coverUrl: song.coverUrl,
      durationMs: song.duration,
    })
  }

  function handleTrackSelect(song: SearchSong) {
    if (song.playable === false) {
      return
    }

    // 点中当前歌曲时直接切换播放状态，保持和常见音乐播放器一致的交互。
    if (currentTrack.value?.id === song.id) {
      void playerStore.togglePlay()
      return
    }

    // 搜索结果播放时，把当前页“可播放歌曲”转成播放器队列，
    // 这样用户可以从任意一首开始连续播放这一页结果。
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

  async function openArtist(artist: ArtistRef) {
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

  async function openAlbum(song: Pick<SearchSong, 'id' | 'albumId' | 'albumName'>) {
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

  watch(
    () => [getRouteKeyword(route.query), getRouteSearchType(route.query), getRoutePage(route.query)],
    ([keyword, type, page]) => {
      // 这个页面把“路由”当成唯一数据源。
      // 不管是顶部搜索框、tab 切换还是分页按钮，最终都通过改 URL 来驱动页面刷新。
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

  return {
    activeType,
    activeTypeLabel,
    canPlayAll,
    changePage,
    currentPage,
    currentTrackId,
    error,
    formattedTotalCount,
    handleTrackSelect,
    hasKeyword,
    hasNextPage,
    hasPreviousPage,
    isPlaying,
    loading,
    mvItems,
    openAlbum,
    openArtist,
    playAll,
    playlistItems,
    searchKeyword,
    searchResult,
    songItems,
    startIndex,
    switchSearchType,
    totalPages,
    visibleItemCount,
  }
}
