<script setup lang="ts">
import {
  BellFilled,
  Clock,
  FolderOpened,
  Headset,
  HomeFilled,
  Search,
  Setting,
  TrendCharts,
  UserFilled,
  VideoPlay,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'

type MenuItem = {
  label: string
  icon: Component
  to?: string
  muted?: boolean
}

const route = useRoute()

const sections: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: '探索',
    items: [
      { label: '首页', icon: HomeFilled, to: '/' },
      { label: 'MV', icon: VideoPlay, to: '/mv' },
      { label: '音乐馆', icon: Headset, to: '/music' },
      { label: '排行榜', icon: TrendCharts, muted: true },
      { label: '歌手', icon: UserFilled, muted: true },
      { label: '搜索', icon: Search, muted: true },
    ],
  },
  {
    title: '我的音乐',
    items: [
      { label: '最近播放', icon: Clock, to: '/mini-player' },
      { label: '本地音乐', icon: FolderOpened, muted: true },
      { label: '新歌上架', icon: BellFilled, muted: true },
    ],
  },
  {
    title: '系统',
    items: [{ label: '设置', icon: Setting, muted: true }],
  },
]

const isActive = (to?: string) => Boolean(to && route.path === to)
</script>

<template>
  <nav class="menu" aria-label="Sidebar">
    <div class="menu__brand">
      Your<span>Music</span>
    </div>

    <div class="menu__panel">
      <section v-for="section in sections" :key="section.title" class="menu__section">
        <p class="menu__title">{{ section.title }}</p>

        <div class="menu__group">
          <template v-for="item in section.items" :key="item.label">
            <RouterLink
              v-if="item.to"
              :to="item.to"
              class="menu__item"
              :class="{ 'is-active': isActive(item.to) }"
            >
              <component :is="item.icon" class="menu__icon" />
              <span>{{ item.label }}</span>
            </RouterLink>

            <button
              v-else
              type="button"
              class="menu__item menu__item--button"
              :class="{ 'is-muted': item.muted }"
            >
              <component :is="item.icon" class="menu__icon" />
              <span>{{ item.label }}</span>
            </button>
          </template>
        </div>
      </section>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.menu {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.menu__brand {
  padding-left: 4px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
  color: #fff;
}

.menu__brand span {
  margin-left: 4px;
  padding: 6px 10px;
  display: inline-block;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: #140e1f;
  background: linear-gradient(180deg, #ffffff, #eee5ff);
  border-radius: 11px;
}

.menu__panel {
  padding: 14px 12px 18px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 18%),
    var(--app-surface);
  border: 1px solid var(--app-border);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -24px 50px rgba(16, 8, 62, 0.3),
    0 18px 40px rgba(10, 4, 36, 0.28);
  backdrop-filter: blur(18px);
}

.menu__section + .menu__section {
  margin-top: 18px;
}

.menu__title {
  margin: 0 0 10px;
  padding: 0 6px;
  color: rgba(255, 238, 255, 0.72);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.menu__group {
  display: grid;
  gap: 4px;
}

.menu__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 10px;
  color: rgba(255, 247, 255, 0.9);
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.menu__item--button {
  background: transparent;
  cursor: default;
}

.menu__item:hover,
.menu__item:focus-visible,
.menu__item.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  outline: none;
}

.menu__item:not(.menu__item--button):hover {
  transform: translateX(2px);
}

.menu__item.is-active {
  background: rgba(255, 255, 255, 0.14);
}

.menu__item.is-muted {
  color: rgba(255, 235, 255, 0.82);
}

.menu__icon {
  width: 14px;
  height: 14px;
  flex: none;
}

@media (max-width: 960px) {
  .menu {
    position: static;
  }
}
</style>
