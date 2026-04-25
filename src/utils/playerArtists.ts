import type { PlayerTrack } from '@/stores/player/types'
import type { ArtistRef } from '@/types/music'

export function splitArtistNames(artist: string) {
  const names = artist
    .split(/\s*(?:\/|、|,|，)\s*/)
    .map((item) => item.trim())
    .filter(Boolean)

  return names.length ? names : ['未知歌手']
}

export function getPlayerTrackArtists(track: Pick<PlayerTrack, 'artist' | 'artists'> | null | undefined): ArtistRef[] {
  if (!track) {
    return []
  }

  if (Array.isArray(track.artists) && track.artists.length > 0) {
    const artists = track.artists
      .map((artist) => ({
        id: String(artist.id ?? '').trim(),
        name: String(artist.name ?? '').trim(),
      }))
      .filter((artist) => artist.name)

    if (artists.length > 0) {
      return artists
    }
  }

  return splitArtistNames(track.artist).map((name) => ({
    id: '',
    name,
  }))
}
