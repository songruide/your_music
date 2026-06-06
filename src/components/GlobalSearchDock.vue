<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Search, X } from 'lucide-vue-next'
import { searchSuggestions, type SearchSuggestionGroup, type SearchSuggestionItem } from '@/api/search'
import AuthQuickAction from '@/components/AuthQuickAction.vue'
import AiCommandBar from '@/components/assistant/AiCommandBar.vue'
import SearchSuggestionPanel from '@/components/SearchSuggestionPanel.vue'
import { useMusicLibraryStore, type LocalMusicTrack } from '@/stores/musicLibrary'
import { usePlayerStore, type PlayerTrack } from '@/stores/player'
import { buildSearchRoute, getNormalizedQueryValue, getRouteSearchType, isAssistantSearchRoute } from '@/views/Search/utils'

const route = useRoute()
const router = useRouter()
const libraryStore = useMusicLibraryStore()
const playerStore = usePlayerStore()
const { downloadedCollection } = storeToRefs(libraryStore)
const keywordInput = ref('')
const isFocused = ref(false)
const suggestions = ref<SearchSuggestionGroup[]>([])
const suggestionsLoading = ref(false)
const suggestionsError = ref('')
const activeSuggestionIndex = ref(-1)
const inputRef = ref<HTMLInputElement | null>(null)
const searchFormRef = ref<HTMLFormElement | null>(null)
let suggestionTimer: number | undefined
let suggestionRequestToken = 0

const routeKeyword = computed(() => getNormalizedQueryValue(route.query.q))
const routeType = computed(() => getRouteSearchType(route.query))
const trimmedKeyword = computed(() => keywordInput.value.trim())
const suggestionPanelId = 'global-search-suggestions'
const activeDescendantId = computed(() =>
  activeSuggestionIndex.value >= 0 ? `${suggestionPanelId}-option-${activeSuggestionIndex.value}` : undefined,
)
const localSuggestionGroup = computed<SearchSuggestionGroup | null>(() => {
  if (!trimmedKeyword.value) {
    return null
  }

  const query = trimmedKeyword.value.toLocaleLowerCase()
  const items = downloadedCollection.value
    .filter((track) => {
      const haystack = [
        track.title,
        track.artist,
        track.album,
        ...(track.artists?.map((artist) => artist.name) ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()

      return haystack.includes(query)
    })
    .slice(0, 4)
    .map<SearchSuggestionItem>((track) => ({
      id: track.id,
      keyword: track.title,
      name: track.title,
      artistNames: track.artists?.map((artist) => artist.name).filter(Boolean) ?? [track.artist],
      albumName: track.album,
      coverUrl: track.coverUrl,
      duration: track.durationMs,
      type: 'local',
    }))

  return items.length > 0
    ? {
        key: 'local',
        label: '本地',
        items,
      }
    : null
})
const visibleSuggestionGroups = computed(() =>
  localSuggestionGroup.value ? [...suggestions.value, localSuggestionGroup.value] : suggestions.value,
)
const flatSuggestions = computed(() => visibleSuggestionGroups.value.flatMap((group) => group.items))
const hasSuggestions = computed(() => flatSuggestions.value.length > 0)
const shouldShowSuggestions = computed(
  () =>
    isFocused.value &&
    trimmedKeyword.value.length > 0 &&
    (suggestionsLoading.value || Boolean(suggestionsError.value) || hasSuggestions.value),
)

async function submitSearch() {
  const keyword = keywordInput.value.trim()

  closeSuggestions()
  await router.push(buildSearchRoute(keyword, routeType.value))
}

async function clearSearch() {
  keywordInput.value = ''
  closeSuggestions()

  if (route.name === 'search' && routeKeyword.value) {
    await router.push(buildSearchRoute('', routeType.value))
  }
}

function closeSuggestions() {
  isFocused.value = false
  activeSuggestionIndex.value = -1
}

function scheduleSuggestions() {
  if (suggestionTimer) {
    window.clearTimeout(suggestionTimer)
  }

  if (!trimmedKeyword.value) {
    suggestions.value = []
    suggestionsError.value = ''
    suggestionsLoading.value = false
    activeSuggestionIndex.value = -1
    suggestionRequestToken += 1
    return
  }

  suggestionsLoading.value = true
  suggestionsError.value = ''
  suggestionTimer = window.setTimeout(() => {
    void loadSuggestions(trimmedKeyword.value)
  }, 220)
}

async function loadSuggestions(keyword: string) {
  const requestToken = ++suggestionRequestToken

  try {
    const response = await searchSuggestions(keyword, { limit: 4 })

    if (requestToken !== suggestionRequestToken) {
      return
    }

    suggestions.value = response.groups
    activeSuggestionIndex.value = response.groups.some((group) => group.items.length > 0) ? 0 : -1
  } catch (err) {
    if (requestToken !== suggestionRequestToken) {
      return
    }

    suggestions.value = []
    suggestionsError.value = err instanceof Error ? err.message : '搜索提示加载失败'
    activeSuggestionIndex.value = -1
  } finally {
    if (requestToken === suggestionRequestToken) {
      suggestionsLoading.value = false
    }
  }
}

function handleFocus() {
  isFocused.value = true

  if (trimmedKeyword.value && suggestions.value.length === 0 && !suggestionsLoading.value) {
    scheduleSuggestions()
  }
}

function handleBlur(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null

  if (nextTarget && searchFormRef.value?.contains(nextTarget)) {
    return
  }

  window.setTimeout(() => {
    isFocused.value = false
    activeSuggestionIndex.value = -1
  }, 120)
}

function previewSuggestion(index: number) {
  activeSuggestionIndex.value = index
}

function toPlayerTrack(track: LocalMusicTrack): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    artists: track.artists?.map((artist) => ({ ...artist })),
    albumId: track.albumId,
    album: track.album,
    coverUrl: track.coverUrl,
    duration: track.duration,
    durationMs: track.durationMs,
    audioUrl: track.audioUrl,
    localAudioPath: track.localAudioPath,
    localLyricPath: track.localLyricPath,
    sourceMeta: track.sourceMeta,
    sourceExpiresAt: track.sourceExpiresAt,
  }
}

