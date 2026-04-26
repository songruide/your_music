import { request } from '@/utils/request'
import type { ArtistRef } from '@/types/music'

export interface RankingPreviewTrack {
  artist: string
  title: string
}

export interface RankingSummary {
  id: string
  name: string
  coverUrl: string
  description: string
  updateFrequency: string
  trackCount: number
  playCount: number
  subscribedCount: number
  updateTime?: number
  previewTracks: RankingPreviewTrack[]
}

export interface RankingTrack {
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

export interface RankingDetail extends RankingSummary {
  tracks: RankingTrack[]
}

export function getRankings(limit = 40) {
  return request<RankingSummary[]>('/api/rankings', {
    params: { limit },
  })
}

export function getRankingDetail(id: string, limit = 100) {
  return request<RankingDetail>('/api/rankings/detail', {
    params: {
      id,
      limit,
    },
  })
}
