<script setup lang="ts">
import { Headset, HomeFilled, Monitor, Setting, VideoPlay } from '@element-plus/icons-vue'

const menus = [
  { label: 'Home', icon: HomeFilled, to: '/' },
  { label: 'Music', icon: Headset, to: '/music' },
  { label: 'MV', icon: VideoPlay, to: '/mv' },
  { label: 'MiniPlayer', icon: Monitor, to: '/mini-player' }
]
</script>

<template>
  <nav class="menu">
    <div class="menu__brand">
      Your<span>Music</span>
    </div>

    <div class="menu__group">
      <RouterLink v-for="item in menus" :key="item.label" :to="item.to" class="menu__item" active-class="is-active">
        <component :is="item.icon" class="menu__icon" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>

    <div class="menu__bottom">
      <a class="menu__item" href="javascript:;">
        <Setting class="menu__icon" />
        <span>Settings</span>
      </a>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.menu {
  position: sticky;
  top: 20px;
  min-height: calc(100vh - 156px);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  background: rgba(8, 10, 18, 0.72);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.menu__brand {
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.menu__brand span {
  padding: 2px 10px;
  font-size: 18px;
 color: #111;
   background: #fff;
    border-radius: 12px;
  
}

.menu__group,
.menu__bottom {
  display: grid;
  gap: 8px;
}

.menu__bottom {
  margin-top: auto;
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  color: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  transition: 0.25s ease;
}

.menu__item:hover,
.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.menu__icon {
  width: 18px;
  height: 18px;
}
</style>
