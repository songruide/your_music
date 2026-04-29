<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import AuthQuickAction from '@/components/AuthQuickAction.vue'
import AiCommandBar from '@/components/assistant/AiCommandBar.vue'
import { buildSearchRoute, getNormalizedQueryValue, getRouteSearchType, isAssistantSearchRoute } from '@/views/Search/utils'

const route = useRoute()
const router = useRouter()
const keywordInput = ref('')

const routeKeyword = computed(() => getNormalizedQueryValue(route.query.q))
const routeType = computed(() => getRouteSearchType(route.query))

async function submitSearch() {
  const keyword = keywordInput.value.trim()
  await router.push(buildSearchRoute(keyword, routeType.value))
}

async function clearSearch() {
  keywordInput.value = ''

  if (route.name === 'search' && routeKeyword.value) {
    await router.push(buildSearchRoute('', routeType.value))
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
</script>

<template>
  <section class="global-search" aria-label="全局搜索">
    <AiCommandBar class="global-search__assistant" />

    <form class="global-search__form" @submit.prevent="submitSearch">
      <div class="global-search__field">
        <Search class="global-search__field-icon" :stroke-width="1.9" />
        <input
          v-model="keywordInput"
          class="global-search__input"
          type="search"
          name="q"
          placeholder="输入歌名、歌手或专辑"
          autocomplete="off"
          aria-label="搜索音乐"
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
  width: clamp(104px, 10vw, 140px);
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

@media (max-width: 960px) {
  .global-search {
    width: 100%;
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .global-search__form {
    width: min(100%, 200px);
    flex: 1 1 auto;
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
