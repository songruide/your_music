import { request } from '@/utils/request'
import type { ArtistRef } from '@/types/music'

export interface ArtistSong {
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

export interface ArtistMv {
  id: string
  title: string
  artistNames: string[]
  coverUrl: string
  duration?: number
  playCount?: number
}

export interface ArtistAlbum {
  id: string
  title: string
  coverUrl: string
  artistNames: string[]
  publishYear?: string
  trackCount?: number
}

export interface ArtistDetail {
  id: string
  name: string
  coverUrl: string
  description: string
  alias: string[]
  musicCount: number
  albumCount: number
  mvCount: number
  followedCount: number
  songs: ArtistSong[]
  mvs: ArtistMv[]
  albums: ArtistAlbum[]
}

export function getArtistDetail(id: string) {
  return request<ArtistDetail>('/api/artists/detail', {
    params: { id },
  })
}
