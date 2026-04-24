import { request } from '@/utils/request'
import type { ArtistRef } from '@/types/music'

export interface PlaylistCreator {
  id: string
  nickname: string
  avatarUrl: string
}

export interface PlaylistTrack {
  id: string
  name: string
  artists: ArtistRef[]
  artistNames: string[]
  albumName: string
  coverUrl: string
  duration?: number
  playable?: boolean
}

export interface PlaylistDetail {
  id: string
  name: string
  coverUrl: string
  description: string
  tags: string[]
  trackCount: number
  playCount: number
  subscribedCount: number
  commentCount: number
  shareCount: number
  createTime?: number
  updateTime?: number
  trackUpdateTime?: number
  creator: PlaylistCreator
  tracks: PlaylistTrack[]
}

export function getPlaylistDetail(id: string) {
  return request<PlaylistDetail>('/api/playlists/detail', {
    params: { id },
  })
}
