<script setup lang="ts">
import {
  Clock,
  FolderOpened,
  HomeFilled,
  Search,
  Setting,
  TrendCharts,
  VideoPlay,
} from '@element-plus/icons-vue'
import { Heart } from 'lucide-vue-next'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'

// 侧边栏菜单项的数据模型。
// to 表示这是一个可跳转路由；
// muted 表示当前只是“占位入口”，先展示但暂不开放交互。
type MenuItem = {
  label: string
  icon: Component
  to?: string
  muted?: boolean
}

const route = useRoute()

// 侧边栏不是把每个按钮直接写死在模板里，
// 而是先整理成分组数据，再通过 v-for 渲染。
// 这样后面增加菜单、调整顺序时，只改配置数据就够了。
const sections: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: '探索',
    items: [
      { label: '首页', icon: HomeFilled, to: '/' },
      { label: 'MV', icon: VideoPlay, to: '/mv' },
      { label: '搜索', icon: Search, to: '/search' },
      { label: '排行榜', icon: TrendCharts, to: '/rankings' },
    ],
  },
  {
    title: '我的音乐',
    items: [
      { label: '最近播放', icon: Clock, to: '/mini-player' },
      { label: '本地音乐', icon: FolderOpened, to: '/local-music' },
      { label: '收藏音乐', icon: Heart, to: '/favorite-music' },
    ],
  },
  {
    title: '系统',
    items: [{ label: '设置', icon: Setting, muted: true }],
  },
]

// 当前路径与菜单目标路径一致时，高亮对应项。
const isActive = (to?: string) => Boolean(to && route.path === to)
</script>

<template>
  <nav class="menu" aria-label="Sidebar">
    <!-- 顶部品牌区。 -->
    <div class="menu__brand">
      Your<span>Music</span>
    </div>

    <div class="menu__panel">
      <section
        v-for="section in sections"
        :key="section.title"
        class="menu__section"
        :class="{ 'menu__section--tail': section.title === '系统' }"
      >
        <p class="menu__title">{{ section.title }}</p>

        <div class="menu__group">
          <template v-for="item in section.items" :key="item.label">
            <!-- 有 to 的菜单项渲染成 RouterLink，点击后执行真实路由跳转。 -->
            <RouterLink
              v-if="item.to"
              :to="item.to"
              class="menu__item"
              :class="{ 'is-active': isActive(item.to) }"
            >
              <component :is="item.icon" class="menu__icon" />
              <span>{{ item.label }}</span>
            </RouterLink>

            <!-- 没有 to 的菜单项先用 button 占位，表示“功能规划中但暂未开放”。 -->
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
  top: 18px;
  height: calc(100dvh - var(--layout-player-height, 78px) - var(--layout-player-bottom, 18px) - 42px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

// 使用 sticky 让侧边栏在桌面端滚动时保持可见，
// 这样用户在长页面里也能随时切换页面。
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
  flex: 1;
  min-height: 0;
  padding: 14px 12px 18px;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 18%),
    var(--app-surface);
  border: 1px solid var(--app-border);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -18px 34px rgba(16, 8, 62, 0.2),
    0 12px 24px rgba(10, 4, 36, 0.18);
}

.menu__section + .menu__section {
  margin-top: 18px;
}

.menu__section--tail {
  margin-top: auto;
  padding-top: 18px;
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

// 每个菜单项都做成整行点击区域，提升可点击性和命中率。
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
  // 小屏幕下取消 sticky，避免占据过多可视区域。
  .menu {
    position: static;
    height: auto;
  }
}
</style>
