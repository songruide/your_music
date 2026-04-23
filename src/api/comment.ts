import { request } from '@/utils/request'

export type CommentTarget = 'song' | 'mv'

export interface CommentUser {
  id: string
  avatarUrl: string
  nickname: string
}

export interface CommentReply {
  content: string
  userNickname: string
}

export interface CommentItem {
  id: string
  content: string
  liked: boolean
  likedCount: number
  location: string
  reply: CommentReply | null
  time: number
  timeLabel: string
  user: CommentUser
}

export interface CommentListResponse {
  comments: CommentItem[]
  hasMore: boolean
  hotComments: CommentItem[]
  id: string
  limit: number
  nextOffset: number
  offset: number
  target: CommentTarget
  total: number
}

export interface CommentQueryOptions {
  limit?: number
  offset?: number
}

export interface SongCommentSeed {
  id: string
  title: string
  artistNames: string[]
  albumName?: string
  coverUrl: string
  duration?: number
}

function buildCommentParams(target: CommentTarget, id: string, options: CommentQueryOptions = {}) {
  return {
    id,
    limit: options.limit,
    offset: options.offset,
    target,
  }
}

export function getSongComments(id: string, options: CommentQueryOptions = {}) {
  return request<CommentListResponse>('/api/comments', {
    params: buildCommentParams('song', id, options),
  })
}

export function getMvComments(id: string, options: CommentQueryOptions = {}) {
  return request<CommentListResponse>('/api/comments', {
    params: buildCommentParams('mv', id, options),
  })
}
