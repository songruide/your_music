<script setup lang="ts">
import type { SearchSong } from '@/api/search'
import SongRowActions from '@/components/SongRowActions.vue'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { usePlayerStore } from '@/stores/player'
import type { ArtistRef } from '@/types/music'
import { buildPlayerTrack, formatDurationMs } from '@/utils/playerTrack'
import { handleSearchCoverError } from '../utils'

const libraryStore = useMusicLibraryStore()
const playerStore = usePlayerStore()

// 单曲表格保持“纯展示 + 事件抛出”的职责，
// 选中歌曲后具体怎么播由页面 composable 决定。
defineProps<{
  currentTrackId?: string
  isPlaying: boolean
  songs: SearchSong[]
  startIndex: number
}>()

const emit = defineEmits<{
  (event: 'open-album', song: Pick<SearchSong, 'id' | 'albumId' | 'albumName'>): void
  (event: 'open-artist', artist: ArtistRef): void
  (event: 'select-track', song: SearchSong): void
  (event: 'show-comments', song: SearchSong): void
}>()

function isFavoriteSong(songId: string) {
  return libraryStore.isFavorite(songId)
}

function isLocalSong(songId: string) {
  return libraryStore.isLocalTrack(songId)
}

function buildFavoriteTrack(song: SearchSong) {
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

function handleFavoriteSong(song: SearchSong) {
  libraryStore.toggleFavorite(buildFavoriteTrack(song))
}

function handlePlayNext(song: SearchSong) {
  if (song.playable === false) {
    return
  }

  void playerStore.enqueueNextTrack(buildFavoriteTrack(song))
}

function handleDownloadSong(song: SearchSong) {
  if (song.playable === false) {
    return
  }

  libraryStore.addLocalTrack(buildFavoriteTrack(song))
}

function resolveArtistKey(artist: ArtistRef, index: number) {
  return `${artist.id || artist.name}-${index}`
}
</script>

<template>
  <section class="search-song-table">
    <div class="search-table__row search-table__row--head">
      <div class="search-table__cell search-table__cell--rank">#</div>
      <div class="search-table__cell">歌曲</div>
      <div class="search-table__cell search-table__cell--artist">歌手</div>
      <div class="search-table__cell search-table__cell--album">专辑</div>
      <div class="search-table__cell search-table__cell--numeric">时长</div>
      <div class="search-table__cell search-table__cell--actions">操作</div>
    </div>

    <div class="search-table__body">
      <article
        v-for="(song, index) in songs"
        :key="song.id"
        class="search-table__row search-table__row--interactive song-action-row"
        :class="{
          'search-table__row--active': currentTrackId === song.id,
          'search-table__row--disabled': song.playable === false,
        }"
        :tabindex="song.playable === false ? -1 : 0"
        role="button"
        :aria-disabled="song.playable === false"
        @click="emit('select-track', song)"
        @keydown.enter.prevent="emit('select-track', song)"
        @keydown.space.prevent="emit('select-track', song)"
      >
        <div class="search-table__cell search-table__cell--rank">
          <span v-if="currentTrackId !== song.id">{{ startIndex + index + 1 }}</span>
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
              @error="handleSearchCoverError"
            />
            <div class="search-table__copy">
              <div class="search-table__title">{{ song.name }}</div>
              <div class="search-table__sub search-table__sub--mobile">
                <template v-if="song.artists.length > 0">
                  <template v-for="(artist, artistIndex) in song.artists" :key="resolveArtistKey(artist, artistIndex)">
                    <button
                      class="search-table__artist-link"
                      type="button"
                      :title="artist.name"
                      :aria-label="`打开歌手 ${artist.name}`"
                      @click.stop="emit('open-artist', artist)"
                    >
                      {{ artist.name }}
                    </button>
                    <span
                      v-if="artistIndex < song.artists.length - 1"
                      class="search-table__artist-separator"
                      aria-hidden="true"
                    >
                      /
                    </span>
                  </template>
                </template>
                <span v-else>未知歌手</span>
              </div>
            </div>
          </div>
        </div>

        <div class="search-table__cell search-table__cell--artist">
          <template v-if="song.artists.length > 0">
            <template v-for="(artist, artistIndex) in song.artists" :key="resolveArtistKey(artist, artistIndex)">
              <button
                class="search-table__artist-link"
                type="button"
                :title="artist.name"
                :aria-label="`打开歌手 ${artist.name}`"
                @click.stop="emit('open-artist', artist)"
              >
                {{ artist.name }}
              </button>
              <span
                v-if="artistIndex < song.artists.length - 1"
                class="search-table__artist-separator"
                aria-hidden="true"
              >
                /
              </span>
            </template>
          </template>
          <span v-else>未知歌手</span>
        </div>
        <div class="search-table__cell search-table__cell--album">
          <button
            class="search-table__album-link"
            type="button"
            :title="song.albumName"
            :aria-label="`打开专辑 ${song.albumName}`"
            @click.stop="emit('open-album', song)"
          >
            {{ song.albumName }}
          </button>
        </div>
        <div class="search-table__cell search-table__cell--numeric">
          {{ formatDurationMs(song.duration) }}
        </div>
        <div class="search-table__cell search-table__cell--actions">
          <SongRowActions
            :disabled="song.playable === false"
            :is-downloaded="isLocalSong(song.id)"
            :is-favorite="isFavoriteSong(song.id)"
            show-comments
            @comments="emit('show-comments', song)"
            @download="handleDownloadSong(song)"
            @favorite="handleFavoriteSong(song)"
            @play="emit('select-track', song)"
            @play-next="handlePlayNext(song)"
          />
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.search-song-table {
  min-width: 0;
}

