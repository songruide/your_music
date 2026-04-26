<script setup lang="ts">
import { Download, Heart, ListPlus, Play } from 'lucide-vue-next'

defineProps<{
  disabled?: boolean
  isDownloaded?: boolean
  isFavorite?: boolean
}>()

const emit = defineEmits<{
  (event: 'download'): void
  (event: 'favorite'): void
  (event: 'play'): void
  (event: 'play-next'): void
}>()
</script>

<template>
  <div class="song-actions">
    <button
      class="song-action song-action--on-hover"
      type="button"
      title="播放"
      :disabled="disabled"
      @click.stop="emit('play')"
    >
      <Play :stroke-width="2.1" />
    </button>

    <button
      class="song-action song-action--on-hover"
      type="button"
      title="下一首播放"
      :disabled="disabled"
      @click.stop="emit('play-next')"
    >
      <ListPlus :stroke-width="2" />
    </button>

    <button
      class="song-action song-action--on-hover"
      :class="{ 'song-action--downloaded': isDownloaded }"
      type="button"
      :title="isDownloaded ? '已在本地音乐' : '下载到本地音乐'"
      :disabled="disabled"
      @click.stop="emit('download')"
    >
      <Download :stroke-width="2" />
    </button>

    <button
      class="song-action song-action--favorite"
      :class="{ 'is-active': isFavorite }"
      type="button"
      :title="isFavorite ? '取消收藏' : '收藏歌曲'"
      @click.stop="emit('favorite')"
    >
      <Heart :stroke-width="2" :fill="isFavorite ? 'currentColor' : 'none'" />
    </button>
  </div>
</template>
