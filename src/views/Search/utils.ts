import type { LocationQuery } from 'vue-router'
import type {
  SearchCategory,
  SearchMvsResponse,
  SearchPlaylistsResponse,
  SearchSongsResponse,
} from '@/api/search'
import { DEFAULT_SEARCH_TYPE, FALLBACK_COVER_URL } from './constants'
import type { SearchResultState } from './types'

export const ASSISTANT_SEARCH_SOURCE = 'assistant'

interface BuildSearchRouteOptions {
  source?: typeof ASSISTANT_SEARCH_SOURCE
}

// 路由 query 里同一个字段可能是 string / string[] / undefined，
// 这里先统一收口，后面的路由解析逻辑都基于稳定字符串工作。
export function getNormalizedQueryValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

export function getRouteKeyword(query: LocationQuery) {
  return getNormalizedQueryValue(query.q)
}

export function getRouteSearchType(query: LocationQuery): SearchCategory {
  const queryValue = getNormalizedQueryValue(query.type)

  if (queryValue === 'playlist' || queryValue === 'mv' || queryValue === 'song') {
    return queryValue
  }

  return DEFAULT_SEARCH_TYPE
}

export function getRoutePage(query: LocationQuery) {
  const rawValue = Number(getNormalizedQueryValue(query.page))

  if (!Number.isFinite(rawValue) || rawValue < 1) {
    return 1
  }

  return Math.floor(rawValue)
}

export function isAssistantSearchRoute(query: LocationQuery) {
  return getNormalizedQueryValue(query.source) === ASSISTANT_SEARCH_SOURCE
}

// buildSearchRoute 负责统一生成搜索页 URL，
// 这样分页、切类型、外部跳转都不会各自拼 query，避免规则散落。
export function buildSearchRoute(
  keyword: string,
  type: SearchCategory,
  page = 1,
  options: BuildSearchRouteOptions = {},
) {
  const query: Record<string, string> = {}

  if (keyword) {
    query.q = keyword
  }

  if (type !== DEFAULT_SEARCH_TYPE) {
    query.type = type
  }

  if (page > 1) {
    query.page = String(page)
  }

  if (options.source) {
    query.source = options.source
  }

  return {
    path: '/search',
    query,
  }
}

// API 层返回值和页面状态结构略有差异，这里做一次归一化后，
// 页面和组件就不需要知道后端字段名细节了。
export function normalizeSongResult(response: SearchSongsResponse): SearchResultState {
  return {
    type: 'song',
    keyword: response.keyword,
    total: response.total,
    items: response.songs,
  }
}

export function normalizePlaylistResult(response: SearchPlaylistsResponse): SearchResultState {
  return {
    type: 'playlist',
    keyword: response.keyword,
    total: response.total,
    items: response.playlists,
  }
}

export function normalizeMvResult(response: SearchMvsResponse): SearchResultState {
  return {
    type: 'mv',
    keyword: response.keyword,
    total: response.total,
    items: response.mvs,
  }
}

export function formatPlayCount(value?: number) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return '0'
  }

  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, '')} 亿`
  }

  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(1).replace(/\.0$/, '')} 万`
  }

  return String(Math.round(value))
}

export function formatCompactPlayCount(value?: number) {
  return formatPlayCount(value).replace(/\s+/g, '')
}

export function formatCompactTrackCount(value?: number) {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return '0首'
  }

  return `${Math.round(value)}首`
}

export function formatArtistNames(names?: string[]) {
  if (!Array.isArray(names)) {
    return '未知歌手'
  }

  return names.filter(Boolean).join(' / ') || '未知歌手'
}

// 封面加载失败时只替换一次，避免 fallback 本身异常时进入死循环。
export function handleSearchCoverError(event: Event) {
  const img = event.target as HTMLImageElement | null

  if (!img || img.dataset.fallbackApplied === 'true') {
    return
  }

  img.dataset.fallbackApplied = 'true'
  img.src = FALLBACK_COVER_URL
}
