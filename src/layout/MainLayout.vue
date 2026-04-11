<script setup lang="ts">
import SideMenu from '@/components/SideMenu.vue'
import TopAction from '@/components/TopAction.vue'
import PlayerBar from '@/components/PlayerBar.vue'
</script>

<template>
  <div class="layout">
    <div class="layout__aurora">
      <span class="light light--pink"></span>
      <span class="light light--cyan"></span>
      <span class="light light--violet"></span>
      <span class="light light--blue"></span>
    </div>

    <aside class="layout__aside">
      <SideMenu />
    </aside>

    <section class="layout__main">
      <!-- <TopAction /> -->
      <div class="layout__view">
        <RouterView />
      </div>
    </section>

    <div class="layout__player">
      <PlayerBar />
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout {
  position: relative;
  min-height: 90vh;
  padding: 18px 24px 26px 18px;
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
  grid-template-areas:
    'aside main'
    'player player';
  column-gap: 42px;
  row-gap: 26px;
  align-items: start;
  overflow: hidden;
  isolation: isolate;
  background: var(--app-panel-bg);
}

.layout::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 14%, rgba(7, 8, 30, 0.2) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 14%, transparent 86%, rgba(255, 255, 255, 0.03) 100%);
  transform-origin: center center;
  will-change: transform, opacity;
  animation: overlayBreath 15s ease-in-out infinite alternate;
}

.layout::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 54%, rgba(8, 10, 34, 0.26) 100%);
  will-change: opacity, transform;
  animation: vignettePulse 13s ease-in-out infinite alternate;
}

.layout__aurora {
  position: absolute;
  inset: -10% -8%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  filter: saturate(1.08);
}

.layout__aurora::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 48%, rgba(232, 92, 255, 0.18), transparent 18%),
    radial-gradient(circle at 54% 88%, rgba(65, 156, 255, 0.22), transparent 26%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, transparent 16%, transparent 84%, rgba(255, 255, 255, 0.03) 100%);
  opacity: 0.7;
  transform-origin: center center;
  will-change: transform, opacity;
  animation: auroraField 22s ease-in-out infinite alternate;
}

.layout__aurora::after {
  content: '';
  position: absolute;
  inset: -6%;
  background:
    radial-gradient(circle at 24% 58%, rgba(232, 92, 255, 0.22), transparent 18%),
    radial-gradient(circle at 52% 76%, rgba(67, 174, 255, 0.2), transparent 20%),
    radial-gradient(circle at 84% 34%, rgba(118, 102, 255, 0.14), transparent 16%);
  filter: blur(34px);
  opacity: 0.55;
  mix-blend-mode: screen;
  transform-origin: center center;
  will-change: transform, opacity;
  animation: auroraFieldReverse 25s ease-in-out infinite alternate;
}

.light {
  position: absolute;
  top: -10%;
  bottom: -10%;
  width: 260px;
  border-radius: 999px;
  filter: blur(126px);
  opacity: 0.26;
  mix-blend-mode: screen;
  transform-origin: center center;
  will-change: transform, opacity;
  animation:
    lightFloat var(--float-duration, 24s) ease-in-out var(--float-delay, 0s) infinite alternate,
    lightBreath var(--pulse-duration, 12s) ease-in-out var(--pulse-delay, 0s) infinite alternate;
}

.light::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 18%,
    rgba(255, 255, 255, 0.94) 50%,
    rgba(255, 255, 255, 0.1) 82%,
    transparent 100%
  );
  filter: blur(20px);
  opacity: 0.62;
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.82) 14%,
    #000 28%,
    #000 74%,
    rgba(0, 0, 0, 0.82) 88%,
    transparent 100%
  );
  mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.82) 14%,
    #000 28%,
    #000 74%,
    rgba(0, 0, 0, 0.82) 88%,
    transparent 100%
  );
  will-change: transform, opacity;
  animation: beamShimmer var(--shimmer-duration, 10s) ease-in-out var(--shimmer-delay, 0s) infinite alternate;
}

.light--pink {
  left: -2%;
  width: 260px;
  opacity: 0.28;
  background: linear-gradient(90deg, rgba(228, 95, 255, 0), rgba(228, 95, 255, 0.82) 50%, rgba(228, 95, 255, 0));
  --float-duration: 19s;
  --pulse-duration: 9s;
  --shimmer-duration: 7s;
}

