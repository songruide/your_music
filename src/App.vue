<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

// 初始化设置 store，让主题、动态背景和字体缩放在应用启动时就生效。
useSettingsStore()
</script>

<template>
  <RouterView />
</template>
