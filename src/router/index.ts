import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 所有页面都挂在 MainLayout 下面，
// 这样侧边栏和底部播放器可以作为全局外壳长期存在，切页时不会被销毁。
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/home/index.vue'),
      },
      {
        path: 'playlist/:id',
        name: 'playlist-detail',
        component: () => import('@/views/Playlist/index.vue'),
      },
      {
        path: 'artist/:id',
        name: 'artist-detail',
        component: () => import('@/views/Artist/index.vue'),
      },
      {
        path: 'album/:id',
        name: 'album-detail',
        component: () => import('@/views/Album/index.vue'),
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/views/Search/index.vue'),
      },
      {
        path: 'discover/:section',
        name: 'home-discover',
        component: () => import('@/views/HomeDiscover/index.vue'),
      },
      {
        path: 'mv',
        name: 'mv',
        component: () => import('@/views/Mv/index.vue'),
      },
      {
        path: 'rankings',
        name: 'rankings',
        component: () => import('@/views/Rankings/index.vue'),
      },
      {
        path: 'mini-player',
        name: 'mini-player',
        component: () => import('@/views/MiniPlayer/index.vue'),
      },
      {
        path: 'local-music',
        name: 'local-music',
        component: () => import('@/views/LocalMusic/index.vue'),
      },
      {
        path: 'favorite-music',
        name: 'favorite-music',
        meta: {
          requiresAuth: true,
        },
        component: () => import('@/views/FavoriteMusic/index.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/Settings/index.vue'),
      },
    ],
  },
]

// 使用 HTML5 history 模式，让 URL 看起来更自然。
const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth !== true) {
    return true
  }

  const authStore = useAuthStore()
  await authStore.initialize()

  if (authStore.loggedIn) {
    return true
  }

  authStore.openLoginDialog('qr')

  return {
    name: 'home',
    query: {
      redirect: to.fullPath,
    },
    replace: true,
  }
})

export default router
