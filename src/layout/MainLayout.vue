<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import AiAssistantPanel from '@/components/assistant/AiAssistantPanel.vue'
import SideMenu from '@/components/SideMenu.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import PlayerDetailDialog from '@/components/PlayerDetailDialog.vue'
import GlobalSearchDock from '@/components/GlobalSearchDock.vue'
import AuthDialog from '@/components/AuthDialog.vue'
import { useAssistantStore } from '@/stores/assistant'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const assistantStore = useAssistantStore()
const playerStore = usePlayerStore()
const { isPanelOpen } = storeToRefs(assistantStore)
const { isDetailVisible } = storeToRefs(playerStore)
const isImmersiveMiniPlayer = computed(() => route.name === 'mini-player')

void authStore.initialize()

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }

  void router.push({ name: 'home' })
}
</script>

<template>
  <div class="layout" :class="{ 'layout--immersive': isImmersiveMiniPlayer }">
    <button
      v-if="!isImmersiveMiniPlayer"
      class="layout__back-button"
      type="button"
      aria-label="返回上一页"
      title="返回上一页"
      @click="goBack"
    >
      <ArrowLeft class="layout__back-icon" :stroke-width="2.2" />
    </button>

    <div v-if="!isImmersiveMiniPlayer" class="layout__aurora">
      <span class="light light--pink"></span>
      <span class="light light--cyan"></span>
      <span class="light light--violet"></span>
      <span class="light light--blue"></span>
    </div>

    <aside v-if="!isImmersiveMiniPlayer" class="layout__aside">
      <SideMenu />
    </aside>

    <section class="layout__main" :class="{ 'layout__main--immersive': isImmersiveMiniPlayer }">
      <div v-if="!isImmersiveMiniPlayer" class="layout__dock">
        <GlobalSearchDock />
      </div>

      <div class="layout__view" :class="{ 'layout__view--immersive': isImmersiveMiniPlayer }">
        <div class="layout__view-scroll" :class="{ 'layout__view-scroll--immersive': isImmersiveMiniPlayer }">
          <RouterView />
        </div>
      </div>
    </section>

    <div v-if="!isImmersiveMiniPlayer && !isDetailVisible" class="layout__player">
      <PlayerBar />
    </div>

    <Transition name="assistant-backdrop">
      <button
        v-if="isPanelOpen"
        class="layout__assistant-backdrop"
        type="button"
        aria-label="关闭 AI 面板"
        @click="assistantStore.closePanel()"
      ></button>
    </Transition>
    <AiAssistantPanel />

    <AuthDialog />
    <PlayerDetailDialog />
  </div>
</template>

<style scoped lang="scss">
.layout {
  --layout-player-height: 62px;
  --layout-player-bottom: 0px;
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

.layout--immersive {
  padding: 0;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'main';
  column-gap: 0;
  background: transparent;
}

.layout__back-button {
  position: absolute;
  top: 26px;
  left: 185px;
  z-index: 8;
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.54);
  cursor: pointer;
  transition:
    color 180ms ease,
    opacity 180ms ease,
    transform 180ms ease;
}

.layout__back-button:hover,
.layout__back-button:focus-visible {
  outline: none;
  transform: translateY(-1px);
  color: rgba(255, 255, 255, 0.82);
  opacity: 1;
}

.layout__back-icon {
  width: 17px;
  height: 17px;
}

.layout::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.42) 0 1px, transparent 1.8px),
    radial-gradient(circle at 46% 10%, rgba(100, 190, 255, 0.46) 0 1px, transparent 1.9px),
    radial-gradient(circle at 69% 16%, rgba(255, 255, 255, 0.34) 0 1px, transparent 1.7px),
    radial-gradient(circle at 86% 24%, rgba(174, 124, 255, 0.38) 0 1px, transparent 1.8px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.008) 18%, rgba(0, 5, 22, 0.3) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.055) 0%, transparent 14%, transparent 86%, rgba(255, 255, 255, 0.035) 100%);
  background-size:
    280px 220px,
    360px 260px,
    420px 300px,
    520px 340px,
    auto,
    auto;
  transform-origin: center center;
  opacity: 0.74;
}

