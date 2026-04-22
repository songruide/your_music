import express from 'express'
import { VIDEO_RESPONSE_HEADERS } from '../config.js'
import { pipeUpstreamStream } from '../services/media.js'
import {
  buildMvStreamUrl,
  getDefaultMvResolution,
  getMvCollection,
  getMvCoverUrl,
  getMvDetail,
  getMvDuration,
  getMvItemsFromPayload,
  getMvPlayCount,
  getMvPlaybackContext,
  getMvResolutionEntries,
  MV_COLLECTIONS,
  normalizeFeaturedMvItem,
} from '../services/mv.js'
import { fetchNcm } from '../services/ncm.js'
import { getArtistNames } from '../services/shared.js'
import {
  createRouteHandler,
  getRequiredQueryString,
  HttpError,
  sendOk,
} from '../utils/http.js'
import { getLimit } from '../utils/params.js'

const router = express.Router()

router.get('/api/mvs/featured', createRouteHandler(async (req, res) => {
  const collection = getMvCollection(req.query.collection)
  const limit = Math.min(getLimit(req.query.limit, 12), 24)
  const payload = await fetchNcm(collection.endpoint, collection.getParams(limit))
  const items = getMvItemsFromPayload(payload)
    .map((item) => normalizeFeaturedMvItem(item, collection))
    .filter((item) => item.id && item.title)
    .slice(0, limit)

  sendOk(res, {
    categories: MV_COLLECTIONS.map(({ key, label, description }) => ({
      key,
      label,
      description,
    })),
    collection: {
      key: collection.key,
      label: collection.label,
      description: collection.description,
    },
    items,
  })
}))

router.get('/api/mvs/detail', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'mv id is required')
  const detail = await getMvDetail(id)

  if (!detail) {
    throw new HttpError(404, 'mv not found')
  }

  sendOk(res, {
    id: String(detail.id ?? id),
    title: detail.name ?? '',
    coverUrl: getMvCoverUrl(detail),
    artistName: detail.artistName ?? (getArtistNames(detail.artists).join(' / ') || '未知歌手'),
    artistNames: getArtistNames(detail.artists ?? detail.artistName),
    description: detail.desc ?? '',
    duration: getMvDuration(detail),
    playCount: getMvPlayCount(detail),
    publishTime: detail.publishTime ?? '',
    shareCount: Number(detail.shareCount ?? 0),
    commentCount: Number(detail.commentCount ?? 0),
    subscribedCount: Number(detail.subCount ?? detail.subscribedCount ?? 0),
    availableResolutions: getMvResolutionEntries(detail),
    defaultResolution: getDefaultMvResolution(detail),
  })
}))

router.get('/api/mvs/source', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'mv id is required')
  const playbackContext = await getMvPlaybackContext(id, req.query.r)

  if (!playbackContext) {
    throw new HttpError(404, 'mv not found')
  }

  const { source } = playbackContext

  if (!source.url) {
    throw new HttpError(404, '当前 MV 暂无可用视频地址')
  }

  sendOk(res, {
    expiresIn: source.expiresIn,
    id,
    requestedResolution: source.requestedResolution,
    resolution: source.resolution,
    streamUrl: buildMvStreamUrl(id, source.resolution),
    type: source.type,
    url: source.url,
  })
}))

router.get('/api/mvs/stream', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'mv id is required')
  const playbackContext = await getMvPlaybackContext(id, req.query.r)

  if (!playbackContext) {
    throw new HttpError(404, 'mv not found')
  }

  const { source } = playbackContext

  if (!source.url) {
    throw new HttpError(404, '当前 MV 暂无可用视频地址')
  }

  await pipeUpstreamStream(req, res, {
    url: source.url,
    responseHeaders: VIDEO_RESPONSE_HEADERS,
    fallbackContentType: 'video/mp4',
    requestFailedMessage: 'Video stream request failed',
  })
}))

export default router
