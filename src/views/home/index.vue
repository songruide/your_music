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
      <GlassCard class="hero__content" padding="34px"><!-- //这是左边内容 -->
        <div>
          <div class="hero__eyebrow">Theme Week</div>
          <h1 class="hero__title"><!-- //这是大标题 -->
            Theme <br />
            <span>Week</span> <br />
            Animation <br />
            <span>Information!</span>
          </h1>
          <p class="hero__desc">
            先把首页当成作品海报来做，不要急着接功能。这个区域的重点就是大标题、渐变高光、留白和毛玻璃卡片。
          </p>
        </div>

        <div class="hero__actions"><!-- //这是操作按钮区域 -->
          <button class="hero__btn hero__btn--primary">View album</button>
          <button class="hero__btn hero__btn--ghost">View detail</button>
        </div>

        <div class="hero__avatars"><!-- //这是头像区域 -->
          <img v-for="item in avatars" :key="item" :src="item" alt="" />
        </div>
      </GlassCard>

      <div class="hero__visual"><!-- //这是右边视觉区域 -->
        <GlassCard class="hero__profile" padding="18px"><!-- //这是右边上半部分的个人信息卡片 -->
          <div class="profile"><!-- //这是个人信息区域 -->
            <img class="profile__avatar" src="https://picsum.photos/seed/u1/88/88" alt="" />
            <div>
              <div class="profile__name">Xu</div>
              <div class="profile__intro">3483218085@qq.com</div>
            </div>
          </div>
        </GlassCard>

        <div class="hero__gallery"><!-- //这是右边下半部分的图集 -->
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
  gap: 18px;
}

.home__head {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.82);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) 420px;
  gap: 34px;
  align-items: start;
  width: min(980px, 100%);
}

.hero__content {
    min-height: 0;
  display: grid;
  align-content: center;
  gap: 24px;
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
  font-size: clamp(42px, 5.6vw, 72px);
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.hero__title span {
  background: linear-gradient(135deg, #ff8adb 0%, #ff4ec0 100%);
  -webkit-background-clip: text;
  color: transparent;
}

.hero__desc {
  max-width: 560px;
  margin-top: 18px;
  color: rgba(233, 239, 255, 0.72);
  line-height: 1.8;
}

.hero__actions {
  display: flex;
  gap: 14px;
}

.hero__btn {
  height: 46px;
  padding: 0 24px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
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
  gap: 12px;
}

.hero__avatars img {
  width: 68px;
  height: 68px;
  border-radius: 16px;
  object-fit: cover;
}

.hero__visual {
  display: grid;
  gap: 18px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile__avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.profile__name {
  font-weight: 700;
}

.profile__intro {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.56);
}

.hero__gallery {
  display: grid;
  grid-template-columns: 112px 1fr;
  grid-template-rows: 128px 128px;
  gap: 14px;
}

.poster {
  overflow: hidden;
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 28px;
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
