<script setup lang="ts">
import MusicCard from '@/components/MusicCard.vue'

const musicCardExamples = [
  {
    title: 'Theme Week',
    subtitle: 'Featured Playlist',
    badge: 'Demo',
    tone: 'pink' as const,
    description: '最基础的用法，展示标题、副标题和一个简单标签。',
  },
  {
    title: 'Aurora Mix',
    subtitle: 'Ambient Collection',
    badge: 'Glow',
    tone: 'blue' as const,
    description: '同一个组件可以切不同封面色调，用来放歌单、专辑都合适。',
  },
  {
    title: 'Late Night Loop',
    subtitle: 'UI Showcase',
    badge: 'Loop',
    tone: 'violet' as const,
    description: '如果你有一句补充说明，也可以直接放在卡片下面一起展示。',
  },
]
</script>

<template>
  <section class="music-page">
    <article class="music-panel">
      <header class="music-panel__header">
        <div>
          <span class="music-panel__eyebrow">Project Panel</span>
          <h2>Music Player</h2>
        </div>
        <p>
          底部播放器保持悬浮，上方项目面板加大留白和展示面积，这样整体会更像一个完整的作品展示页。
        </p>
      </header>

      <div class="music-panel__hero">
        <section class="music-panel__focus">
          <span class="music-panel__tag">Now Playing</span>
          <h3>Intro AE 86</h3>
          <p>
            这里刻意保留更多呼吸感，把播放器放在视觉最底部，主内容区就能自然变成更大的展示面板。
          </p>

          <div class="music-panel__stats">
            <div>
              <strong>02:29</strong>
              <span>Track length</span>
            </div>
            <div>
              <strong>36%</strong>
              <span>Progress</span>
            </div>
            <div>
              <strong>Hi-Fi</strong>
              <span>Output</span>
            </div>
          </div>
        </section>

        <div class="music-panel__visual" aria-hidden="true">
          <div class="music-panel__ring"></div>
          <div class="music-panel__disc"></div>
        </div>
      </div>

      <section class="music-panel__example">
        <div class="music-panel__section-head">
          <div>
            <span class="music-panel__eyebrow">Component Demo</span>
            <h3>MusicCard 示例</h3>
          </div>
          <p>
            这里直接把 `MusicCard` 组件摆出来展示。现在它支持标题、副标题、标签和不同封面色调，适合做歌单、专辑或推荐卡片。
          </p>
        </div>

        <div class="music-panel__queue">
          <MusicCard
            v-for="item in musicCardExamples"
            :key="item.title"
            :title="item.title"
            :subtitle="item.subtitle"
            :badge="item.badge"
            :description="item.description"
            :tone="item.tone"
          />
        </div>
      </section>
    </article>
  </section>
</template>

<style scoped lang="scss">
.music-page {
  width: 100%;
}

.music-panel {
  position: relative;
  min-height: 620px;
  padding: 42px 44px 150px;
  border-radius: 36px;
  color: #fff;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(255, 98, 194, 0.2), transparent 28%),
    radial-gradient(circle at bottom left, rgba(71, 147, 255, 0.16), transparent 32%),
    rgba(10, 14, 24, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 28px 70px rgba(0, 0, 0, 0.34);
}

.music-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  align-items: start;
}

.music-panel__eyebrow {
  display: inline-block;
  margin-bottom: 14px;
  color: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.music-panel__header h2 {
  margin: 0;
  font-size: clamp(36px, 4.6vw, 64px);
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.music-panel__header p {
  max-width: 320px;
  margin: 12px 0 0;
  color: rgba(233, 239, 255, 0.68);
  font-size: 13px;
  line-height: 1.8;
}

.music-panel__hero {
  margin-top: 56px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 36px;
  align-items: center;
}

.music-panel__focus {
  max-width: 560px;
}

.music-panel__tag {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.music-panel__focus h3 {
  margin: 22px 0 0;
  font-size: clamp(40px, 4vw, 58px);
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.music-panel__focus p {
  max-width: 480px;
  margin: 18px 0 0;
  color: rgba(233, 239, 255, 0.68);
  font-size: 15px;
  line-height: 1.9;
}

.music-panel__stats {
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.music-panel__stats div {
  min-height: 104px;
  padding: 18px 20px;
  display: grid;
  align-content: space-between;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.music-panel__stats strong {
  font-size: 28px;
  letter-spacing: -0.04em;
}

.music-panel__stats span {
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.music-panel__visual {
  position: relative;
  width: 280px;
  height: 280px;
  justify-self: end;
}

.music-panel__ring,
.music-panel__disc {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.music-panel__ring {
  transform: scale(1.12);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05), transparent 65%);
}

.music-panel__disc {
  background:
    radial-gradient(circle at 50% 50%, rgba(8, 10, 14, 0.96) 0 16%, transparent 17%),
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.24), transparent 30%),
    conic-gradient(from 0deg, #ff5fc4, #ff9f63, #65b8ff, #8d73ff, #ff5fc4);
  box-shadow:
    inset 0 0 0 18px rgba(7, 8, 12, 0.74),
    0 24px 60px rgba(0, 0, 0, 0.38);
}

.music-panel__queue {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.music-panel__example {
  margin-top: 40px;
}

.music-panel__section-head {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: start;
}

.music-panel__section-head h3 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.04em;
}

.music-panel__section-head p {
  max-width: 420px;
  margin: 8px 0 0;
  color: rgba(233, 239, 255, 0.64);
  font-size: 13px;
  line-height: 1.8;
}

@media (max-width: 960px) {
  .music-panel {
    min-height: auto;
    padding: 28px 22px 120px;
  }

  .music-panel__header,
  .music-panel__hero,
  .music-panel__queue,
  .music-panel__stats,
  .music-panel__section-head {
    grid-template-columns: 1fr;
  }

  .music-panel__header {
    display: grid;
  }

  .music-panel__section-head {
    display: grid;
  }

  .music-panel__header p,
  .music-panel__section-head p,
  .music-panel__focus,
  .music-panel__focus p {
    max-width: none;
  }

  .music-panel__hero {
    margin-top: 34px;
  }

  .music-panel__visual {
    width: min(240px, 100%);
    height: auto;
    aspect-ratio: 1;
    justify-self: start;
  }
}
</style>
