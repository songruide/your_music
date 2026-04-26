import type { RouteLocationRaw } from 'vue-router'
import type { ArtistRef } from '@/types/music'
import { buildSearchRoute } from '@/views/Search/utils'

export function buildArtistRoute(artist: ArtistRef): RouteLocationRaw | null {
  const artistName = String(artist.name ?? '').trim()
  const artistId = String(artist.id ?? '').trim()

  if (!artistName) {
    return null
  }

  if (artistId) {
    return {
      name: 'artist-detail',
      params: { id: artistId },
    }
  }

  return buildSearchRoute(artistName, 'song')
}
