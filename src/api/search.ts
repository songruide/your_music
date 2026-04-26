import { request } from '@/utils/request'
import type { ArtistRef } from '@/types/music'

export type SearchCategory = 'song' | 'playlist' | 'mv'

// SearchSong 是“搜索结果里单首歌曲”的前端数据结构。
// 这里的字段设计尽量贴近页面展示需求，而不是直接照搬后端原始结构，
// 这样视图层拿到数据后可以直接渲染，减少组件里的临时转换代码。
export interface SearchSong {
  id: string
  name: string
  artists: ArtistRef[]
  artistNames: string[]
  albumId?: string
  albumName: string
  coverUrl: string
  duration?: number
  playable?: boolean
}

export interface SearchPlaylist {
  id: string
  name: string
  coverUrl: string
  creatorName: string
  description?: string
  playCount?: number
  trackCount?: number
}

export interface SearchMv {
  id: string
  name: string
  artistNames: string[]
  coverUrl: string
  duration?: number
  playCount?: number
}

// 搜索接口返回的是“本次关键词 + 总结果数 + 当前页歌曲列表”。
// 这里虽然现在只做了简单搜索页，但把返回值单独建模后，
// 后面加分页、筛选、缓存时会更容易扩展。
export interface SearchSongsResponse {
  keyword: string
  total: number
  songs: SearchSong[]
}

export interface SearchPlaylistsResponse {
  keyword: string
  total: number
  playlists: SearchPlaylist[]
}

export interface SearchMvsResponse {
  keyword: string
  total: number
  mvs: SearchMv[]
}

export interface SearchRequestOptions {
  limit?: number
  offset?: number
}

function buildSearchParams(keywords: string, options: SearchRequestOptions = {}) {
  return {
    keywords,
    limit: options.limit,
    offset: options.offset,
  }
}

// 这是搜索歌曲的 API 封装。
// 页面层只关心“传关键词进来，拿结果出去”，
// 不需要知道底层 URL、query 参数怎么拼、响应怎么解包。
export function searchSongs(keywords: string, options: SearchRequestOptions = {}) {
  return request<SearchSongsResponse>('/api/search/songs', {
    params: buildSearchParams(keywords, options),
  })
}

export function searchPlaylists(keywords: string, options: SearchRequestOptions = {}) {
  return request<SearchPlaylistsResponse>('/api/search/playlists', {
    params: buildSearchParams(keywords, options),
  })
}

export function searchMvs(keywords: string, options: SearchRequestOptions = {}) {
  return request<SearchMvsResponse>('/api/search/mvs', {
    params: buildSearchParams(keywords, options),
  })
}