.layout::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 54% 18%, rgba(92, 229, 255, 0.18), transparent 28%),
    radial-gradient(circle at center, transparent 48%, rgba(1, 5, 24, 0.45) 100%);
  opacity: 0.9;
}

.layout--immersive::before,
.layout--immersive::after {
  display: none;
}

.layout__aurora {
  position: absolute;
  inset: -18% -12%;
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
    radial-gradient(ellipse at 53% 14%, rgba(74, 221, 255, 0.46), transparent 28%),
    radial-gradient(ellipse at 64% 26%, rgba(80, 119, 255, 0.28), transparent 34%),
    radial-gradient(circle at 92% 82%, rgba(227, 67, 225, 0.36), transparent 26%),
    radial-gradient(circle at 9% 80%, rgba(93, 70, 255, 0.18), transparent 24%);
  opacity: 0.78;
}

.layout__aurora::after {
  content: '';
  position: absolute;
  inset: -10%;
  background:
    linear-gradient(104deg, transparent 30%, rgba(78, 215, 255, 0.1) 41%, rgba(124, 115, 255, 0.28) 48%, transparent 61%),
    linear-gradient(76deg, transparent 38%, rgba(66, 209, 255, 0.22) 47%, rgba(255, 255, 255, 0.08) 51%, transparent 62%),
    linear-gradient(124deg, transparent 56%, rgba(224, 72, 239, 0.3) 72%, transparent 88%);
  filter: blur(20px);
  opacity: 0.74;
  mix-blend-mode: screen;
}

.light {
  position: absolute;
  top: -18%;
  bottom: -18%;
  width: 260px;
  border-radius: 999px;
  filter: blur(96px);
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
  right: -4%;
  width: 360px;
  opacity: 0.34;
  background: linear-gradient(90deg, rgba(228, 95, 255, 0), rgba(228, 95, 255, 0.78) 50%, rgba(228, 95, 255, 0));
}

.light--cyan {
  left: 44%;
  width: 420px;
  opacity: 0.4;
  background: linear-gradient(90deg, rgba(56, 220, 255, 0), rgba(56, 220, 255, 0.86) 50%, rgba(56, 220, 255, 0));
}

.light--violet {
  right: 20%;
  width: 300px;
  opacity: 0.26;
  background: linear-gradient(90deg, rgba(121, 92, 255, 0), rgba(121, 92, 255, 0.66) 50%, rgba(121, 92, 255, 0));
}

.light--blue {
  left: 58%;
  width: 520px;
  opacity: 0.24;
  background: linear-gradient(90deg, rgba(34, 132, 255, 0), rgba(34, 132, 255, 0.66) 50%, rgba(34, 132, 255, 0));
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
  padding-top: 8px;
}

.layout__main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  width: min(1420px, 100%);
  justify-self: start;
  padding-bottom: calc(var(--layout-player-height) + var(--layout-player-bottom) + 12px);
  padding-top: 8px;
  padding-right: 8px;
  overflow: hidden;
}

.layout__main--immersive {
  width: 100%;
  justify-self: stretch;
  padding: 0;
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

.layout__assistant-backdrop {
  position: fixed;
  inset: 0;
  z-index: 6;
  border: 0;
  background: rgba(4, 7, 22, 0.34);
  backdrop-filter: blur(4px);
  cursor: default;
}

.layout__view {
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.layout__view--immersive {
  height: 100%;
}

.layout__view-scroll {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding-right: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.layout__view-scroll--immersive {
  padding-right: 0;
}

.layout__view-scroll::-webkit-scrollbar {
  width: 10px;
}

.layout__view-scroll::-webkit-scrollbar-thumb {
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

  .layout__back-button {
    top: 18px;
    left: 14px;
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

  .layout__view-scroll {
    height: auto;
    padding-right: 0;
    overflow: visible;
  }

  .layout__aside {
    padding-bottom: 0;
    padding-top: 30px;
  }

  .layout__player {
    position: relative;
    left: auto;
    right: auto;
    bottom: auto;
  }
}

.assistant-backdrop-enter-active,
.assistant-backdrop-leave-active {
  transition: opacity 180ms ease;
}

.assistant-backdrop-enter-from,
.assistant-backdrop-leave-to {
  opacity: 0;
}

</style>
