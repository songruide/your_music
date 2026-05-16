import fs from 'node:fs/promises'
import path from 'node:path'
import { fetchNcm } from './ncm.js'
import { resolveSongSource } from './player.js'

function sanitizeSegment(value) {
  return String(value ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getArtistLine(track) {
  if (Array.isArray(track.artists) && track.artists.length > 0) {
    const names = track.artists
      .map((artist) => sanitizeSegment(artist?.name))
      .filter(Boolean)

    if (names.length > 0) {
      return names.join(' - ')
    }
  }

  return sanitizeSegment(track.artist || '未知歌手')
}

function buildBaseName(track, nameFormat) {
  const artist = getArtistLine(track)
  const title = sanitizeSegment(track.title || '未知歌曲')
  const album = sanitizeSegment(track.album || '未分类专辑')

  if (nameFormat === '歌曲名 - 歌手') {
    return `${title} - ${artist}`
  }

  if (nameFormat === '专辑/歌曲名') {
    return path.join(album || '未分类专辑', title)
  }

  return `${artist} - ${title}`
}

function resolveFileExtension(song) {
  const type = String(song?.type ?? '').trim().toLowerCase()

  if (type) {
    return type
  }

  return 'mp3'
}

async function ensureDirectoryForFile(targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
}

async function writeResponseToFile(url, filePath) {
  const response = await fetch(url, { redirect: 'follow' })

  if (!response.ok) {
    throw new Error(`下载音频失败: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await ensureDirectoryForFile(filePath)
  await fs.writeFile(filePath, buffer)
}

async function writeLyricsFile(songId, filePath) {
  const payload = await fetchNcm('/lyric', { id: songId })
  const lyric = String(payload?.lrc?.lyric ?? '').trim()
  const translatedLyric = String(payload?.tlyric?.lyric ?? '').trim()

  if (!lyric && !translatedLyric) {
    return ''
  }

  const content = translatedLyric ? `${lyric}\n\n${translatedLyric}\n` : `${lyric}\n`

  await ensureDirectoryForFile(filePath)
  await fs.writeFile(filePath, content, 'utf8')
  return filePath
}

export async function downloadSongToLocal(payload, options = {}) {
  const directory = path.resolve(String(payload.directory ?? '').trim())
  const track = payload.track ?? {}
  const nameFormat = String(payload.nameFormat ?? '歌手 - 歌曲名')
  const level = String(payload.level ?? 'standard')
  const includeLyrics = Boolean(payload.includeLyrics)
  const cookie = String(options.cookie ?? '').trim()
  const songId = String(track.id ?? '').trim()

  if (!directory) {
    throw new Error('下载目录不能为空')
  }

  if (!songId) {
    throw new Error('歌曲 id 不能为空')
  }

  const { song } = await resolveSongSource(songId, level, { cookie })

  if (!song?.url) {
    throw new Error('当前歌曲暂无可用音源')
  }

  const extension = resolveFileExtension(song)
  const baseName = buildBaseName(track, nameFormat)
  const audioPath = path.join(directory, `${baseName}.${extension}`)

  await writeResponseToFile(song.url, audioPath)

  let lyricPath = ''

  if (includeLyrics) {
    lyricPath = await writeLyricsFile(songId, path.join(directory, `${baseName}.lrc`))
  }

  return {
    audioPath,
    bitrate: song.br,
    fileName: path.basename(audioPath),
    level: song.level ?? level,
    lyricPath: lyricPath || undefined,
    type: extension,
  }
}