async function selectSuggestion(item: SearchSuggestionItem) {
  const keyword = item.keyword || item.name

  keywordInput.value = keyword
  closeSuggestions()

  if (item.type === 'local') {
    const localTracks = downloadedCollection.value
    const targetIndex = localTracks.findIndex((track) => track.id === item.id)

    if (targetIndex >= 0) {
      await playerStore.playQueue(localTracks.map(toPlayerTrack), targetIndex)
    }
    return
  }

  if (item.type === 'artist' && item.id) {
    await router.push({
      name: 'artist-detail',
      params: { id: item.id },
    })
    return
  }

  if (item.type === 'album' && item.id) {
    await router.push({
      name: 'album-detail',
      params: { id: item.id },
    })
    return
  }

  if (item.type === 'playlist' && item.id) {
    await router.push({
      name: 'playlist-detail',
      params: { id: item.id },
    })
    return
  }

  await router.push(buildSearchRoute(keyword, item.type === 'mv' ? 'mv' : 'song'))
}

function moveActiveSuggestion(step: number) {
  if (!shouldShowSuggestions.value || flatSuggestions.value.length === 0) {
    return
  }

  const total = flatSuggestions.value.length
  const currentIndex = activeSuggestionIndex.value < 0 ? 0 : activeSuggestionIndex.value
  activeSuggestionIndex.value = (currentIndex + step + total) % total
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActiveSuggestion(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActiveSuggestion(-1)
    return
  }

  if (event.key === 'Enter' && activeSuggestionIndex.value >= 0 && shouldShowSuggestions.value) {
    const targetItem = flatSuggestions.value[activeSuggestionIndex.value]

    if (targetItem) {
      event.preventDefault()
      void selectSuggestion(targetItem)
    }
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    closeSuggestions()
    void nextTick(() => inputRef.value?.blur())
  }
}

