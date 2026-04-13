<script setup lang="ts">
type MusicCardTone = 'pink' | 'blue' | 'violet'

withDefaults(
  defineProps<{
    title: string
    subtitle: string
    badge?: string
    description?: string
    tone?: MusicCardTone
  }>(),
  {
    title: 'Theme Week',
    subtitle: 'Featured playlist',
    badge: '',
    description: '',
    tone: 'pink',
  },
)
</script>

<template>
  <article class="music-card" :class="`music-card--${tone}`">
    <div class="music-card__cover">
      <span v-if="badge" class="music-card__badge">{{ badge }}</span>
    </div>
    <div class="music-card__body">
      <div class="music-card__subtitle">{{ subtitle }}</div>
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>
  </article>
</template>

<style scoped lang="scss">
.music-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 14px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    rgba(22, 18, 52, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.music-card__cover {
  position: relative;
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff69cf, #4f8dff);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 14px 24px rgba(9, 8, 26, 0.26);
}

.music-card--blue .music-card__cover {
  background: linear-gradient(135deg, #6dc8ff, #3d65ff);
}

.music-card--violet .music-card__cover {
  background: linear-gradient(135deg, #ae78ff, #ff70ce);
}

.music-card__badge {
  position: absolute;
  right: -6px;
  bottom: -6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(10, 8, 25, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.88);
  font-size: 10px;
  line-height: 1;
}

.music-card__body {
  min-width: 0;
}

.music-card__subtitle {
  color: rgba(255, 255, 255, 0.54);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h3 {
  margin: 6px 0 0;
  color: #fff;
  font-size: 16px;
}

p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 13px;
  line-height: 1.5;
}
</style>
