import { request } from '@/utils/request'

export type MvFeaturedCollection = 'all' | 'official' | 'live' | 'exclusive'

// MvPlaybackSeed 是“任意页面里只要想打开 MV 播放器，就至少要给到的最小数据结构”。
// 我们故意把它抽成独立类型，而不是直接复用某个页面自己的接口模型，
// 这样精选页、搜索页、未来的歌手页都能共用同一个播放器弹层。
export interface MvPlaybackSeed {
  id: string
  title: string
  artistNames: string[]
  coverUrl: string
}

export interface MvFeaturedCategory {
  key: MvFeaturedCollection
  label: string
  description: string
}

export interface MvFeaturedCollectionInfo {
  key: MvFeaturedCollection
  label: string
  description: string
}

// 精选页卡片在最小播放字段之外，还会多一些展示字段，
// 比如 badge、播放量、时长、副标题等。
export interface MvFeaturedItem extends MvPlaybackSeed {
  badge: string
  duration?: number
  playCount?: number
  subtitle?: string
}

export interface MvFeaturedResponse {
  categories: MvFeaturedCategory[]
  collection: MvFeaturedCollectionInfo
  items: MvFeaturedItem[]
}

export interface MvResolutionOption {
  label: string
  value: number
}

// MvDetail 是“播放器弹层真正消费的详情结构”。
// 这里已经是后端适配后的前端模型，组件层不用再关心上游 NCM 的字段细节。
export interface MvDetail {
  id: string
  title: string
  coverUrl: string
  artistName: string
  artistNames: string[]
  description: string
  duration?: number
  playCount?: number
  publishTime?: string
  shareCount: number
  commentCount: number
  subscribedCount: number
  availableResolutions: MvResolutionOption[]
  defaultResolution: number
}

// MvPlaybackSource 表示“某一支 MV 在某个清晰度下最终可播放的地址信息”。
// 这里同时保留上游 url 和我们自己的 streamUrl：
// - url 方便调试/排查问题
// - streamUrl 给浏览器 video 标签真正使用，后续可以统一做鉴权、换源和日志
export interface MvPlaybackSource {
  id: string
  url: string
  streamUrl: string
  type?: string
  resolution: number
  requestedResolution: number
  expiresIn?: number
}

// 精选页入口：拿“当前分组 + 卡片列表 + 顶部分类信息”。
// 页面层只关心传 collection 和拿结果，不需要知道后端最终打了哪些 NCM 接口。
export function getFeaturedMvs(collection: MvFeaturedCollection = 'all', limit = 12) {
  return request<MvFeaturedResponse>('/api/mvs/featured', {
    params: {
      collection,
      limit,
    },
  })
}

// 弹层打开后第一步会先拉详情。
// 详情接口负责提供文案、发布时间、播放量以及“可选清晰度列表”。
export function getMvDetail(id: string) {
  return request<MvDetail>('/api/mvs/detail', {
    params: { id },
  })
}

// 拿 MV 播放地址时可以显式带 resolution。
// 如果当前清晰度不可用，后端会自动兜底到最近可用清晰度，并把最终 resolution 回传回来。
export function getMvPlaybackSource(id: string, resolution?: number) {
  return request<MvPlaybackSource>('/api/mvs/source', {
    params: {
      id,
      r: resolution,
    },
  })
}
