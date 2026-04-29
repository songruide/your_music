import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { AssistantRouteContext } from '@/types/ai'

const ROUTE_LABELS: Record<string, string> = {
  home: '首页',
  'playlist-detail': '歌单详情',
  'artist-detail': '歌手详情',
  'album-detail': '专辑详情',
  search: '搜索页',
  'home-discover': '发现页',
  mv: 'MV',
  rankings: '排行榜',
  'mini-player': '最近播放',
  'local-music': '本地音乐',
  'favorite-music': '收藏音乐',
}

export function getAssistantRouteLabel(routeName?: string) {
  if (!routeName) {
    return '当前页面'
  }

  return ROUTE_LABELS[routeName] ?? routeName
}

export function buildAssistantRouteContext(route: RouteLocationNormalizedLoaded): AssistantRouteContext {
  const routeName = typeof route.name === 'string' ? route.name : ''

  return {
    name: routeName || undefined,
    path: route.path || undefined,
    title: getAssistantRouteLabel(routeName),
  }
}
