<script setup lang="ts">
import SideMenu from '@/components/SideMenu.vue'
import TopAction from '@/components/TopAction.vue'
import PlayerBar from '@/components/PlayerBar.vue'
</script>

<template>
  <div class="layout"><!-- //这是最外层容器
后面 grid 就是加在它身上的
它决定“左边菜单 + 右边内容”怎么分列 -->
   
    <div class="layout__aurora"> <!-- //这是背景彩色光带层
它不是 grid 主要内容，只是铺在最底下做氛围这是背景彩色光带层
它不是 grid 主要内容，只是铺在最底下做氛围 -->
      <span class="light light--pink"></span>
      <span class="light light--cyan"></span>
      <span class="light light--violet"></span>
      <span class="light light--blue"></span>
    </div>

    <aside class="layout__aside"><!-- //这是左边菜单 它会自动占第一列-->
      <SideMenu />
    </aside>

    <section class="layout__main"><!-- //这是右边内容,在 grid 里，它会自动占第二列
右边内部不是 grid，这里是 flex 纵向排布
 -->
      <TopAction />
      <div class="layout__view">
        <RouterView />
      </div>
    </section>

    <PlayerBar /><!-- //这是播放器栏,它是 fixed 固定定位，不参与这层 grid -->
  </div>
</template>

<style scoped lang="scss">
.layout {
  position: relative;
  min-height: 100vh;
  padding: 20px 40px 132px 32px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 40px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 28%),
    linear-gradient(180deg, #07090f 0%, #040507 100%);
}

.layout__aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.light {
  position: absolute;
  top: -10%;
  bottom: -10%;
  width: 220px;
  border-radius: 999px;
  filter: blur(110px);
  opacity: 0.36;
}

.light--pink {
  left: 16%;
  background: linear-gradient(180deg, rgba(255, 84, 160, 0), rgba(255, 84, 160, 0.95), rgba(255, 84, 160, 0));
}

.light--cyan {
  left: 50%;
  background: linear-gradient(180deg, rgba(0, 218, 255, 0), rgba(0, 218, 255, 0.8), rgba(0, 218, 255, 0));
}

.light--violet {
  right: 6%;
  background: linear-gradient(180deg, rgba(137, 92, 255, 0), rgba(137, 92, 255, 0.82), rgba(137, 92, 255, 0));
}

.light--blue {
  right: 22%;
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
  gap: 28px;
  min-width: 0;
   width: min(1120px, 100%);
  justify-self: start;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
    padding: 16px 16px 120px;
  }
}
</style>
