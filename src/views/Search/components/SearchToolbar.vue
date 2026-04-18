<script setup lang="ts">
import { ChevronLeft, ChevronRight, Clapperboard, Disc3, LibraryBig, Play } from 'lucide-vue-next'
import type { SearchCategory } from '@/api/search'
import type { SearchTypeOption } from '../types'

defineProps<{
  activeType: SearchCategory
  canPlayAll: boolean
  currentPage: number
  formattedTotalCount: string
  hasKeyword: boolean
  hasNextPage: boolean
  hasPreviousPage: boolean
  options: SearchTypeOption[]
  searchKeyword: string
  totalPages: number
}>()

const emit = defineEmits<{
  (event: 'change-page', page: number): void
  (event: 'play-all'): void
  (event: 'switch-type', type: SearchCategory): void
}>()
</script>

<template>
  <header class="search-toolbar">
    <div class="search-toolbar__left">
      <div class="search-tabs" role="tablist" aria-label="搜索类型">
        <button
          v-for="option in options"
          :key="option.value"
          class="search-tabs__item"
          :class="{ 'search-tabs__item--active': option.value === activeType }"
          :aria-selected="option.value === activeType"
          role="tab"
          type="button"
          @click="emit('switch-type', option.value)"
        >
          <Disc3 v-if="option.value === 'song'" class="search-tabs__icon" :stroke-width="1.85" />
          <LibraryBig v-else-if="option.value === 'playlist'" class="search-tabs__icon" :stroke-width="1.85" />
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
        :disabled="!canPlayAll"
        @click="emit('play-all')"
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
          @click="emit('change-page', currentPage - 1)"
        >
          <ChevronLeft :stroke-width="1.9" />
        </button>
        <span class="search-pager__label">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="search-pager__button"
          type="button"
          :disabled="!hasNextPage"
          @click="emit('change-page', currentPage + 1)"
        >
          <ChevronRight :stroke-width="1.9" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.search-toolbar {
  position: relative;
  z-index: 1;
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

.search-toolbar__play-icon {
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
}

@media (max-width: 960px) {
  .search-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .search-tabs__item {
    justify-content: center;
  }
}

@media (max-width: 720px) {
  .search-toolbar__query strong {
    font-size: 22px;
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
}
</style>
