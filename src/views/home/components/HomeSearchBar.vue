<template>
  <form class="home-search" @submit.prevent="submitSearch">
    <Search class="home-search__icon" :stroke-width="1.9" aria-hidden="true" />
    <input
      v-model="keywordInput"
      class="home-search__input"
      type="search"
      placeholder="搜索音乐，歌手，专辑"
      aria-label="搜索音乐，歌手，专辑"
      autocomplete="off"
    />
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

// 首页独立搜索入口。
// 它不再跟轮播图混在同一个容器里，而是作为单独区域存在，
// 这样轮播和搜索的职责更清晰，视觉上也更利落。
const router = useRouter()
const keywordInput = ref('')

async function submitSearch() {
  const keyword = keywordInput.value.trim()

  await router.push(
    keyword
      ? {
          path: '/search',
          query: { q: keyword },
        }
      : {
          path: '/search',
        },
  )
}
</script>

<style scoped lang="scss">
.home-search {
  width: min(224px, 100%);
  margin-left: auto;
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid rgba(214, 207, 255, 0.14);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(31, 18, 80, 0.62);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 10px 24px rgba(10, 8, 34, 0.14);
  backdrop-filter: blur(18px);
}

.home-search:focus-within {
  border-color: rgba(255, 152, 228, 0.24);
}

.home-search__icon {
  width: 14px;
  height: 14px;
  color: rgba(240, 243, 255, 0.72);
}

.home-search__input {
  width: 100%;
  min-width: 0;
  height: 18px;
  padding: 0 4px 0 0;
  border: 0;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 12px;
}

.home-search__input::placeholder {
  color: rgba(233, 239, 255, 0.52);
}

@media (max-width: 920px) {
  .home-search {
    width: 100%;
  }
}
</style>
