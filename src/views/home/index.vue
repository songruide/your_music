<script setup lang="ts">
import GlassCard from '@/components/GlassCard.vue'

const avatars = [
  'https://picsum.photos/seed/a1/80/80',
  'https://picsum.photos/seed/a2/80/80',
  'https://picsum.photos/seed/a3/80/80',
  'https://picsum.photos/seed/a4/80/80'
]

const sideImages = [
  'https://picsum.photos/seed/s1/420/260',
  'https://picsum.photos/seed/s2/420/260',
  'https://picsum.photos/seed/s3/520/540'
]
</script>

<template>
  <section class="home">
    <div class="home__head">Home</div>

    <div class="hero">
      <GlassCard class="hero__content" padding="34px">
        <div>
          <div class="hero__eyebrow">Theme Week</div>
          <h1 class="hero__title">
            Theme <br />
            <span>Week</span> <br />
            Animation <br />
            <span>Information!</span>
          </h1>
          <p class="hero__desc">
            先把首页当成作品海报来做，不要急着接功能。这个区域的重点就是大标题、渐变高光、留白和毛玻璃卡片。
          </p>
        </div>

        <div class="hero__actions">
          <button class="hero__btn hero__btn--primary">View album</button>
          <button class="hero__btn hero__btn--ghost">View detail</button>
        </div>

        <div class="hero__avatars">
          <img v-for="item in avatars" :key="item" :src="item" alt="" />
        </div>
      </GlassCard>

      <div class="hero__visual">
        <GlassCard class="hero__profile" padding="14px">
          <div class="profile">
            <img class="profile__avatar" src="https://picsum.photos/seed/u1/88/88" alt="" />
            <div>
              <div class="profile__name">Xu</div>
              <div class="profile__intro">3483218085@qq.com</div>
            </div>
          </div>
        </GlassCard>

        <div class="hero__gallery">
          <GlassCard class="poster" padding="0">
            <img :src="sideImages[0]" alt="" />
          </GlassCard>
          <GlassCard class="poster" padding="0">
            <img :src="sideImages[1]" alt="" />
          </GlassCard>
          <GlassCard class="poster poster--large" padding="0">
            <img :src="sideImages[2]" alt="" />
          </GlassCard>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home__head {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.76);
}

.hero {
  display: grid;
  grid-template-columns: 324px 286px;
  gap: 150px;
  align-items: start;
  width: min(644px, 100%);
}

.hero__content {
  min-height: 0;
  display: grid;
  align-content: center;
  gap: 18px;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  backdrop-filter: none !important;
  box-shadow: none !important;
}

.hero__eyebrow {
  margin-bottom: 14px;
  font-size: 14px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.hero__title {
  margin: 0;
  color: #fff;
  font-size: clamp(34px, 4.4vw, 62px);
  line-height: 0.9;
  letter-spacing: -0.05em;
}

.hero__title span {
  background: linear-gradient(135deg, #ff8adb 0%, #ff4ec0 100%);
  -webkit-background-clip: text;
  color: transparent;
}

.hero__desc {
  max-width: 308px;
  margin-top: 6px;
  color: rgba(233, 239, 255, 0.62);
  font-size: 11px;
  line-height: 1.7;
}

.hero__actions {
  display: flex;
  gap: 10px;
}

.hero__btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  font-size: 11px;
}

.hero__btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #ff53c3, #ff8c61);
}

.hero__btn--ghost {
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.hero__avatars {
  display: flex;
  gap: 9px;
}

.hero__avatars img {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 16px 28px rgba(0, 0, 0, 0.24);
}

.hero__visual {
  display: grid;
  gap: 14px;
}

.hero__profile {
  width: 218px;
  margin-left: auto;
  border-color: rgba(255, 255, 255, 0.05) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 44px rgba(0, 0, 0, 0.34) !important;
}

.profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}

.profile__name {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.profile__intro {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 10px;
}

.hero__gallery {
  display: grid;
  grid-template-columns: 112px 146px;
  grid-template-rows: 108px 108px;
  gap: 12px;
}

.poster {
  overflow: hidden;
  border-color: rgba(255, 255, 255, 0.04) !important;
  background: rgba(255, 255, 255, 0.02) !important;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.36) !important;
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 24px;
}

.poster--large {
  grid-row: span 2;
}

@media (max-width: 1200px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
