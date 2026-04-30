import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const SETTINGS_STORAGE_KEY = 'your-music:settings:v1'
const SETTINGS_STORAGE_VERSION = 1

export const PLAY_COMPLETION_ACTIONS = ['停止播放', '播放相似', '列表循环'] as const
export const QUALITY_OPTIONS = ['智能推荐', '无损优先', '标准'] as const
export const THEME_OPTIONS = ['跟随系统', '浅色', '深色', '夜航极光'] as const
export const FONT_SIZE_OPTIONS = ['A-', '标准', 'A+'] as const
export const PRESET_OPTIONS = ['深夜', '通勤', '专注', '流行', '摇滚'] as const
export const DOWNLOAD_TASK_OPTIONS = ['1', '3', '5'] as const
export const NAME_FORMAT_OPTIONS = ['歌手 - 歌曲名', '歌曲名 - 歌手', '专辑/歌曲名'] as const

export type PlayCompletionAction = (typeof PLAY_COMPLETION_ACTIONS)[number]
export type QualityOption = (typeof QUALITY_OPTIONS)[number]
export type ThemeOption = (typeof THEME_OPTIONS)[number]
export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number]
export type PresetOption = (typeof PRESET_OPTIONS)[number]
export type DownloadTaskOption = (typeof DOWNLOAD_TASK_OPTIONS)[number]
export type NameFormatOption = (typeof NAME_FORMAT_OPTIONS)[number]

export type BooleanSettingKey =
  | 'volumeNormalization'
  | 'autoSimilarSongs'
  | 'downloadLyrics'
  | 'dynamicBackground'
  | 'aiSmartRecommend'
  | 'aiPlaylistGeneration'
  | 'aiSongInsight'
  | 'rememberListeningPreference'
  | 'syncPlaybackProgress'
  | 'personalizedRecommendation'

type SettingsSnapshot = {
  blurStrength: number
  cacheUsedGb: number
  completionAction: PlayCompletionAction
  downloadDir: string
  downloadTaskCount: DownloadTaskOption
  fadeSeconds: number
  fontSize: FontSizeOption
  nameFormat: NameFormatOption
  preset: PresetOption
  quality: QualityOption
  theme: ThemeOption
  toggles: Record<BooleanSettingKey, boolean>
  tuningStrength: number
}

type SettingsStoragePayload = SettingsSnapshot & {
  updatedAt: number
  version: number
}

const DEFAULT_TOGGLES: Record<BooleanSettingKey, boolean> = {
  volumeNormalization: true,
  autoSimilarSongs: true,
  downloadLyrics: true,
  dynamicBackground: true,
  aiSmartRecommend: true,
  aiPlaylistGeneration: true,
  aiSongInsight: false,
  rememberListeningPreference: true,
  syncPlaybackProgress: true,
  personalizedRecommendation: true,
}

const DEFAULT_SETTINGS: SettingsSnapshot = {
  blurStrength: 60,
  cacheUsedGb: 2.35,
  completionAction: '停止播放',
  downloadDir: 'D:\\YourMusic\\Downloads',
  downloadTaskCount: '3',
  fadeSeconds: 4,
  fontSize: '标准',
  nameFormat: '歌手 - 歌曲名',
  preset: '深夜',
  quality: '无损优先',
  theme: '夜航极光',
  toggles: { ...DEFAULT_TOGGLES },
  tuningStrength: 68,
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(Math.max(numericValue, min), max)
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)

    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return false
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function pickOption<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && options.includes(value) ? value : fallback
}

function normalizeToggles(value: unknown) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Partial<Record<BooleanSettingKey, unknown>>)
    : {}

  return Object.fromEntries(
    Object.entries(DEFAULT_TOGGLES).map(([key, fallback]) => [
      key,
      typeof source[key as BooleanSettingKey] === 'boolean' ? source[key as BooleanSettingKey] : fallback,
    ]),
  ) as Record<BooleanSettingKey, boolean>
}

