import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ncmEnhanced = require('../../../api-enhanced/main.js')

function safeNumber(value) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(Math.floor(durationMs / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function pickArtistName(song) {
  return pickArtists(song)
    .map((artist) => artist.name)
    .join(' / ')
}

function pickArtists(song) {
  const artists = Array.isArray(song?.ar)
    ? song.ar
    : Array.isArray(song?.artists)
      ? song.artists
      : []

  return artists
    .map((artist) => {
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

function pickAlbum(song) {
  return String(song?.al?.name ?? song?.album?.name ?? '').trim()
}

function pickCoverUrl(song) {
  return String(song?.al?.picUrl ?? song?.album?.picUrl ?? '').trim()
}

function normalizeResumeSeconds(entry, durationMs) {
  const rawValue = safeNumber(entry?.playProgress ?? entry?.lastTimeSeconds ?? entry?.progress)

  if (rawValue <= 0) {
    return 0
  }

  const durationSeconds = durationMs > 0 ? durationMs / 1000 : 0

  if (durationSeconds > 0 && rawValue > durationSeconds + 2 && rawValue <= durationMs + 2000) {
    return Math.min(Math.round(rawValue / 1000), Math.round(durationSeconds))
  }

  return durationSeconds > 0 ? Math.min(Math.round(rawValue), Math.round(durationSeconds)) : Math.round(rawValue)
}

function normalizePlayCount(entry, index) {
  const rawCount = safeNumber(entry?.playCount ?? entry?.listenCount ?? entry?.count)

  if (rawCount > 0) {
    return rawCount
  }

  return Math.max(1, 9 - Math.floor(index / 4))
}

function normalizeRecentSongEntry(entry, index) {
  const song = entry?.data ?? entry?.song ?? entry?.resource?.data ?? entry?.resource ?? {}
  const id = String(song?.id ?? entry?.resourceId ?? '').trim()
  const title = String(song?.name ?? entry?.name ?? '').trim()

  if (!id || !title) {
    return null
  }

  const durationMs = safeNumber(song?.dt ?? song?.duration ?? song?.durationMs)
  const lastPlayedAt = safeNumber(entry?.playTime ?? entry?.lastPlayedAt ?? entry?.playedAt) || Date.now()

  return {
    id,
    title,
    artists: pickArtists(song),
    artist: pickArtistName(song) || '未知歌手',
    album: pickAlbum(song) || '单曲收藏',
    coverUrl: pickCoverUrl(song),
    duration: formatDuration(durationMs),
    durationMs: durationMs || undefined,
    isFavorite: Boolean(entry?.isFavorite ?? song?.starred ?? false),
    lastPlayedAt,
    lastTimeSeconds: normalizeResumeSeconds(entry, durationMs),
    playCount: normalizePlayCount(entry, index),
  }
}

export async function fetchRecentSongTracks(options = {}) {
  const cookie = String(options.cookie ?? '').trim()
  const limit = Math.min(Math.max(safeNumber(options.limit) || 40, 1), 100)

  if (!cookie) {
    return []
  }

  const result = await ncmEnhanced.record_recent_song({
    cookie,
    limit,
    timestamp: Date.now(),
    ua: options.ua ?? 'pc',
  })

  const body = result?.body ?? {}
  const code = safeNumber(body?.code)

  if (code && code !== 200) {
    throw new Error(String(body?.message ?? '最近播放获取失败'))
  }

  const list = Array.isArray(body?.data?.list) ? body.data.list : Array.isArray(body?.list) ? body.list : []

  return list
    .map((entry, index) => normalizeRecentSongEntry(entry, index))
    .filter(Boolean)
}
