import { request } from '@/utils/request'
import type { ArtistRef } from '@/types/music'

export interface HomeBanner {
  id: string
  title: string
  imageUrl: string
  subtitle?: string
  badge?: string
  targetId?: string
  targetType?: 'toplist' | 'playlist' | 'artist' | 'song' | 'unknown'
}

export interface HomePlaylist {
  id: string
  title: string
  coverUrl: string
  playCount?: number
  description?: string
  trackCount?: number
}

export interface HomeArtist {
  id: string
  name: string
  avatarUrl: string
  musicCount?: number
  albumCount?: number
  mvCount?: number
}

export interface HomeSong {
  id: string
  name: string
  coverUrl: string
  artists: ArtistRef[]
  artistNames: string[]
  albumName?: string
  duration?: number
  playable?: boolean
}

export interface HomePageData {
  banners: HomeBanner[]
  recommendedPlaylists: HomePlaylist[]
  hotArtists: HomeArtist[]
  hotSongs: HomeSong[]
}

export interface HomePageOptions {
  bannerLimit?: number
  playlistLimit?: number
  artistLimit?: number
  songLimit?: number
}

export interface HomePlaylistOptions {
  cat?: string
  limit?: number
  offset?: number
  order?: 'hot' | 'new'
}

export interface HomeArtistOptions {
  area?: number
  initial?: string | number
  limit?: number
  offset?: number
  type?: number
}

export interface HomeSongOptions {
  limit?: number
  offset?: number
  source?: 'recommend' | 'top'
  type?: number
}

export interface PlaylistCategoryGroup {
  id: string
  name: string
  tags: string[]
}

function getHomeBanners(limit = 5) {
  return request<HomeBanner[]>('/api/home/banners', {
    params: { limit },
  })
}

export function getRecommendedPlaylists(limit = 12, options: Omit<HomePlaylistOptions, 'limit'> = {}) {
  return request<HomePlaylist[]>('/api/home/recommended-playlists', {
    params: {
      limit,
      cat: options.cat,
      offset: options.offset,
      order: options.order,
    },
  })
}

export function getHotArtists(limit = 10, options: Omit<HomeArtistOptions, 'limit'> = {}) {
  return request<HomeArtist[]>('/api/home/hot-artists', {
    params: {
      limit,
      area: options.area,
      initial: options.initial,
      offset: options.offset,
      type: options.type,
    },
  })
}

export function getHotSongs(limit = 10, options: Omit<HomeSongOptions, 'limit'> = {}) {
  return request<HomeSong[]>('/api/home/hot-songs', {
    params: {
      limit,
      offset: options.offset,
      source: options.source,
      type: options.type,
    },
  })
}

export function getPlaylistCategories() {
  return request<PlaylistCategoryGroup[]>('/api/home/playlist-categories')
}

// Home page components only depend on one method.
// The internal data source can later switch from four endpoints to one BFF endpoint.
export async function getHomePage(options: HomePageOptions = {}): Promise<HomePageData> {
  const {
    bannerLimit = 5,
    playlistLimit = 12,
    artistLimit = 10,
    songLimit = 10,
  } = options

  const [banners, recommendedPlaylists, hotArtists, hotSongs] = await Promise.all([
    getHomeBanners(bannerLimit),
    getRecommendedPlaylists(playlistLimit),
    getHotArtists(artistLimit),
    getHotSongs(songLimit),
  ])

  return {
    banners,
    recommendedPlaylists,
    hotArtists,
    hotSongs,
  }
}
