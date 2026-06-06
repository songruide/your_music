import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtists, getArtistNames, getSongCoverUrlsByIds } from '../services/shared.js'
import { createRouteHandler, getRequiredQueryString, sendOk } from '../utils/http.js'
import { getLimit, getOffset } from '../utils/params.js'

const router = express.Router()

function getText(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function normalizeSuggestionSong(item) {
  const artists = getArtists(item.artists ?? item.ar)

  return {
    id: String(item.id ?? item.name ?? ''),
    keyword: item.name ?? '',
    name: item.name ?? '',
    artistNames: getArtistNames(artists),
    albumName: item.album?.name ?? item.al?.name ?? '',
    type: 'song',
  }
}

function normalizeSuggestionMv(item) {
  return {
    id: String(item.id ?? item.name ?? ''),
    keyword: item.name ?? '',
    name: item.name ?? '',
    artistNames: getArtistNames(item.artists ?? item.artistName ?? item.artistNames),
    type: 'mv',
  }
}

function normalizeSuggestionAlbum(item) {
  const artistName = getText(item.artist?.name)

  return {
    id: String(item.id ?? item.name ?? ''),
    keyword: item.name ?? '',
    name: item.name ?? '',
    artistNames: artistName ? [artistName] : [],
    type: 'album',
  }
}

function normalizeSuggestionArtist(item) {
  return {
    id: String(item.id ?? item.name ?? ''),
    keyword: item.name ?? '',
    name: item.name ?? '',
    artistNames: [],
    type: 'artist',
  }
}

function normalizeSuggestionPlaylist(item) {
  return {
    id: String(item.id ?? item.name ?? ''),
    keyword: item.name ?? '',
    name: item.name ?? '',
    artistNames: item.creator?.nickname ? [item.creator.nickname] : [],
    type: 'playlist',
  }
}

function normalizeKeywordSuggestion(item) {
  const keyword = getText(item.keyword)

  return keyword
    ? {
        id: keyword,
        keyword,
        name: keyword,
        artistNames: [],
        type: 'keyword',
      }
    : null
}

function compactSuggestions(items, limit) {
  const seen = new Set()

  return items
    .filter((item) => item && item.name)
    .filter((item) => {
      const key = `${item.type}:${item.id || item.name}`.toLowerCase()

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .slice(0, limit)
}

router.get('/api/search/songs', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
  const limit = Math.min(getLimit(req.query.limit, 40), 60)
  const offset = getOffset(req.query.offset)
  const payload = await fetchNcm('/search', {
    keywords,
    limit,
    offset,
    type: 1,
  })

  const songs = (payload.result?.songs ?? []).map((item) => ({
    id: String(item.id),
    name: item.name ?? '',
    coverUrl: item.album?.picUrl ?? item.al?.picUrl ?? '',
    artists: getArtists(item.artists ?? item.ar),
    artistNames: getArtistNames(item.artists ?? item.ar),
    albumId: String(item.album?.id ?? item.al?.id ?? '').trim() || undefined,
    albumName: item.album?.name ?? item.al?.name ?? '未知专辑',
    duration: item.duration ?? item.dt,
    playable: true,
  }))
  const missingCoverSongIds = songs.filter((song) => !song.coverUrl).map((song) => song.id)

  if (missingCoverSongIds.length > 0) {
    const coverUrlMap = await getSongCoverUrlsByIds(missingCoverSongIds)

    for (const song of songs) {
      if (!song.coverUrl) {
        song.coverUrl = coverUrlMap.get(song.id) ?? ''
      }
    }
  }

  sendOk(res, {
    keyword: keywords,
    total: Number(payload.result?.songCount ?? songs.length),
    songs,
  })
}))

router.get('/api/search/suggestions', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
  const limit = Math.min(getLimit(req.query.limit, 4), 8)
  const payload = await fetchNcm('/search/suggest', {
    keywords,
    type: 'web',
  })
  const result = payload.result ?? {}
  const groups = [
    {
      key: 'songs',
      label: '单曲',
      items: compactSuggestions((result.songs ?? []).map(normalizeSuggestionSong), limit),
    },
    {
      key: 'mvs',
      label: '视频',
      items: compactSuggestions((result.mvs ?? []).map(normalizeSuggestionMv), limit),
    },
    {
      key: 'albums',
      label: '专辑',
      items: compactSuggestions((result.albums ?? []).map(normalizeSuggestionAlbum), limit),
    },
    {
      key: 'artists',
      label: '歌手',
      items: compactSuggestions((result.artists ?? []).map(normalizeSuggestionArtist), limit),
    },
    {
      key: 'playlists',
      label: '歌单',
      items: compactSuggestions((result.playlists ?? []).map(normalizeSuggestionPlaylist), limit),
    },
    {
      key: 'keywords',
      label: '相关搜索',
      items: compactSuggestions((result.allMatch ?? []).map(normalizeKeywordSuggestion), limit),
    },
  ].filter((group) => group.items.length > 0)

  sendOk(res, {
    keyword: keywords,
    groups,
  })
}))

router.get('/api/search/playlists', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
  const limit = Math.min(getLimit(req.query.limit, 18), 30)
  const offset = getOffset(req.query.offset)
  const payload = await fetchNcm('/search', {
    keywords,
    limit,
    offset,
    type: 1000,
  })

  const playlists = (payload.result?.playlists ?? []).map((item) => ({
    id: String(item.id),
    name: item.name ?? '',
    coverUrl: item.coverImgUrl ?? item.picUrl ?? '',
    creatorName: item.creator?.nickname ?? '未知创建者',
    description: item.description ?? '',
    playCount: item.playCount,
    trackCount: item.trackCount,
  }))

  sendOk(res, {
    keyword: keywords,
    total: Number(payload.result?.playlistCount ?? playlists.length),
    playlists,
  })
}))

router.get('/api/search/mvs', createRouteHandler(async (req, res) => {
  const keywords = getRequiredQueryString(req, 'keywords', 'keywords is required')
  const limit = Math.min(getLimit(req.query.limit, 18), 30)
  const offset = getOffset(req.query.offset)
  const payload = await fetchNcm('/search', {
    keywords,
    limit,
    offset,
    type: 1004,
  })

  const mvs = (payload.result?.mvs ?? []).map((item) => ({
    id: String(item.id),
    name: item.name ?? '',
    artistNames: getArtistNames(item.artists ?? item.artistName ?? item.artistNames),
    coverUrl: item.cover ?? item.imgurl ?? '',
    duration: item.duration,
    playCount: item.playCount,
  }))

  sendOk(res, {
    keyword: keywords,
    total: Number(payload.result?.mvCount ?? mvs.length),
    mvs,
  })
}))

export default router
