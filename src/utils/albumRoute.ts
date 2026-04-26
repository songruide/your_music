import type { RouteLocationRaw } from 'vue-router'
import { getSongMeta } from '@/api/player'
import type { AlbumRef } from '@/types/music'

export function buildAlbumRoute(album: AlbumRef): RouteLocationRaw | null {
  const albumId = String(album.id ?? '').trim()

  if (!albumId) {
    return null
  }

  return {
    name: 'album-detail',
    params: { id: albumId },
  }
}

export interface AlbumRouteSource {
  id: string
  albumId?: string
  albumName?: string
}

export async function resolveAlbumRoute(source: AlbumRouteSource): Promise<RouteLocationRaw | null> {
  const directRoute = buildAlbumRoute({
    id: String(source.albumId ?? '').trim(),
    name: String(source.albumName ?? '').trim(),
  })

  if (directRoute) {
    return directRoute
  }

  const songId = String(source.id ?? '').trim()

  if (!songId) {
    return null
  }

  try {
    const metadata = await getSongMeta(songId)

    return buildAlbumRoute({
      id: String(metadata.albumId ?? '').trim(),
      name: metadata.albumName ?? source.albumName ?? '',
    })
  } catch {
    return null
  }
}
