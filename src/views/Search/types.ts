import type { SearchCategory, SearchMv, SearchPlaylist, SearchSong } from '@/api/search'

// SearchResultState 统一描述搜索页当前正在展示的结果集。
// 页面层只需要关心 “当前类型 + 总数 + 当前页数据”，不用分别处理三套状态变量。
export type SearchResultState =
  | {
      type: 'song'
      keyword: string
      total: number
      items: SearchSong[]
    }
  | {
      type: 'playlist'
      keyword: string
      total: number
      items: SearchPlaylist[]
    }
  | {
      type: 'mv'
      keyword: string
      total: number
      items: SearchMv[]
    }

// 顶部切换 tab 的最小展示模型。
export interface SearchTypeOption {
  value: SearchCategory
  label: string
}
