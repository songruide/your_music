import type { QualityOption } from '@/stores/settings'

const QUALITY_LEVEL_MAP: Record<QualityOption, string> = {
  智能推荐: 'exhigh',
  无损优先: 'lossless',
  标准: 'standard',
}

export function getSongLevelForQuality(quality: QualityOption) {
  return QUALITY_LEVEL_MAP[quality] ?? 'standard'
}
