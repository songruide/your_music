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
      <TopAction />
      <div class="layout__view">
        <RouterView />
      </div>
    </section>

    <PlayerBar />
  </div>
</template>

<style scoped lang="scss">
.layout {
  position: relative;
  min-height: 100vh;
  padding: 26px 34px 74px 20px;
  display: grid;
  grid-template-columns: 106px minmax(0, 1fr);
  gap: 64px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 28%),
    linear-gradient(180deg, #07090f 0%, #040507 100%);
}

.layout__aurora {
   position: absolute;
  inset: -8%;
  pointer-events: none;
  overflow: hidden;
}

.light {
  position: absolute;
  top: -10%;
  bottom: -10%;
  width: 248px;
  border-radius: 999px;
  filter: blur(136px);
  opacity: 0.27;
}

.light--pink {
  left: 23%;
  background: linear-gradient(180deg, rgba(255, 84, 160, 0), rgba(255, 84, 160, 0.95), rgba(255, 84, 160, 0));
}

.light--cyan {
  left: 56%;
  background: linear-gradient(180deg, rgba(0, 218, 255, 0), rgba(0, 218, 255, 0.8), rgba(0, 218, 255, 0));
}

.light--violet {
  right: 2%;
  background: linear-gradient(180deg, rgba(137, 92, 255, 0), rgba(137, 92, 255, 0.82), rgba(137, 92, 255, 0));
}

.light--blue {
  right: 18%;
  background: linear-gradient(180deg, rgba(46, 131, 255, 0), rgba(46, 131, 255, 0.75), rgba(46, 131, 255, 0));
}

.layout__aside,
.layout__main {
  position: relative;
  z-index: 1;
}

.layout__main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  width: min(760px, 100%);
  justify-self: center;
  padding-top: 2px;
}

.layout__view {
  width: 100%;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 18px 16px 84px;
  }

  .layout__main {
    width: 100%;
  }
}
</style>
