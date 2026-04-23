<script setup lang="ts">
import SideMenu from '@/components/SideMenu.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import PlayerDetailDialog from '@/components/PlayerDetailDialog.vue'
import GlobalSearchDock from '@/components/GlobalSearchDock.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

void authStore.initialize()
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
      <div class="layout__dock">
        <GlobalSearchDock />
      </div>

      <div class="layout__view">
        <RouterView />
      </div>
    </section>

    <div class="layout__player">
      <PlayerBar />
    </div>

    <AuthDialog />
    <PlayerDetailDialog />
  </div>
</template>

<style scoped lang="scss">
.layout {
  --layout-player-height: 74px;
  --layout-player-bottom: 18px;
  position: relative;
  height: 100dvh;
  min-height: 100vh;
  padding: 18px 24px 26px 18px;
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: 'aside main';
  column-gap: 42px;
  row-gap: 0;
  align-items: stretch;
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
  opacity: 0.72;
}

.layout::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 54%, rgba(8, 10, 34, 0.26) 100%);
  opacity: 0.78;
}

.layout__aurora {
  position: absolute;
  inset: -10% -8%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  filter: saturate(1.02);
}

.layout__aurora::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 48%, rgba(232, 92, 255, 0.18), transparent 18%),
    radial-gradient(circle at 54% 88%, rgba(65, 156, 255, 0.22), transparent 26%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, transparent 16%, transparent 84%, rgba(255, 255, 255, 0.03) 100%);
  opacity: 0.56;
}

.layout__aurora::after {
  content: '';
  position: absolute;
  inset: -6%;
  background:
    radial-gradient(circle at 24% 58%, rgba(232, 92, 255, 0.22), transparent 18%),
    radial-gradient(circle at 52% 76%, rgba(67, 174, 255, 0.2), transparent 20%),
    radial-gradient(circle at 84% 34%, rgba(118, 102, 255, 0.14), transparent 16%);
  filter: blur(24px);
  opacity: 0.36;
  mix-blend-mode: screen;
}

.light {
  position: absolute;
  top: -10%;
  bottom: -10%;
  width: 260px;
  border-radius: 999px;
  filter: blur(92px);
  opacity: 0.16;
  mix-blend-mode: screen;
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
  filter: blur(16px);
  opacity: 0.42;
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
}

.light--pink {
  left: -2%;
  width: 260px;
  opacity: 0.28;
  background: linear-gradient(90deg, rgba(228, 95, 255, 0), rgba(228, 95, 255, 0.82) 50%, rgba(228, 95, 255, 0));
}

.light--cyan {
  left: 50%;
  width: 360px;
  opacity: 0.28;
  background: linear-gradient(90deg, rgba(66, 170, 255, 0), rgba(66, 170, 255, 0.74) 50%, rgba(66, 170, 255, 0));
}

.light--violet {
  right: 14%;
  width: 260px;
  opacity: 0.18;
  background: linear-gradient(90deg, rgba(121, 92, 255, 0), rgba(121, 92, 255, 0.52) 50%, rgba(121, 92, 255, 0));
}

.light--blue {
  left: 38%;
  width: 420px;
  opacity: 0.24;
  background: linear-gradient(90deg, rgba(34, 132, 255, 0), rgba(34, 132, 255, 0.54) 50%, rgba(34, 132, 255, 0));
}

.layout__aside,
.layout__main {
  position: relative;
  z-index: 1;
}

.layout__aside {
  grid-area: aside;
  min-height: 0;
  height: 100%;
  padding-bottom: calc(var(--layout-player-height) + var(--layout-player-bottom) + 8px);
  padding-top: 10px;
}

.layout__main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  width: min(1180px, 100%);
  justify-self: start;
  padding-bottom: calc(var(--layout-player-height) + var(--layout-player-bottom) + 12px);
  padding-top: 8px;
  padding-right: 8px;
  overflow: hidden;
}

.layout__dock {
  position: relative;
  z-index: 4;
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
  padding: 0 0 12px;
}

.layout__player {
  position: fixed;
  left: 18px;
  right: 24px;
  bottom: var(--layout-player-bottom);
  z-index: 3;
}

.layout__view {
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.layout__view::-webkit-scrollbar {
  width: 10px;
}

.layout__view::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  background-clip: padding-box;
}

@media (max-width: 960px) {
  .layout {
    --layout-player-bottom: 0px;
    height: auto;
    overflow: visible;
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-template-areas:
      'aside'
      'main'
      'player';
    row-gap: 18px;
    padding: 16px 14px 20px;
  }

  .layout__main {
    width: 100%;
    min-height: auto;
    padding-bottom: 0;
    padding-right: 0;
    overflow: visible;
  }

  .layout__dock {
    position: sticky;
    top: 0;
    padding: 0 0 12px;
  }

  .layout__view {
    flex: none;
    min-height: auto;
    overflow: visible;
  }

  .layout__aside {
    padding-bottom: 0;
  }

  .layout__player {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
  }
}

</style>
