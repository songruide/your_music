import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { getArtists, getArtistNames } from '../services/shared.js'
import {
  getMvCoverUrl,
  getMvDuration,
  getMvPlayCount,
} from '../services/mv.js'
import {
  createRouteHandler,
  getRequiredQueryString,
  HttpError,
  sendOk,
} from '../utils/http.js'

const router = express.Router()

function mapArtistSong(item, fallbackArtistName) {
  return {
    id: String(item.id ?? ''),
    name: item.name ?? '',
    artists: getArtists(item.ar ?? item.artists ?? fallbackArtistName),
    artistNames: getArtistNames(item.ar ?? item.artists ?? fallbackArtistName),
    albumName: item.al?.name ?? item.album?.name ?? '未知专辑',
    coverUrl: item.al?.picUrl ?? item.album?.picUrl ?? '',
    duration: item.dt ?? item.duration,
    playable: item.privilege?.st !== -200 && item.noCopyrightR !== 1,
  }
}

router.get('/api/artists/detail', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'artist id is required')
  const [artistPayload, topSongsPayload, artistMvPayload, artistAlbumPayload] = await Promise.all([
    fetchNcm('/artists', { id }),
    fetchNcm('/artist/top/song', { id }),
    fetchNcm('/artist/mv', { id, limit: 8 }),
    fetchNcm('/artist/album', { id, limit: 8 }),
  ])

  const artist = artistPayload.artist

  if (!artist) {
    throw new HttpError(404, 'artist not found')
  }

  const artistName = artist.name ?? '未知歌手'
  const songsSource = Array.isArray(topSongsPayload.songs)
    ? topSongsPayload.songs
    : Array.isArray(artistPayload.hotSongs)
      ? artistPayload.hotSongs
      : []

  const songs = songsSource
    .map((item) => mapArtistSong(item, artistName))
    .filter((song) => song.id && song.name)
  const mvs = (Array.isArray(artistMvPayload?.mvs) ? artistMvPayload.mvs : [])
    .map((item) => ({
      id: String(item.id ?? item.vid ?? ''),
      title: String(item.name ?? item.title ?? '').trim(),
      artistNames: getArtistNames(item.artists ?? item.artistName ?? artistName),
      coverUrl: getMvCoverUrl(item),
      duration: getMvDuration(item),
      playCount: getMvPlayCount(item),
    }))
    .filter((item) => item.id && item.title)
  const albums = (Array.isArray(artistAlbumPayload?.hotAlbums) ? artistAlbumPayload.hotAlbums : [])
    .map((item) => ({
      id: String(item.id ?? ''),
      title: String(item.name ?? '').trim(),
      coverUrl: item.picUrl ?? item.blurPicUrl ?? '',
      artistNames: getArtistNames(item.artists ?? item.artist ?? artistName),
      publishYear: String(item.publishTime ?? '').trim()
        ? new Date(Number(item.publishTime)).getFullYear().toString()
        : undefined,
      trackCount: Number(item.size ?? item.songSize ?? 0) || undefined,
    }))
    .filter((item) => item.id && item.title)

  sendOk(res, {
    id: String(artist.id ?? id),
    name: artistName,
    coverUrl: artist.picUrl ?? artist.img1v1Url ?? '',
    description: artist.briefDesc ?? artistPayload.more?.intro ?? '',
    alias: Array.isArray(artist.alias) ? artist.alias.filter(Boolean) : [],
    musicCount: Number(artist.musicSize ?? songs.length),
    albumCount: Number(artist.albumSize ?? 0),
    mvCount: Number(artist.mvSize ?? 0),
    followedCount: Number(artist.followed ?? 0),
    songs,
    mvs,
    albums,
  })
}))

export default router
