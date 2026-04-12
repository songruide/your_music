<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle: string
  }>(),
  {
    title: 'Theme Week',
    subtitle: 'Featured playlist',
  },
)
</script>

<template>
  <article class="music-card">
    <div class="music-card__cover"></div>
    <div>
      <h3>{{ title }}</h3>
      <p>{{ subtitle }}</p>
    </div>
  </article>
</template>

<style scoped lang="scss">
.music-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 22px;
}

.music-card__cover {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff69cf, #4f8dff);
}

h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
}

p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 13px;
}
</style>