function normalizeSnapshot(value: unknown): SettingsSnapshot {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Partial<SettingsSnapshot>)
    : {}

  return {
    blurStrength: clamp(source.blurStrength, 20, 100, DEFAULT_SETTINGS.blurStrength),
    cacheUsedGb: clamp(source.cacheUsedGb, 0, 10, DEFAULT_SETTINGS.cacheUsedGb),
    completionAction: pickOption(source.completionAction, PLAY_COMPLETION_ACTIONS, DEFAULT_SETTINGS.completionAction),
    downloadDir: typeof source.downloadDir === 'string' && source.downloadDir.trim()
      ? source.downloadDir.trim()
      : DEFAULT_SETTINGS.downloadDir,
    downloadTaskCount: pickOption(source.downloadTaskCount, DOWNLOAD_TASK_OPTIONS, DEFAULT_SETTINGS.downloadTaskCount),
    fadeSeconds: clamp(source.fadeSeconds, 0, 8, DEFAULT_SETTINGS.fadeSeconds),
    fontSize: pickOption(source.fontSize, FONT_SIZE_OPTIONS, DEFAULT_SETTINGS.fontSize),
    nameFormat: pickOption(source.nameFormat, NAME_FORMAT_OPTIONS, DEFAULT_SETTINGS.nameFormat),
    preset: pickOption(source.preset, PRESET_OPTIONS, DEFAULT_SETTINGS.preset),
    quality: pickOption(source.quality, QUALITY_OPTIONS, DEFAULT_SETTINGS.quality),
    theme: pickOption(source.theme, THEME_OPTIONS, DEFAULT_SETTINGS.theme),
    toggles: normalizeToggles(source.toggles),
    tuningStrength: clamp(source.tuningStrength, 0, 100, DEFAULT_SETTINGS.tuningStrength),
  }
}

function getInitialSettings() {
  return normalizeSnapshot(readJson<unknown>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS))
}

function resolveFontScale(fontSize: FontSizeOption) {
  if (fontSize === 'A-') {
    return '0.94'
  }

  if (fontSize === 'A+') {
    return '1.07'
  }

  return '1'
}

