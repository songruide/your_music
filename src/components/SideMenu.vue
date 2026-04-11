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
  top: 28px;
  min-height: calc(100vh - 132px);
  padding: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  background: transparent;
  backdrop-filter: none;
  border: 0;
}

.menu__brand {
  margin-bottom: 22px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: #fff;
}

.menu__brand span {
  margin-left: 2px;
  padding: 4px 7px;
  display: inline-block;
  font-size: 11px;
  color: #111;
  background: #fff;
  border-radius: 10px;
}

.menu__group,
.menu__bottom {
  display: grid;
  gap: 3px;
}

.menu__bottom {
  margin-top: auto;
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 7px 8px;
  color: rgba(255, 255, 255, 0.66);
  border-radius: 11px;
  font-size: 11px;
  transition: 0.25s ease;
}

.menu__item:hover,
.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.menu__icon {
  width: 12px;
  height: 12px;
}
</style>
