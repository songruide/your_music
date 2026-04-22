export type HistorySection = 'song' | 'playlist' | 'video' | 'radio' | 'mv'
export type SortMode = 'recent' | 'plays' | 'duration'

export const HISTORY_SECTION_CONFIG: Array<{ key: HistorySection; label: string }> = [
  { key: 'song', label: '单曲' },
  { key: 'playlist', label: '歌单' },
  { key: 'video', label: '视频' },
  { key: 'radio', label: '音乐频道' },
  { key: 'mv', label: 'MV频道' },
]

export const SORT_MODE_SEQUENCE: SortMode[] = ['recent', 'plays', 'duration']

export const SORT_MODE_LABELS: Record<SortMode, string> = {
  recent: '最近播放',
  plays: '播放次数',
  duration: '时长',
}