.light--cyan {
  left: 50%;
  width: 360px;
  opacity: 0.28;
  background: linear-gradient(90deg, rgba(66, 170, 255, 0), rgba(66, 170, 255, 0.74) 50%, rgba(66, 170, 255, 0));
  --float-duration: 20s;
  --float-delay: -8s;
  --pulse-duration: 11s;
  --pulse-delay: -2s;
  --shimmer-duration: 8.5s;
  --shimmer-delay: -1s;
}

.light--violet {
  right: 14%;
  width: 260px;
  opacity: 0.18;
  background: linear-gradient(90deg, rgba(121, 92, 255, 0), rgba(121, 92, 255, 0.52) 50%, rgba(121, 92, 255, 0));
  --float-duration: 17s;
  --float-delay: -6s;
  --pulse-duration: 8s;
  --pulse-delay: -3s;
  --shimmer-duration: 6.5s;
  --shimmer-delay: -2s;
}

.light--blue {
  left: 38%;
  width: 420px;
  opacity: 0.24;
  background: linear-gradient(90deg, rgba(34, 132, 255, 0), rgba(34, 132, 255, 0.54) 50%, rgba(34, 132, 255, 0));
  --float-duration: 22s;
  --float-delay: -4s;
  --pulse-duration: 12s;
  --pulse-delay: -5s;
  --shimmer-duration: 9.5s;
  --shimmer-delay: -3s;
}

@keyframes lightFloat {
  0% {
    transform: translate3d(-26px, 8px, 0) rotate(-5deg) scaleX(0.92) scaleY(1.02);
  }
  50% {
    transform: translate3d(8px, -10px, 0) rotate(-1deg) scaleX(1.04) scaleY(1.08);
  }
  100% {
    transform: translate3d(28px, 6px, 0) rotate(2deg) scaleX(0.98) scaleY(1.04);
  }
}

@keyframes lightBreath {
  0% {
    opacity: 0.08;
  }
  45% {
    opacity: 0.24;
  }
  100% {
    opacity: 0.14;
  }
}

@keyframes beamShimmer {
  0% {
    transform: translate3d(-10px, 0, 0) scaleY(0.92);
    opacity: 0.22;
  }
  50% {
    transform: translate3d(0, -4px, 0) scaleY(1.08);
    opacity: 0.62;
  }
  100% {
    transform: translate3d(12px, 3px, 0) scaleY(0.96);
    opacity: 0.3;
  }
}

@keyframes auroraField {
  0% {
    transform: translate3d(-4%, 3%, 0) scale(1) rotate(-2deg);
    opacity: 0.48;
  }
  50% {
    transform: translate3d(3%, -2%, 0) scale(1.08) rotate(1deg);
    opacity: 0.74;
  }
  100% {
    transform: translate3d(6%, -4%, 0) scale(1.03) rotate(3deg);
    opacity: 0.58;
  }
}

@keyframes auroraFieldReverse {
  0% {
    transform: translate3d(5%, 4%, 0) scale(1.08) rotate(2deg);
    opacity: 0.22;
  }
  50% {
    transform: translate3d(-2%, 1%, 0) scale(1.02) rotate(0deg);
    opacity: 0.46;
  }
  100% {
    transform: translate3d(-5%, -3%, 0) scale(0.98) rotate(-3deg);
    opacity: 0.34;
  }
}

@keyframes overlayBreath {
  0% {
    transform: scale(1);
    opacity: 0.52;
  }
  100% {
    transform: scale(1.03);
    opacity: 0.82;
  }
}

@keyframes vignettePulse {
  0% {
    transform: scale(1);
    opacity: 0.72;
  }
  50% {
    transform: scale(1.015);
    opacity: 0.58;
  }
  100% {
    transform: scale(1.03);
    opacity: 0.84;
  }
}

.layout__aside,
.layout__main {
  position: relative;
  z-index: 1;
}

.layout__aside {
  grid-area: aside;
  padding-top: 10px;
}

.layout__main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  width: min(1180px, 100%);
  justify-self: start;
  padding-top: 8px;
}

.layout__player {
  grid-area: player;
  position: relative;
  z-index: 1;
}

.layout__view {
  width: 100%;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      'aside'
      'main'
      'player';
    row-gap: 18px;
    padding: 16px 14px 20px;
  }

  .layout__main {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout::before,
  .layout::after,
  .layout__aurora::before,
  .layout__aurora::after,
  .light,
  .light::before {
    animation: none !important;
  }
}
</style>