watch(
  () => [route.query.q, route.query.source, route.path],
  () => {
    if (route.name === 'search' && isAssistantSearchRoute(route.query)) {
      keywordInput.value = ''
      return
    }

    keywordInput.value = routeKeyword.value
  },
  { immediate: true },
)

watch(trimmedKeyword, () => {
  if (!isFocused.value) {
    return
  }

  scheduleSuggestions()
})

watch(hasSuggestions, (nextHasSuggestions) => {
  if (nextHasSuggestions && activeSuggestionIndex.value < 0) {
    activeSuggestionIndex.value = 0
    return
  }

  if (!nextHasSuggestions) {
    activeSuggestionIndex.value = -1
  }
})

onBeforeUnmount(() => {
  if (suggestionTimer) {
    window.clearTimeout(suggestionTimer)
  }
})
</script>

<template>
  <section class="global-search" aria-label="全局搜索">
    <AiCommandBar class="global-search__assistant" />

    <form ref="searchFormRef" class="global-search__form" @submit.prevent="submitSearch" @focusout="handleBlur">
      <div class="global-search__field">
        <Search class="global-search__field-icon" :stroke-width="1.9" />
        <input
          ref="inputRef"
          v-model="keywordInput"
          class="global-search__input"
          type="search"
          name="q"
          placeholder="输入歌名、歌手或专辑"
          autocomplete="off"
          aria-label="搜索音乐"
          role="combobox"
          :aria-autocomplete="'list'"
          :aria-expanded="shouldShowSuggestions"
          :aria-controls="suggestionPanelId"
          :aria-activedescendant="activeDescendantId"
          @focus="handleFocus"
          @keydown="handleInputKeydown"
        />
        <button
          v-if="keywordInput"
          class="global-search__clear"
          type="button"
          aria-label="清空搜索内容"
          title="清空搜索内容"
          @click="clearSearch"
        >
          <X class="global-search__clear-icon" :stroke-width="2.1" />
        </button>
      </div>

      <SearchSuggestionPanel
        v-if="shouldShowSuggestions"
        class="global-search__suggestions"
        :active-index="activeSuggestionIndex"
        :error="suggestionsError"
        :groups="visibleSuggestionGroups"
        :id="suggestionPanelId"
        :loading="suggestionsLoading"
        :query="trimmedKeyword"
        @preview="previewSuggestion"
        @select="selectSuggestion"
      />
    </form>

    <AuthQuickAction class="global-search__auth" />
  </section>
</template>

<style scoped lang="scss">
.global-search {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: min(100%, 760px);
  min-height: 0;
  margin-left: auto;
  padding: 0;
}

.global-search__assistant {
  flex: 0 0 auto;
}

.global-search__form {
  position: relative;
  width: clamp(128px, 13vw, 180px);
  max-width: 100%;
  flex: 0 0 auto;
}

.global-search__field {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 9px;
  border-radius: 11px;
  background: rgba(17, 11, 45, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.global-search__field-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: rgba(232, 238, 255, 0.58);
}

.global-search__clear {
  width: 16px;
  height: 16px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(232, 238, 255, 0.64);
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.global-search__clear:hover,
.global-search__clear:focus-visible {
  outline: none;
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.9);
}

.global-search__clear-icon {
  width: 11px;
  height: 11px;
}

.global-search__input {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0;
  appearance: none;
  -webkit-appearance: none;
}

.global-search__input::-webkit-search-decoration,
.global-search__input::-webkit-search-cancel-button {
  display: none;
}

.global-search__input::placeholder {
  color: rgba(228, 235, 255, 0.44);
}

.global-search__suggestions {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
}

@media (max-width: 960px) {
  .global-search {
    width: 100%;
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .global-search__form {
    width: min(100%, 190px);
    flex: 1 1 auto;
  }

  .global-search__suggestions {
    left: 0;
    right: auto;
  }

  .global-search__auth {
    flex: 0 0 auto;
  }
}

@media (max-width: 640px) {
  .global-search {
    align-items: stretch;
  }

  .global-search__form {
    width: 100%;
  }
}
</style>