export const useSettingsStore = defineStore('settings', () => {
  const initialSettings = getInitialSettings()

  const blurStrength = ref(initialSettings.blurStrength)
  const cacheUsedGb = ref(initialSettings.cacheUsedGb)
  const completionAction = ref<PlayCompletionAction>(initialSettings.completionAction)
  const downloadDir = ref(initialSettings.downloadDir)
  const downloadTaskCount = ref<DownloadTaskOption>(initialSettings.downloadTaskCount)
  const fadeSeconds = ref(initialSettings.fadeSeconds)
  const fontSize = ref<FontSizeOption>(initialSettings.fontSize)
  const nameFormat = ref<NameFormatOption>(initialSettings.nameFormat)
  const preset = ref<PresetOption>(initialSettings.preset)
  const quality = ref<QualityOption>(initialSettings.quality)
  const theme = ref<ThemeOption>(initialSettings.theme)
  const toggles = ref<Record<BooleanSettingKey, boolean>>({ ...initialSettings.toggles })
  const tuningStrength = ref(initialSettings.tuningStrength)

  const cachePercent = computed(() => Math.min(Math.round((cacheUsedGb.value / 10) * 100), 100))
  const snapshot = computed<SettingsSnapshot>(() => ({
    blurStrength: blurStrength.value,
    cacheUsedGb: cacheUsedGb.value,
    completionAction: completionAction.value,
    downloadDir: downloadDir.value,
    downloadTaskCount: downloadTaskCount.value,
    fadeSeconds: fadeSeconds.value,
    fontSize: fontSize.value,
    nameFormat: nameFormat.value,
    preset: preset.value,
    quality: quality.value,
    theme: theme.value,
    toggles: toggles.value,
    tuningStrength: tuningStrength.value,
  }))

  function persistSettings() {
    writeJson<SettingsStoragePayload>(SETTINGS_STORAGE_KEY, {
      ...snapshot.value,
      updatedAt: Date.now(),
      version: SETTINGS_STORAGE_VERSION,
    })
  }

  function applyAppearancePreferences() {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement

    root.dataset.musicTheme = theme.value
    root.dataset.musicDynamicBackground = toggles.value.dynamicBackground ? 'on' : 'off'
    root.style.setProperty('--app-glass-alpha', String(blurStrength.value / 100))
    root.style.setProperty('--app-glass-blur', `${Math.round(10 + blurStrength.value * 0.24)}px`)
    root.style.setProperty('--app-font-scale', resolveFontScale(fontSize.value))
  }

  function setCompletionAction(nextValue: PlayCompletionAction) {
    completionAction.value = nextValue
  }

  function setDownloadTaskCount(nextValue: DownloadTaskOption) {
    downloadTaskCount.value = nextValue
  }

  function setDownloadDir(nextValue: string) {
    const safeValue = nextValue.trim()

    if (!safeValue) {
      return
    }

    downloadDir.value = safeValue
  }

  function setFadeSeconds(nextValue: number) {
    fadeSeconds.value = clamp(nextValue, 0, 8, DEFAULT_SETTINGS.fadeSeconds)
  }

  function setFontSize(nextValue: FontSizeOption) {
    fontSize.value = nextValue
  }

  function setNameFormat(nextValue: NameFormatOption) {
    nameFormat.value = nextValue
  }

  function setPreset(nextValue: PresetOption) {
    preset.value = nextValue
  }

  function setQuality(nextValue: QualityOption) {
    quality.value = nextValue
  }

  function setTheme(nextValue: ThemeOption) {
    theme.value = nextValue
  }

  function setTuningStrength(nextValue: number) {
    tuningStrength.value = clamp(nextValue, 0, 100, DEFAULT_SETTINGS.tuningStrength)
  }

  function toggleSetting(key: BooleanSettingKey) {
    toggles.value = {
      ...toggles.value,
      [key]: !toggles.value[key],
    }
  }

  function clearCache() {
    cacheUsedGb.value = 0
  }

  function resetTuning() {
    preset.value = DEFAULT_SETTINGS.preset
    tuningStrength.value = DEFAULT_SETTINGS.tuningStrength
  }

  function resetAllSettings() {
    blurStrength.value = DEFAULT_SETTINGS.blurStrength
    completionAction.value = DEFAULT_SETTINGS.completionAction
    downloadDir.value = DEFAULT_SETTINGS.downloadDir
    downloadTaskCount.value = DEFAULT_SETTINGS.downloadTaskCount
    fadeSeconds.value = DEFAULT_SETTINGS.fadeSeconds
    fontSize.value = DEFAULT_SETTINGS.fontSize
    nameFormat.value = DEFAULT_SETTINGS.nameFormat
    preset.value = DEFAULT_SETTINGS.preset
    quality.value = DEFAULT_SETTINGS.quality
    theme.value = DEFAULT_SETTINGS.theme
    toggles.value = { ...DEFAULT_TOGGLES }
    tuningStrength.value = DEFAULT_SETTINGS.tuningStrength
  }

  watch(snapshot, persistSettings, { deep: true })
  watch([theme, fontSize, blurStrength, toggles], applyAppearancePreferences, { deep: true, immediate: true })

  return {
    blurStrength,
    cachePercent,
    cacheUsedGb,
    clearCache,
    completionAction,
    downloadDir,
    downloadTaskCount,
    fadeSeconds,
    fontSize,
    nameFormat,
    preset,
    quality,
    resetAllSettings,
    resetTuning,
    setCompletionAction,
    setDownloadDir,
    setDownloadTaskCount,
    setFadeSeconds,
    setFontSize,
    setNameFormat,
    setPreset,
    setQuality,
    setTheme,
    setTuningStrength,
    theme,
    toggles,
    toggleSetting,
    tuningStrength,
  }
})
