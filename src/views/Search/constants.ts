import type { SearchCategory } from '@/api/search'
import type { SearchTypeOption } from './types'

// 搜索页把 song 作为默认类型，这样 URL 不带 type 时也能稳定回退。
export const DEFAULT_SEARCH_TYPE: SearchCategory = 'song'

export const SEARCH_TYPE_OPTIONS: SearchTypeOption[] = [
  { value: 'song', label: '单曲' },
  { value: 'playlist', label: '歌单' },
  { value: 'mv', label: 'MV' },
]

const SEARCH_TYPE_LABELS: Record<SearchCategory, string> = {
  song: '单曲',
  playlist: '歌单',
  mv: 'MV',
}

const SEARCH_PAGE_SIZES: Record<SearchCategory, number> = {
  song: 40,
  playlist: 18,
  mv: 18,
}

// 图片兜底统一放在常量里，避免各个结果组件各自维护一份默认封面。
export const FALLBACK_COVER_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23f35bb4'/%3E%3Cstop offset='1' stop-color='%23508dff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ccircle cx='60' cy='44' r='16' fill='rgba(255,255,255,.7)'/%3E%3Crect x='30' y='68' width='60' height='22' rx='11' fill='rgba(255,255,255,.46)'/%3E%3C/svg%3E"

export function getPageSize(type: SearchCategory) {
  return SEARCH_PAGE_SIZES[type]
}

export function getSearchTypeLabel(type: SearchCategory) {
  return SEARCH_TYPE_LABELS[type]
}
