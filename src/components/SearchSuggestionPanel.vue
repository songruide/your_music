<script setup lang="ts">
import { computed } from 'vue'
import type { SearchSuggestionGroup, SearchSuggestionItem } from '@/api/search'

const props = defineProps<{
  activeIndex: number
  error?: string
  groups: SearchSuggestionGroup[]
  id: string
  loading: boolean
  query: string
}>()

const emit = defineEmits<{
  (event: 'preview', index: number): void
  (event: 'select', item: SearchSuggestionItem): void
}>()

const hasGroups = computed(() => props.groups.some((group) => group.items.length > 0))

function getFlatIndex(groupIndex: number, itemIndex: number) {
  return props.groups
    .slice(0, groupIndex)
    .reduce((total, group) => total + group.items.length, itemIndex)
}

function getOptionId(index: number) {
  return `${props.id}-option-${index}`
}

function splitMatchedText(value: string) {
  const query = props.query.trim()

  if (!query) {
    return {
      before: value,
      match: '',
      after: '',
    }
  }

  const source = value.toLocaleLowerCase()
  const keyword = query.toLocaleLowerCase()
  const startIndex = source.indexOf(keyword)

  if (startIndex < 0) {
    return {
      before: value,
      match: '',
      after: '',
    }
  }

  return {
    before: value.slice(0, startIndex),
    match: value.slice(startIndex, startIndex + query.length),
    after: value.slice(startIndex + query.length),
  }
}

function getMatchedText(value: string) {
  return splitMatchedText(value)
}

function getItemMeta(item: SearchSuggestionItem) {
  const artistLabel = item.artistNames.filter(Boolean).join(' / ')

  if ((item.type === 'song' || item.type === 'local') && item.albumName) {
    return artistLabel ? `${artistLabel} - ${item.albumName}` : item.albumName
  }

  return artistLabel
}
</script>

<template>
  <div :id="id" class="search-suggest" role="listbox" aria-label="搜索建议">
    <div v-if="loading && !hasGroups" class="search-suggest__state">正在查找...</div>
    <div v-else-if="error" class="search-suggest__state search-suggest__state--error">{{ error }}</div>
    <div v-else-if="!hasGroups" class="search-suggest__state">暂无相关提示</div>

    <div v-for="(group, groupIndex) in groups" :key="group.key" class="search-suggest__group">
      <div class="search-suggest__label">{{ group.label }}</div>
      <div class="search-suggest__items">
        <button
          v-for="(item, itemIndex) in group.items"
          :id="getOptionId(getFlatIndex(groupIndex, itemIndex))"
          :key="`${item.type}-${item.id}-${item.name}`"
          class="search-suggest__item"
          :class="{ 'search-suggest__item--active': getFlatIndex(groupIndex, itemIndex) === activeIndex }"
          type="button"
          role="option"
          :aria-selected="getFlatIndex(groupIndex, itemIndex) === activeIndex"
          @mouseenter="emit('preview', getFlatIndex(groupIndex, itemIndex))"
          @mousedown.prevent
          @click="emit('select', item)"
        >
          <span class="search-suggest__title">
            <template v-if="splitMatchedText(item.name).match">
              <span>{{ getMatchedText(item.name).before }}</span>
              <mark>{{ getMatchedText(item.name).match }}</mark>
              <span>{{ getMatchedText(item.name).after }}</span>
            </template>
            <template v-else>{{ item.name }}</template>
          </span>
          <span v-if="getItemMeta(item)" class="search-suggest__meta">{{ getItemMeta(item) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-suggest {
  width: min(420px, calc(100vw - 32px));
  max-height: min(420px, calc(100vh - 120px));
  padding: 6px 0;
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
    rgba(14, 13, 36, 0.96);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 20px 42px rgba(3, 5, 18, 0.36);
  backdrop-filter: blur(22px);
  color: rgba(244, 247, 255, 0.92);
}

.search-suggest::-webkit-scrollbar {
  width: 8px;
}

.search-suggest::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

.search-suggest__group {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 6px;
  padding: 8px 8px 8px 12px;
}

.search-suggest__group + .search-suggest__group {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.search-suggest__label {
  padding-top: 7px;
  color: rgba(225, 232, 255, 0.48);
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.search-suggest__items {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.search-suggest__item {
  width: 100%;
  min-height: 32px;
  padding: 6px 8px;
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(239, 243, 255, 0.9);
  text-align: left;
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease;
}

.search-suggest__item:hover,
.search-suggest__item--active {
  background: rgba(118, 148, 255, 0.16);
  color: #fff;
}

.search-suggest__title,
.search-suggest__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.search-suggest__title {
  font-size: 13px;
}

.search-suggest__title mark {
  padding: 0;
  background: transparent;
  color: #7ea0ff;
}

.search-suggest__meta {
  color: rgba(217, 226, 255, 0.62);
  font-size: 12px;
}

.search-suggest__state {
  padding: 14px 16px;
  color: rgba(226, 233, 255, 0.62);
  font-size: 12px;
}

.search-suggest__state--error {
  color: #ffd7e4;
}

@media (max-width: 560px) {
  .search-suggest {
    width: calc(100vw - 28px);
  }

  .search-suggest__group {
    grid-template-columns: 44px minmax(0, 1fr);
    padding-left: 10px;
  }

  .search-suggest__item {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
}
</style>
