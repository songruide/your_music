import { request } from '@/utils/request'

export type MvFeaturedCollection = 'all' | 'official' | 'live' | 'exclusive'

export interface MvFeaturedCategory {
  key: MvFeaturedCollection
  label: string
  description: string
}

export interface MvFeaturedCollectionInfo {
  key: MvFeaturedCollection
  label: string
  description: string
}

export interface MvFeaturedItem {
  id: string
  title: string
  artistNames: string[]
  badge: string
  coverUrl: string
  duration?: number
  playCount?: number
  subtitle?: string
}

export interface MvFeaturedResponse {
  categories: MvFeaturedCategory[]
  collection: MvFeaturedCollectionInfo
  items: MvFeaturedItem[]
}

export interface MvResolutionOption {
  label: string
  value: number
}

export interface MvDetail {
  id: string
  title: string
  coverUrl: string
  artistName: string
  artistNames: string[]
  description: string
  duration?: number
  playCount?: number
  publishTime?: string
  shareCount: number
  commentCount: number
  subscribedCount: number
  availableResolutions: MvResolutionOption[]
  defaultResolution: number
}

export interface MvPlaybackSource {
  id: string
  url: string
  streamUrl: string
  type?: string
  resolution: number
  requestedResolution: number
  expiresIn?: number
}

export function getFeaturedMvs(collection: MvFeaturedCollection = 'all', limit = 12) {
  return request<MvFeaturedResponse>('/api/mvs/featured', {
    params: {
      collection,
      limit,
    },
  })
}

export function getMvDetail(id: string) {
  return request<MvDetail>('/api/mvs/detail', {
    params: { id },
  })
}

export function getMvPlaybackSource(id: string, resolution?: number) {
  return request<MvPlaybackSource>('/api/mvs/source', {
    params: {
      id,
      r: resolution,
    },
  })
}