.search-table__row {
  display: grid;
  grid-template-columns: 42px minmax(280px, 1.9fr) minmax(180px, 1.15fr) minmax(180px, 1.1fr) 74px 176px;
  align-items: center;
  gap: 16px;
  min-height: 58px;
  padding: 0 18px;
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

.search-table__row--head .search-table__cell--numeric,
.search-table__row--head .search-table__cell--actions {
  justify-self: end;
  text-align: right;
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

.search-table__cover {
  width: 42px;
  height: 42px;
  display: block;
  border-radius: 12px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
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
  color: rgba(226, 233, 255, 0.56);
  font-size: 12px;
}

.search-table__sub {
  margin-top: 4px;
}

.search-table__cell--artist,
.search-table__sub--mobile {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  white-space: normal;
}

.search-table__artist-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: color 180ms ease;
}

.search-table__artist-link:hover,
.search-table__artist-link:focus-visible {
  outline: none;
  color: rgba(250, 252, 255, 0.92);
}

.search-table__album-link {
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: color 180ms ease;
}

.search-table__album-link:hover,
.search-table__album-link:focus-visible {
  outline: none;
  color: rgba(250, 252, 255, 0.92);
}

.search-table__artist-separator {
  color: rgba(226, 233, 255, 0.34);
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

.search-table__action--favorite {
  color: #ff7e9f;
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
  .search-table__row {
    grid-template-columns: 38px minmax(220px, 1.7fr) minmax(150px, 1fr) minmax(140px, 0.9fr) 66px 168px;
  }
}

@media (max-width: 960px) {
  .search-table__row {
    grid-template-columns: 34px minmax(0, 1.5fr) minmax(0, 1fr) 64px 160px;
  }

  .search-table__cell--actions {
    gap: 6px;
  }

  .search-table__cell--album {
    display: none;
  }
}

@media (max-width: 720px) {
  .search-table__row {
    grid-template-columns: 30px minmax(0, 1fr) 60px;
  }

  .search-table__cell--artist,
  .search-table__cell--actions {
    display: none;
  }

  .search-table__sub--mobile {
    display: block;
  }
}

@media (max-width: 560px) {
  .search-table__cell--numeric {
    display: none;
  }

  .search-table__row {
    gap: 12px;
    padding: 0 12px;
    grid-template-columns: 26px minmax(0, 1fr);
  }
}
</style>
