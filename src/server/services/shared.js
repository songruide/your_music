import { fetchNcm } from './ncm.js'

export function getArtistNames(value) {
  if (Array.isArray(value)) {
    return value
      .map((artist) => {
        if (typeof artist === 'string') {
          return artist
        }

        return artist?.name
      })
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }

  return []
}

export async function getSongCoverUrlsByIds(ids) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))

  if (uniqueIds.length === 0) {
    return new Map()
  }

  const payload = await fetchNcm('/song/detail', {
    ids: uniqueIds.join(','),
  })
  const coverUrlMap = new Map()

  for (const song of payload.songs ?? []) {
    const coverUrl = song.al?.picUrl ?? song.album?.picUrl ?? ''

    if (coverUrl) {
      coverUrlMap.set(String(song.id), coverUrl)
    }
  }

  return coverUrlMap
}
