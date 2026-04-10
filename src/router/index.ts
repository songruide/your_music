import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

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
        path: 'music',
        name: 'music',
        component: () => import('@/views/Music/index.vue'),
      },
      {
        path: 'mv',
        name: 'mv',
        component: () => import('@/views/Mv/index.vue'),
      },
      {
        path: 'mini-player',
        name: 'mini-player',
        component: () => import('@/views/MiniPlayer/index.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
