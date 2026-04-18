<script setup lang="ts">
import SearchMvGrid from './components/SearchMvGrid.vue'
import SearchPlaylistGrid from './components/SearchPlaylistGrid.vue'
import SearchSongTable from './components/SearchSongTable.vue'
import SearchToolbar from './components/SearchToolbar.vue'
import { SEARCH_TYPE_OPTIONS } from './constants'
import { useSearchPage } from './useSearchPage'

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
          />
          <SearchPlaylistGrid v-else-if="searchResult.type === 'playlist'" :playlists="playlistItems" />
          <SearchMvGrid v-else :mvs="mvItems" />
        </div>

        <div v-if="loading" class="search-board__overlay">正在更新这一页结果...</div>
      </section>
    </article>
  </section>
</template>

<style scoped src="./search-page.scss" lang="scss"></style>
