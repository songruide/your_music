<script setup lang="ts">
withDefaults(
  defineProps<{
    padding?: string
  }>(),
  {
    padding: '24px'
  }
)
</script>

<template>
  <section class="glass-card" :style="{ padding }">
    <slot />
  </section>
</template>

<style scoped lang="scss">
.glass-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  background: rgba(10, 14, 24, 0.64);
  backdrop-filter: blur(28px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 24px 80px rgba(0, 0, 0, 0.38);
}
</style>
