import { fetchNcm } from './ncm.js'
import { getArtistNames } from './shared.js'

export const MV_COLLECTIONS = [
  {
    key: 'all',
    label: '全部',
    badge: '精选',
    description: '热门 MV 一次看全，适合先逛一圈找今天的第一支视频。',
    endpoint: '/mv/all',
    getParams(limit) {
      return {
        area: '全部',
        limit,
        offset: 0,
        order: '最热',
        type: '全部',
      }
    },
  },
  {
    key: 'official',
    label: '官方',
    badge: '官方版',
    description: '更完整的主视觉和叙事表达，适合看完整制作感。',
    endpoint: '/mv/all',
    getParams(limit) {
      return {
        area: '全部',
        limit,
        offset: 0,
        order: '最热',
        type: '官方版',
      }
    },
  },
  {
    key: 'live',
    label: '现场',
    badge: '现场版',
    description: '收一点现场呼吸感，把舞台和掌声都带回来。',
    endpoint: '/mv/all',
    getParams(limit) {
      return {
        area: '全部',
        limit,
        offset: 0,
        order: '最热',
        type: '现场版',
      }
    },
  },
  {
    key: 'exclusive',
    label: '网易出品',
    badge: '网易出品',
    description: '平台精选企划和独家内容，更适合慢慢挑着看。',
    endpoint: '/mv/exclusive/rcmd',
    getParams(limit) {
      return {
        limit,
        offset: 0,
      }
    },
  },
]

const MV_COLLECTION_MAP = Object.fromEntries(MV_COLLECTIONS.map((item) => [item.key, item]))

export function getMvCollection(value) {
  const key = String(value ?? '').trim()

  return MV_COLLECTION_MAP[key] ?? MV_COLLECTION_MAP.all
}

export function getMvItemsFromPayload(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.result)) {
    return payload.result
  }

  if (Array.isArray(payload?.mvs)) {
    return payload.mvs
  }

  return []
}

export function getMvCoverUrl(item) {
  return item.cover ?? item.coverUrl ?? item.picUrl ?? item.imgurl16v9 ?? item.imgurl ?? ''
}

export function getMvDuration(item) {
  const duration = Number(item.duration ?? item.durationms ?? item.playTimeLength ?? item.durationMs)

  return Number.isFinite(duration) && duration > 0 ? duration : undefined
}

export function getMvPlayCount(item) {
  const playCount = Number(item.playCount ?? item.playTime ?? item.playCountNum)

  return Number.isFinite(playCount) && playCount > 0 ? playCount : undefined
}

export function getMvResolutionEntries(detail) {
  const brs = detail?.brs

  if (!brs || typeof brs !== 'object') {
    return []
  }

  if (Array.isArray(brs)) {
    return brs
      .map((item) => Number(item?.br))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((left, right) => right - left)
      .map((value) => ({
        label: `${value}p`,
        value,
      }))
  }

  return Object.keys(brs)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => right - left)
    .map((value) => ({
      label: `${value}p`,
      value,
    }))
}

export function getPreferredMvResolution(detail, requestedResolution) {
  const availableResolutions = getMvResolutionEntries(detail)

  if (availableResolutions.length === 0) {
    return requestedResolution
  }

  const numericRequestedResolution = Number(requestedResolution)

  if (availableResolutions.some((item) => item.value === numericRequestedResolution)) {
    return numericRequestedResolution
  }

  return availableResolutions[0]?.value ?? requestedResolution
}

export function getDefaultMvResolution(detail) {
  return getMvResolutionEntries(detail)[0]?.value ?? 1080
}

export async function getMvDetail(id) {
  const payload = await fetchNcm('/mv/detail', {
    mvid: id,
  })

  return payload.data
}

export async function resolveMvSource(id, resolution) {
  const payload = await fetchNcm('/mv/url', {
    id,
    r: resolution,
  })
  const source = payload.data ?? {}

  return {
    expiresIn: source.expi,
    requestedResolution: resolution,
    resolution: Number(source.r ?? resolution) || resolution,
    type: source.type,
    url: source.url ?? '',
  }
}

export async function getMvPlaybackContext(id, requestedResolution) {
  const detail = await getMvDetail(id)

  if (!detail) {
    return null
  }

  const defaultResolution = getDefaultMvResolution(detail)
  const numericRequestedResolution = Number(requestedResolution ?? defaultResolution) || defaultResolution
  const safeResolution = getPreferredMvResolution(detail, numericRequestedResolution)
  const source = await resolveMvSource(id, safeResolution)

  return {
    detail,
    source,
  }
}

export function buildMvStreamUrl(id, resolution) {
  const params = new URLSearchParams({
    id,
    r: String(resolution),
  })

  return `/api/mvs/stream?${params.toString()}`
}

export function normalizeFeaturedMvItem(item, collection) {
  const artistNames = getArtistNames(item.artists ?? item.artistName ?? item.artistNames)
  const title = String(item.name ?? item.title ?? '').trim()
  const id = String(item.id ?? item.vid ?? '').trim()

  return {
    id,
    title,
    artistNames,
    badge: collection.badge,
    coverUrl: getMvCoverUrl(item),
    duration: getMvDuration(item),
    playCount: getMvPlayCount(item),
    subtitle: String(item.copywriter ?? collection.description ?? '').trim(),
  }
}
