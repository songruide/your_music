import { request } from '@/utils/request'
import type { ArtistRef } from '@/types/music'

export interface AlbumArtist {
  id: string
  name: string
}

export interface AlbumTrack {
  id: string
  name: string
  artists: ArtistRef[]
  artistNames: string[]
  albumName: string
  coverUrl: string
  duration?: number
  playable?: boolean
}

export interface AlbumDetail {
  id: string
  name: string
  coverUrl: string
  description: string
  publishTime?: number
  company?: string
  size: number
  subCount: number
  shareCount: number
  artistNames: string[]
  artists: AlbumArtist[]
  songs: AlbumTrack[]
}

export function getAlbumDetail(id: string) {
  return request<AlbumDetail>('/api/albums/detail', {
    params: { id },
  })
}
