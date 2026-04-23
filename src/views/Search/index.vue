<script setup lang="ts">
import { ref } from 'vue'
import type { SongCommentSeed } from '@/api/comment'
import type { MvPlaybackSeed } from '@/api/mv'
import type { SearchMv, SearchSong } from '@/api/search'
import SongCommentsDialog from '@/components/comments/SongCommentsDialog.vue'
import MvPlayerDialog from '@/views/Mv/components/MvPlayerDialog.vue'
import SearchMvGrid from './components/SearchMvGrid.vue'
import SearchPlaylistGrid from './components/SearchPlaylistGrid.vue'
import SearchSongTable from './components/SearchSongTable.vue'
import SearchToolbar from './components/SearchToolbar.vue'
import { SEARCH_TYPE_OPTIONS } from './constants'
import { useSearchPage } from './useSearchPage'

// 搜索页本身只负责“页面装配”：
// - 搜歌曲的逻辑交给 useSearchPage
// - MV 播放逻辑复用现成的 MvPlayerDialog
// 这样页面层不会把搜索状态和播放器状态搅在一起。
const {
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
  playAll,
  playlistItems,
  searchKeyword,
  searchResult,
  songItems,
  startIndex,
  switchSearchType,
  totalPages,
  visibleItemCount,
} = useSearchPage()

// 这里复用和 MV 精选页同一套播放器弹层。
// activeMv 保存当前点击的那张 MV 卡片的最小播放信息；
// playerVisible 只关心弹层开关。
const activeMv = ref<MvPlaybackSeed | null>(null)
const playerVisible = ref(false)
const activeSong = ref<SongCommentSeed | null>(null)
const songCommentsVisible = ref(false)

// 搜索结果里的 SearchMv 结构和播放器要求的最小结构并不完全同名，
// 这里做一次轻量映射，让搜索页和精选页最终都走同一个播放器组件。
function handleMvSelect(mv: SearchMv) {
  activeMv.value = {
    id: mv.id,
    title: mv.name,
    artistNames: mv.artistNames,
    coverUrl: mv.coverUrl,
  }
  playerVisible.value = true
}

function handleSongComments(song: SearchSong) {
  activeSong.value = {
    id: song.id,
    title: song.name,
    artistNames: song.artistNames,
    albumName: song.albumName,
    coverUrl: song.coverUrl,
    duration: song.duration,
  }
  songCommentsVisible.value = true
}
</script>

<template>
  <section class="search-page">
    <article class="search-shell">
      <SearchToolbar
        :active-type="activeType"
        :can-play-all="canPlayAll"
        :current-page="currentPage"
        :formatted-total-count="formattedTotalCount"
        :has-keyword="hasKeyword"
        :has-next-page="hasNextPage"
        :has-previous-page="hasPreviousPage"
        :options="SEARCH_TYPE_OPTIONS"
        :search-keyword="searchKeyword"
        :total-pages="totalPages"
        @change-page="changePage"
        @play-all="playAll"
        @switch-type="switchSearchType"
      />

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
        <div class="search-board__scroll" :class="{ 'search-board__scroll--cards': searchResult.type !== 'song' }">
          <SearchSongTable
            v-if="searchResult.type === 'song'"
            :current-track-id="currentTrackId"
            :is-playing="isPlaying"
            :songs="songItems"
            :start-index="startIndex"
            @select-track="handleTrackSelect"
            @show-comments="handleSongComments"
          />
          <SearchPlaylistGrid v-else-if="searchResult.type === 'playlist'" :playlists="playlistItems" />
          <SearchMvGrid v-else :mvs="mvItems" @select-mv="handleMvSelect" />
        </div>

        <div v-if="loading" class="search-board__overlay">正在更新这一页结果...</div>
      </section>
    </article>

    <MvPlayerDialog v-model="playerVisible" :mv="activeMv" />
    <SongCommentsDialog v-model="songCommentsVisible" :song="activeSong" />
  </section>
</template>

<style scoped src="./search-page.scss" lang="scss"></style>
