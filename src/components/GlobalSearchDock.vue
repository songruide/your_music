<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import type { SearchCategory } from '@/api/search'

const DEFAULT_SEARCH_TYPE: SearchCategory = 'song'

const route = useRoute()
const router = useRouter()
const keywordInput = ref('')

const routeKeyword = computed(() => getNormalizedQueryValue(route.query.q))
const routeType = computed(() => getRouteSearchType())

function getNormalizedQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function getRouteSearchType(): SearchCategory {
  const queryType = getNormalizedQueryValue(route.query.type)

  if (queryType === 'playlist' || queryType === 'mv' || queryType === 'song') {
    return queryType
  }

  return DEFAULT_SEARCH_TYPE
}

function buildSearchRoute(keyword: string, type: SearchCategory) {
  const query: Record<string, string> = {}

  if (keyword) {
    query.q = keyword
  }

  if (type !== DEFAULT_SEARCH_TYPE) {
    query.type = type
  }

  return {
    path: '/search',
    query,
  }
}

async function submitSearch() {
  const keyword = keywordInput.value.trim()
  await router.push(buildSearchRoute(keyword, routeType.value))
}

watch(
  () => [route.query.q, route.path],
  () => {
    keywordInput.value = routeKeyword.value
  },
  { immediate: true },
)
</script>

<template>
  <section class="global-search" aria-label="全局搜索">
    <form class="global-search__form" @submit.prevent="submitSearch">
      <label class="global-search__field">
        <Search class="global-search__field-icon" :stroke-width="1.9" />
        <input
          v-model="keywordInput"
          class="global-search__input"
          type="search"
          name="q"
          placeholder="输入歌名、歌手或专辑"
          autocomplete="off"
        />
      </label>
    </form>
  </section>
</template>

<style scoped lang="scss">
.global-search {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 0;
  padding: 0;
}

.global-search__form {
  width: 148px;
  max-width: 100%;
}

.global-search__field {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 9px;
  border-radius: 10px;
  background: rgba(17, 11, 45, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.global-search__field-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: rgba(232, 238, 255, 0.58);
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
  font-size: 10px;
  line-height: 1;
  letter-spacing: -0.01em;
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

@media (max-width: 960px) {
  .global-search__form {
    width: min(148px, 100%);
  }
}
</style>
