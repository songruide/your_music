import type { SearchCategory, SearchMv, SearchPlaylist, SearchSong } from '@/api/search'

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

export interface SearchTypeOption {
  value: SearchCategory
  label: string
}
