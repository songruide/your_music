import type { PlayerTrack } from '@/stores/player'

// 这是“页面层歌曲数据”的最小输入模型。
// 它故意没有直接复用 PlayerTrack，因为页面拿到的原始数据和播放器真正消费的数据
// 往往不是同一种结构：页面里常见的是 artistNames 数组、durationMs 毫秒值，
// 而播放器更适合直接拿到 artist 字符串和格式化后的 duration 文本。
export interface PlayableSongSeed {
  id: string
  title: string
  artistNames: string[]
  coverUrl: string
  durationMs?: number
}

// 把“毫秒时长”格式化成播放器 UI 更容易直接显示的 mm:ss 文本。
// 例如：
// 269000 -> "04:29"
// undefined -> "--:--"
export function formatDurationMs(value?: number) {
  // 没有时长时返回占位符，避免页面出现空白或 NaN。
  if (!value) {
    return '--:--'
  }

  // 先把毫秒转成总秒数，再分别拆成“分钟”和“剩余秒数”。
  const totalSeconds = Math.floor(value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  // padStart(2, '0') 的作用是补齐两位：
  // 4 -> "04"
  // 9 -> "09"
  // 最终统一输出成 "mm:ss" 格式，方便整个项目复用。
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// 把页面/接口层的歌曲对象，统一映射成播放器 store 需要的 PlayerTrack。
// 这是一个很典型的“适配层”函数：外部数据长什么样不重要，
// 只要都先经过这里，播放器内部就永远只处理一种稳定的数据结构。
export function buildPlayerTrack(song: PlayableSongSeed): PlayerTrack {
  return {
    // 直接沿用歌曲唯一标识，后续高亮当前歌曲、切歌、恢复播放状态都要依赖它。
    id: song.id,

    // 播放器展示标题时直接用 title，避免每个页面都自己做字段转换。
    title: song.title,

    // 页面层常常给的是歌手数组，这里统一拼成播放器展示用的字符串。
    // 如果数组为空，就给一个兜底文案，避免出现空字符串。
    artist: song.artistNames.join(' / ') || '未知歌手',

    // 封面图直接透传给播放器，用于底部播放条和后续可能的播放详情页。
    coverUrl: song.coverUrl,

    // duration 是给 UI 直接显示的文本，比如 "04:29"。
    // 这样播放器组件不用重复处理“毫秒转时间”的逻辑。
    duration: formatDurationMs(song.durationMs),

    // durationMs 仍然保留原始毫秒值，因为进度条、播放位置计算等逻辑
    // 依然更适合基于数字来处理。
    durationMs: song.durationMs,
  }
}
