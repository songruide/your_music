import type { RecentPlayerTrack } from '@/stores/player'
import { formatTime } from '@/stores/player/utils'

export function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

export function formatLastPlayedAt(timestamp: number) {
  const diff = Date.now() - timestamp

  if (diff < 60_000) {
    return '刚刚播放'
  }

  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} 分钟前`
  }

  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)} 小时前`
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return '最近播放'
  }

  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function formatPlayCount(count: number) {
  return `听过${count}次`
}

export function getResumeLabel(track: RecentPlayerTrack) {
  if (track.lastTimeSeconds <= 0) {
    return '从头开始'
  }

  return `上次停在 ${formatTime(track.lastTimeSeconds)}`
}

export function getProgressPercent(track: RecentPlayerTrack) {
  const totalSeconds = track.durationMs ? track.durationMs / 1000 : 0

  if (totalSeconds <= 0) {
    return 0
  }

  return Math.min((track.lastTimeSeconds / totalSeconds) * 100, 100)
}
