import express from 'express'
import { fetchNcm } from '../services/ncm.js'
import { createRouteHandler, getRequiredQueryString, HttpError, sendOk } from '../utils/http.js'
import { getLimit, getOffset } from '../utils/params.js'

const router = express.Router()

const COMMENT_TARGETS = {
  mv: '/comment/mv',
  playlist: '/comment/playlist',
  song: '/comment/music',
}

function normalizeCommentItem(comment) {
  const reply = Array.isArray(comment?.beReplied) ? comment.beReplied[0] : null

  return {
    content: comment?.content ?? comment?.richContent ?? '',
    id: String(comment?.commentId ?? ''),
    liked: Boolean(comment?.liked),
    likedCount: Number(comment?.likedCount ?? 0),
    location: comment?.ipLocation?.location ?? '',
    reply: reply
      ? {
          content: reply.content ?? reply.richContent ?? '',
          userNickname: reply.user?.nickname ?? '匿名用户',
        }
      : null,
    time: Number(comment?.time ?? 0),
    timeLabel: comment?.timeStr ?? '',
    user: {
      avatarUrl: comment?.user?.avatarUrl ?? '',
      id: String(comment?.user?.userId ?? ''),
      nickname: comment?.user?.nickname ?? '匿名用户',
    },
  }
}

router.get('/api/comments', createRouteHandler(async (req, res) => {
  const id = getRequiredQueryString(req, 'id', 'comment resource id is required')
  const target = String(req.query.target ?? '').trim()
  const endpoint = COMMENT_TARGETS[target]

  if (!endpoint) {
    throw new HttpError(400, 'unsupported comment target')
  }

  const limit = Math.min(getLimit(req.query.limit, 12), 30)
  const offset = getOffset(req.query.offset)
  const payload = await fetchNcm(endpoint, {
    id,
    limit,
    offset,
  })

  const hotComments =
    offset === 0
      ? (Array.isArray(payload.hotComments) ? payload.hotComments : []).slice(0, 4).map(normalizeCommentItem)
      : []
  const hotCommentIds = new Set(hotComments.map((comment) => comment.id))
  const rawComments = Array.isArray(payload.comments) ? payload.comments : []
  const comments = rawComments
    .map(normalizeCommentItem)
    .filter((comment) => !hotCommentIds.has(comment.id))

  sendOk(res, {
    comments,
    hasMore: Boolean(payload.more),
    hotComments,
    id,
    limit,
    nextOffset: offset + rawComments.length,
    offset,
    target,
    total: Number(payload.total ?? 0),
  })
}))

export default router
