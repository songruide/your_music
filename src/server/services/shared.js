import { fetchNcm } from './ncm.js'

export function getArtists(value) {
  if (Array.isArray(value)) {
    return value
      .map((artist) => {
        if (typeof artist === 'string') {
          return {
            id: '',
            name: artist.trim(),
          }
        }

        const name = String(artist?.name ?? '').trim()

        if (!name) {
          return null
        }

        return {
          id: String(artist?.id ?? '').trim(),
          name,
        }
      })
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return [
      {
        id: '',
        name: value.trim(),
      },
    ]
  }

  return []
}

export function getArtistNames(value) {
  return getArtists(value).map((artist) => artist.name)
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
