<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  BrainCircuit,
  Check,
  Database,
  Download,
  FolderOpen,
  Headphones,
  LogIn,
  LogOut,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Volume2,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useMusicLibraryStore } from '@/stores/musicLibrary'
import { usePlayerStore } from '@/stores/player'
import {
  DOWNLOAD_TASK_OPTIONS,
  FONT_SIZE_OPTIONS,
  NAME_FORMAT_OPTIONS,
  PLAY_COMPLETION_ACTIONS,
  PRESET_OPTIONS,
  QUALITY_OPTIONS,
  THEME_OPTIONS,
  type BooleanSettingKey,
} from '@/stores/settings'
import { useSettingsStore } from '@/stores/settings'

type ToggleSettingConfig = {
  key: BooleanSettingKey
  title: string
  description: string
}

type EqualizerBand = {
  label: string
  value: number
}

const authStore = useAuthStore()
const libraryStore = useMusicLibraryStore()
const playerStore = usePlayerStore()
const settingsStore = useSettingsStore()
const { avatarFallback, avatarUrl, displayName, isSessionLoading, loggedIn } = storeToRefs(authStore)
const { downloadedCollection, favoriteCollection } = storeToRefs(libraryStore)
const {
  blurStrength,
  cachePercent,
  cacheUsedGb,
  completionAction,
  downloadDir,
  downloadTaskCount,
  fadeSeconds,
  fontSize,
  nameFormat,
  preset,
  quality,
  theme,
  toggles,
  tuningStrength,
} = storeToRefs(settingsStore)

const qualityOptions = QUALITY_OPTIONS
const completionActions = PLAY_COMPLETION_ACTIONS
const themeOptions = THEME_OPTIONS
const fontSizeOptions = FONT_SIZE_OPTIONS
const presetOptions = PRESET_OPTIONS
const downloadTaskOptions = DOWNLOAD_TASK_OPTIONS
const nameFormatOptions = NAME_FORMAT_OPTIONS

const playbackSettings: ToggleSettingConfig[] = [
  {
    key: 'volumeNormalization',
    title: '音量均衡',
    description: '不同歌曲响度自动拉平',
  },
  {
    key: 'autoSimilarSongs',
    title: '自动播放相似歌曲',
    description: '队列结束后延续当前氛围',
  },
]

const downloadSettings: ToggleSettingConfig[] = [
  {
    key: 'downloadLyrics',
    title: '下载歌词',
    description: '保存歌曲时同步缓存歌词',
  },
]

const appearanceSettings: ToggleSettingConfig[] = [
  {
    key: 'dynamicBackground',
    title: '动态背景',
    description: '保留极光光束与柔和流动',
  },
]

const aiSettings: ToggleSettingConfig[] = [
  {
    key: 'aiSmartRecommend',
    title: '智能推荐',
    description: '基于你的听歌习惯推荐',
  },
  {
    key: 'aiPlaylistGeneration',
    title: 'AI 歌单生成',
    description: '根据心情与场景生成歌单',
  },
  {
    key: 'aiSongInsight',
    title: 'AI 歌曲解读',
    description: '生成歌曲背景与歌词解读',
  },
]

const privacySettings: ToggleSettingConfig[] = [
  {
    key: 'rememberListeningPreference',
    title: '记住听歌偏好',
    description: '同步你的播放记录与偏好设置',
  },
  {
    key: 'syncPlaybackProgress',
    title: '同步播放进度',
    description: '在不同设备间同步播放进度',
  },
  {
    key: 'personalizedRecommendation',
    title: '个性化推荐',
    description: '基于收听行为优化推荐内容',
  },
]

const equalizerBands: EqualizerBand[] = [
  { label: '32', value: 42 },
  { label: '64', value: 78 },
  { label: '125', value: 58 },
  { label: '250', value: 54 },
  { label: '500', value: 64 },
  { label: '1K', value: 56 },
  { label: '2K', value: 60 },
  { label: '4K', value: 34 },
  { label: '8K', value: 50 },
  { label: '16K', value: 38 },
]

const accountTitle = computed(() => (loggedIn.value ? '网易云账号已连接' : '连接网易云账号'))
const accountMeta = computed(() => (loggedIn.value ? `${displayName.value} · LV.10` : '扫码登录后同步收藏和偏好'))
const syncStatus = computed(() => (loggedIn.value ? '同步完成 · 1 分钟前' : '等待登录'))
const librarySummary = computed(() => [
  { label: '收藏', value: favoriteCollection.value.length },
  { label: '本地', value: downloadedCollection.value.length },
  { label: '缓存', value: `${cacheUsedGb.value.toFixed(2)} GB` },
])
const presetDescription = computed(() => {
  if (preset.value === '深夜') {
    return '降低低频轰头，提升人声清晰度，适合安静的夜晚。'
  }

  if (preset.value === '通勤') {
    return '增强节奏和中频穿透，适合路上听歌。'
  }

  if (preset.value === '专注') {
    return '压低刺激频段，让背景音乐更稳。'
  }

  return '强化情绪和动态，让歌曲更有现场感。'
})

watch(
  completionAction,
  (nextAction) => {
    if (nextAction === '列表循环' && playerStore.playMode !== 'list-loop') {
      playerStore.setPlayMode('list-loop')
      return
    }

    if (nextAction === '停止播放' && playerStore.playMode !== 'sequential') {
      playerStore.setPlayMode('sequential')
    }
  },
  { immediate: true },
)

function handleAccountAction() {
  if (loggedIn.value) {
    void authStore.initialize(true)
    return
  }

  authStore.openLoginDialog('qr')
}

function handleChangeDownloadDir() {
  if (typeof window === 'undefined') {
    return
  }

  const nextDir = window.prompt('设置下载目录', downloadDir.value)

  if (nextDir === null) {
    return
  }

  settingsStore.setDownloadDir(nextDir)
}

function handleLogout() {
  void authStore.logout()
}
</script>

<template>
  <section class="settings-page">
    <header class="settings-heading">
      <div>
        <h1>设置</h1>
        <p>让 YourMusic 更懂你的听感</p>
      </div>

      <div class="settings-heading__chips" aria-label="设置概览">
        <span v-for="item in librarySummary" :key="item.label">
          {{ item.label }} <strong>{{ item.value }}</strong>
        </span>
      </div>
    </header>

    <section class="account-strip" aria-label="账号状态">
      <div class="account-strip__avatar">
        <img v-if="avatarUrl" :src="avatarUrl" :alt="`${displayName} 头像`" />
        <span v-else>{{ avatarFallback }}</span>
      </div>

      <div class="account-strip__content">
        <h2>{{ accountTitle }}</h2>
        <p>{{ accountMeta }}</p>
        <span class="sync-pill">
          <Check :stroke-width="2.2" />
          {{ syncStatus }}
        </span>
      </div>

      <div class="account-strip__actions">
        <button class="settings-button settings-button--primary" type="button" @click="handleAccountAction">
          <LogIn v-if="!loggedIn" class="settings-button__icon" :stroke-width="1.9" />
          <UserRound v-else class="settings-button__icon" :stroke-width="1.9" />
          <span>{{ loggedIn ? '管理账号' : '扫码登录' }}</span>
        </button>

        <button
          v-if="loggedIn"
          class="settings-button settings-button--ghost"
          type="button"
          :disabled="isSessionLoading"
          @click="handleLogout"
        >
          <LogOut class="settings-button__icon" :stroke-width="1.9" />
          <span>{{ isSessionLoading ? '退出中...' : '退出' }}</span>
        </button>
      </div>

      <span class="account-strip__arrow" aria-hidden="true">›</span>
    </section>

    <div class="settings-dashboard">
      <section class="settings-card settings-card--playback">
        <header class="card-heading">
          <span class="card-heading__icon card-heading__icon--pink">
            <Headphones :stroke-width="1.9" />
          </span>
          <h2>播放体验</h2>
        </header>

        <div class="setting-line setting-line--range">
          <div class="setting-line__copy">
            <strong>淡入淡出</strong>
            <small>切歌时保留一点空气感</small>
          </div>
          <span class="setting-line__value">{{ fadeSeconds }}s</span>
          <input
            v-model.number="fadeSeconds"
            class="settings-range"
            :style="{ '--settings-progress': `${(fadeSeconds / 8) * 100}%` }"
            type="range"
            min="0"
            max="8"
            step="1"
            aria-label="淡入淡出秒数"
          />
        </div>

        <button
          v-for="setting in playbackSettings"
          :key="setting.title"
          class="setting-line"
          type="button"
          @click="settingsStore.toggleSetting(setting.key)"
        >
          <span class="setting-line__copy">
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.description }}</small>
          </span>
          <span class="settings-switch" :class="{ 'is-on': toggles[setting.key] }" aria-hidden="true"></span>
        </button>

        <div class="setting-line setting-line--stacked">
          <div class="setting-line__copy">
            <strong>播放完成后操作</strong>
          </div>
          <div class="settings-segment">
            <button
              v-for="option in completionActions"
              :key="option"
              type="button"
              :class="{ 'is-active': completionAction === option }"
              @click="settingsStore.setCompletionAction(option)"
            >
              {{ option }}
            </button>
          </div>
        </div>
      </section>

      <section class="settings-card settings-card--quality">
        <header class="card-heading">
          <span class="card-heading__icon card-heading__icon--blue">
            <Download :stroke-width="1.9" />
          </span>
          <h2>音质与下载</h2>
        </header>

        <div class="setting-line setting-line--stacked">
          <div class="setting-line__copy">
            <strong>音质优先</strong>
          </div>
          <div class="settings-segment">
            <button
              v-for="option in qualityOptions"
              :key="option"
              type="button"
              :class="{ 'is-active': quality === option }"
              @click="settingsStore.setQuality(option)"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <div class="setting-line">
          <span class="setting-line__copy setting-line__copy--inline">
            <strong>下载目录</strong>
            <small>{{ downloadDir }}</small>
          </span>
          <button class="mini-button" type="button" @click="handleChangeDownloadDir">
            <FolderOpen :stroke-width="1.8" />
            更改
          </button>
        </div>

        <div class="setting-line">
          <span class="setting-line__copy">
            <strong>同时下载任务数</strong>
          </span>
          <select v-model="downloadTaskCount" class="select-pill" aria-label="同时下载任务数">
            <option v-for="option in downloadTaskOptions" :key="option">{{ option }}</option>
          </select>
        </div>

        <div class="setting-line">
          <span class="setting-line__copy">
            <strong>歌曲命名格式</strong>
          </span>
          <select v-model="nameFormat" class="select-pill" aria-label="歌曲命名格式">
            <option v-for="option in nameFormatOptions" :key="option">{{ option }}</option>
          </select>
        </div>

        <button
          v-for="setting in downloadSettings"
          :key="setting.title"
          class="setting-line"
          type="button"
          @click="settingsStore.toggleSetting(setting.key)"
        >
          <span class="setting-line__copy">
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.description }}</small>
          </span>
          <span class="settings-switch" :class="{ 'is-on': toggles[setting.key] }" aria-hidden="true"></span>
        </button>
      </section>

      <section class="settings-card settings-card--tuner">
        <header class="card-heading card-heading--split">
          <span class="card-heading__title">
            <span class="card-heading__icon card-heading__icon--pink">
              <SlidersHorizontal :stroke-width="1.9" />
            </span>
            <h2>快速调音</h2>
          </span>
          <button class="mini-button mini-button--soft" type="button" @click="settingsStore.resetTuning">重置</button>
        </header>

        <div class="equalizer" aria-hidden="true">
          <div v-for="band in equalizerBands" :key="band.label" class="equalizer__band">
            <span :style="{ height: `${band.value}%` }"></span>
            <small>{{ band.label }}</small>
          </div>
        </div>

        <div class="preset-row">
          <button
            v-for="presetOption in presetOptions"
            :key="presetOption"
            type="button"
            :class="{ 'is-active': preset === presetOption }"
            @click="settingsStore.setPreset(presetOption)"
          >
            {{ presetOption }}
          </button>
        </div>

        <div class="preset-note">
          <Volume2 :stroke-width="1.8" />
          <div>
            <strong>{{ preset }}</strong>
            <span>{{ presetDescription }}</span>
          </div>
        </div>

        <div class="setting-line setting-line--range">
          <div class="setting-line__copy">
            <strong>均衡强度</strong>
            <small>当前 {{ tuningStrength }}%</small>
          </div>
          <input
            v-model.number="tuningStrength"
            class="settings-range"
            :style="{ '--settings-progress': `${tuningStrength}%` }"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="均衡强度"
          />
        </div>
      </section>
    </div>

    <div class="settings-lower-grid">
      <section class="settings-card">
        <header class="card-heading">
          <span class="card-heading__icon card-heading__icon--pink">
            <Palette :stroke-width="1.9" />
          </span>
          <h2>外观</h2>
        </header>

        <div class="setting-line setting-line--stacked">
          <div class="setting-line__copy">
            <strong>主题模式</strong>
          </div>
          <div class="settings-segment">
            <button
            v-for="option in themeOptions"
            :key="option"
            type="button"
              :class="{ 'is-active': theme === option }"
              @click="settingsStore.setTheme(option)"
            >
              {{ option }}
            </button>
          </div>
        </div>

        <button
          v-for="setting in appearanceSettings"
          :key="setting.title"
          class="setting-line"
          type="button"
          @click="settingsStore.toggleSetting(setting.key)"
        >
          <span class="setting-line__copy">
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.description }}</small>
          </span>
          <span class="settings-switch" :class="{ 'is-on': toggles[setting.key] }" aria-hidden="true"></span>
        </button>

        <div class="setting-line setting-line--range">
          <div class="setting-line__copy">
            <strong>界面模糊强度</strong>
            <small>{{ blurStrength }}%</small>
          </div>
          <input
            v-model.number="blurStrength"
            class="settings-range"
            :style="{ '--settings-progress': `${blurStrength}%` }"
            type="range"
            min="20"
            max="100"
            step="1"
            aria-label="界面模糊强度"
          />
        </div>

        <div class="setting-line setting-line--stacked">
          <div class="setting-line__copy">
            <strong>字体大小</strong>
          </div>
          <div class="settings-segment">
            <button
            v-for="option in fontSizeOptions"
            :key="option"
            type="button"
              :class="{ 'is-active': fontSize === option }"
              @click="settingsStore.setFontSize(option)"
            >
              {{ option }}
            </button>
          </div>
        </div>
      </section>

      <section class="settings-card">
        <header class="card-heading">
          <span class="card-heading__icon card-heading__icon--blue">
            <Database :stroke-width="1.9" />
          </span>
          <h2>缓存空间</h2>
        </header>

        <div class="cache-panel">
          <div class="cache-panel__head">
            <span>缓存占用</span>
            <strong>{{ cacheUsedGb.toFixed(2) }} GB</strong>
          </div>
          <div class="cache-panel__track">
            <span :style="{ width: `${cachePercent}%` }"></span>
          </div>
          <small>已用 {{ cacheUsedGb.toFixed(2) }} GB / 共 10 GB</small>
        </div>

        <button class="setting-line setting-line--action" type="button" @click="settingsStore.clearCache">
          <span class="setting-line__copy">
            <strong>缓存设置</strong>
            <small>自动清理 30 天前的缓存文件</small>
          </span>
          <span class="line-arrow">›</span>
        </button>

        <div class="setting-line">
          <span class="setting-line__copy">
            <strong>最大缓存大小</strong>
          </span>
          <span class="select-pill select-pill--static">10 GB</span>
        </div>

        <button class="settings-button settings-button--danger" type="button" @click="settingsStore.clearCache">
          <Trash2 class="settings-button__icon" :stroke-width="1.9" />
          清理缓存
        </button>
      </section>

      <section class="settings-card">
        <header class="card-heading">
          <span class="card-heading__icon card-heading__icon--violet">
            <BrainCircuit :stroke-width="1.9" />
          </span>
          <h2>AI 助手</h2>
          <span class="beta-pill">Beta</span>
        </header>

        <button
          v-for="setting in aiSettings"
          :key="setting.title"
          class="setting-line"
          type="button"
          @click="settingsStore.toggleSetting(setting.key)"
        >
          <span class="setting-line__copy">
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.description }}</small>
          </span>
          <span class="settings-switch" :class="{ 'is-on': toggles[setting.key] }" aria-hidden="true"></span>
        </button>

        <div class="hint-pill">
          <Sparkles :stroke-width="1.8" />
          <span>和现有 AI 面板联动后，这里会成为推荐策略中心。</span>
        </div>
      </section>

      <section class="settings-card">
        <header class="card-heading">
          <span class="card-heading__icon card-heading__icon--cyan">
            <ShieldCheck :stroke-width="1.9" />
          </span>
          <h2>隐私与同步</h2>
        </header>

        <button
          v-for="setting in privacySettings"
          :key="setting.title"
          class="setting-line"
          type="button"
          @click="settingsStore.toggleSetting(setting.key)"
        >
          <span class="setting-line__copy">
            <strong>{{ setting.title }}</strong>
            <small>{{ setting.description }}</small>
          </span>
          <span class="settings-switch" :class="{ 'is-on': toggles[setting.key] }" aria-hidden="true"></span>
        </button>

        <button class="setting-line setting-line--action" type="button">
          <span class="setting-line__copy">
            <strong>隐私设置</strong>
          </span>
          <span class="line-arrow">›</span>
        </button>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.settings-page {
  width: 100%;
  min-height: 100%;
  padding: 8px 0 12px;
  color: #fff;
}

.settings-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.settings-heading h1,
.settings-heading p {
  margin: 0;
}

.settings-heading h1 {
  color: #fff;
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1;
  letter-spacing: -0.08em;
}

.settings-heading p {
  margin-top: 8px;
  color: rgba(231, 236, 255, 0.66);
  font-size: 16px;
}

.settings-heading__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.settings-heading__chips span {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(231, 236, 255, 0.62);
  font-size: 11px;
}

.settings-heading__chips strong {
  margin-left: 5px;
  color: #fff;
}

.account-strip,
.settings-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(201, 210, 255, 0.13);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.02)),
    rgba(8, 15, 45, var(--app-glass-alpha));
  backdrop-filter: blur(var(--app-glass-blur));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 16px 42px rgba(5, 7, 26, 0.18);
}

.account-strip::before,
.settings-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 44% 12%, rgba(72, 204, 255, 0.16), transparent 32%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.035));
}

.account-strip {
  min-height: 140px;
  padding: 18px 24px 18px 28px;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto 24px;
  align-items: center;
  gap: 22px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 46% 50%, rgba(54, 216, 255, 0.42), transparent 22%),
    radial-gradient(circle at 10% 70%, rgba(255, 93, 215, 0.18), transparent 24%),
    linear-gradient(90deg, rgba(42, 31, 100, 0.9), rgba(16, 21, 68, 0.9) 62%, rgba(38, 16, 77, 0.92));
}

.account-strip__avatar,
.account-strip__content,
.account-strip__actions,
.account-strip__arrow {
  position: relative;
  z-index: 1;
}

.account-strip__avatar {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  overflow: visible;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.45), transparent 38%),
    linear-gradient(135deg, rgba(255, 130, 218, 0.9), rgba(89, 152, 255, 0.88));
  color: #fff;
  font-size: 30px;
  font-weight: 800;
  box-shadow: 0 16px 34px rgba(8, 8, 34, 0.26);
}

.account-strip__avatar::after {
  content: '♪';
  position: absolute;
  right: -4px;
  bottom: 2px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 3px solid rgba(19, 17, 64, 0.88);
  border-radius: 999px;
  background: #f13f48;
  color: #fff;
  font-size: 16px;
  font-weight: 900;
}

.account-strip__avatar img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.account-strip__content h2,
.account-strip__content p {
  margin: 0;
}

.account-strip__content h2 {
  color: rgba(255, 255, 255, 0.96);
  font-size: 25px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.account-strip__content p {
  margin-top: 8px;
  color: rgba(231, 236, 255, 0.62);
  font-size: 14px;
}

.sync-pill {
  width: fit-content;
  margin-top: 12px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  background: rgba(64, 255, 179, 0.12);
  color: #78f6bf;
  font-size: 12px;
  font-weight: 800;
}

.sync-pill svg {
  width: 14px;
  height: 14px;
}

.account-strip__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.account-strip__arrow {
  color: rgba(255, 255, 255, 0.62);
  font-size: 30px;
}

.settings-dashboard {
  display: grid;
  grid-template-columns: minmax(290px, 0.92fr) minmax(330px, 1fr) minmax(340px, 1.08fr);
  gap: 14px;
  margin-top: 14px;
}

.settings-lower-grid {
  display: grid;
  grid-template-columns: 1.06fr 0.95fr 0.82fr 1.02fr;
  gap: 12px;
  margin-top: 12px;
}

.settings-card {
  min-width: 0;
  padding: 16px;
  border-radius: 18px;
}

.settings-card--playback {
  background:
    radial-gradient(circle at 4% 12%, rgba(255, 90, 218, 0.14), transparent 30%),
    rgba(8, 15, 45, var(--app-glass-alpha));
}

.settings-card--quality {
  background:
    radial-gradient(circle at 10% 6%, rgba(98, 122, 255, 0.18), transparent 32%),
    rgba(8, 15, 45, var(--app-glass-alpha));
}

.settings-card--tuner {
  background:
    radial-gradient(circle at 74% 74%, rgba(217, 72, 255, 0.24), transparent 34%),
    radial-gradient(circle at 28% 16%, rgba(66, 187, 255, 0.12), transparent 28%),
    rgba(8, 15, 45, var(--app-glass-alpha));
}

.card-heading,
.card-heading__title,
.setting-line,
.settings-segment,
.equalizer,
.preset-row,
.preset-note,
.cache-panel,
.hint-pill,
.settings-button {
  position: relative;
  z-index: 1;
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 34px;
  margin-bottom: 12px;
}

.card-heading--split {
  justify-content: space-between;
}

.card-heading__title {
  display: inline-flex;
  align-items: center;
  gap: 11px;
}

.card-heading h2 {
  margin: 0;
  color: rgba(255, 255, 255, 0.96);
  font-size: 18px;
  line-height: 1.2;
  letter-spacing: -0.04em;
}

.card-heading__icon {
  width: 34px;
  height: 34px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 12px;
}

.card-heading__icon svg {
  width: 18px;
  height: 18px;
}

.card-heading__icon--pink {
  color: #ffd5f6;
  background: linear-gradient(135deg, rgba(255, 98, 218, 0.72), rgba(121, 82, 255, 0.68));
}

.card-heading__icon--blue {
  color: #dfe9ff;
  background: linear-gradient(135deg, rgba(76, 153, 255, 0.72), rgba(112, 86, 255, 0.62));
}

.card-heading__icon--violet {
  color: #f0e3ff;
  background: linear-gradient(135deg, rgba(159, 105, 255, 0.74), rgba(83, 62, 214, 0.7));
}

.card-heading__icon--cyan {
  color: #ddfff8;
  background: linear-gradient(135deg, rgba(58, 214, 224, 0.7), rgba(80, 145, 255, 0.66));
}

.setting-line {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 11px;
  background: rgba(10, 19, 49, 0.38);
  color: inherit;
  text-align: left;
}

button.setting-line {
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

button.setting-line:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.13);
  background: rgba(255, 255, 255, 0.055);
}

.setting-line + .setting-line,
.setting-line + .settings-button,
.cache-panel + .setting-line,
.hint-pill {
  margin-top: 8px;
}

.setting-line--range,
.setting-line--stacked {
  grid-template-columns: minmax(0, 1fr) auto;
}

.setting-line--stacked .settings-segment {
  grid-column: 1 / -1;
}

.setting-line__copy {
  min-width: 0;
}

.setting-line__copy--inline {
  display: flex;
  align-items: center;
  gap: 18px;
}

.setting-line__copy strong,
.setting-line__copy small {
  display: block;
}

.setting-line__copy strong {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 750;
}

.setting-line__copy small {
  margin-top: 3px;
  color: rgba(220, 229, 255, 0.52);
  font-size: 11px;
  line-height: 1.35;
}

.setting-line__value {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 800;
}

.settings-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.settings-switch::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  transition: transform 180ms ease;
}

.settings-switch.is-on {
  background: linear-gradient(135deg, rgba(255, 107, 218, 0.96), rgba(117, 83, 255, 0.94));
}

.settings-switch.is-on::before {
  transform: translateX(16px);
}

.settings-range {
  --settings-progress: 0%;
  grid-column: 1 / -1;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  background:
    linear-gradient(90deg, #fa65df 0%, #7b6cff var(--settings-progress), rgba(255, 255, 255, 0.15) var(--settings-progress), rgba(255, 255, 255, 0.15) 100%);
}

.settings-range::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(241, 81, 223, 0.18);
}

.settings-range::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(241, 81, 223, 0.18);
}

.settings-segment {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.settings-segment button,
.preset-row button {
  min-height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(224, 232, 255, 0.6);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.settings-segment button {
  flex: 1;
}

.settings-segment button.is-active,
.preset-row button.is-active {
  background: linear-gradient(135deg, rgba(111, 130, 255, 0.84), rgba(204, 75, 238, 0.82));
  color: #fff;
  box-shadow: 0 8px 18px rgba(119, 77, 255, 0.2);
}

.select-pill,
.mini-button {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.075);
  color: rgba(255, 255, 255, 0.84);
  font: inherit;
  font-size: 12px;
}

.select-pill {
  min-width: 142px;
  height: 30px;
  padding: 0 10px;
}

.select-pill--static {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mini-button {
  min-height: 30px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.mini-button svg {
  width: 14px;
  height: 14px;
}

.mini-button--soft {
  background: rgba(255, 255, 255, 0.09);
}

.equalizer {
  min-height: 150px;
  padding: 18px 14px 12px;
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 8px;
  border-radius: 15px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    rgba(6, 12, 38, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.055);
}

.equalizer__band {
  height: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.equalizer__band span {
  width: 11px;
  min-height: 24px;
  border-radius: 999px;
  background:
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0 4px, transparent 4px 9px),
    linear-gradient(180deg, #ff68e8 0%, #38dcff 46%, #2872ff 100%);
  box-shadow: 0 0 16px rgba(83, 211, 255, 0.24);
  animation: meter-float 1.9s ease-in-out infinite alternate;
}

.equalizer__band small {
  color: rgba(226, 233, 255, 0.56);
  font-size: 10px;
}

.preset-row {
  display: flex;
  gap: 7px;
  margin-top: 12px;
}

.preset-row button {
  flex: 1;
  background: rgba(255, 255, 255, 0.07);
}

.preset-note {
  margin-top: 12px;
  padding: 12px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border-radius: 13px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035)),
    rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.055);
}

.preset-note svg {
  width: 22px;
  height: 22px;
  color: rgba(255, 255, 255, 0.78);
}

.preset-note strong,
.preset-note span {
  display: block;
}

.preset-note strong {
  color: #fff;
  font-size: 13px;
}

.preset-note span {
  margin-top: 3px;
  color: rgba(226, 233, 255, 0.57);
  font-size: 11px;
  line-height: 1.45;
}

.settings-button {
  min-height: 36px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.settings-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.settings-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.settings-button--primary {
  background: linear-gradient(135deg, rgba(84, 147, 255, 0.95), rgba(193, 67, 238, 0.94));
  box-shadow: 0 12px 24px rgba(96, 76, 225, 0.22);
}

.settings-button--ghost {
  background: rgba(255, 255, 255, 0.09);
}

.settings-button--danger {
  width: 100%;
  margin-top: 10px;
  background: linear-gradient(135deg, rgba(255, 80, 158, 0.82), rgba(203, 69, 188, 0.74));
}

.settings-button__icon {
  width: 15px;
  height: 15px;
}

.cache-panel {
  padding: 12px;
  border-radius: 13px;
  background: rgba(6, 12, 38, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.055);
}

.cache-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(226, 233, 255, 0.62);
  font-size: 12px;
}

.cache-panel__head strong {
  color: #fff;
  font-size: 13px;
}

.cache-panel__track {
  height: 5px;
  margin-top: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.cache-panel__track span {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: linear-gradient(90deg, #ed60e8, #5aa9ff);
}

.cache-panel small {
  display: block;
  margin-top: 9px;
  color: rgba(226, 233, 255, 0.5);
  font-size: 11px;
}

.line-arrow {
  color: rgba(255, 255, 255, 0.58);
  font-size: 22px;
}

.beta-pill {
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(65, 139, 255, 0.13);
  color: #8eb8ff;
  font-size: 11px;
  font-weight: 800;
}

.hint-pill {
  padding: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  background: rgba(112, 105, 255, 0.1);
  color: rgba(226, 233, 255, 0.58);
  font-size: 11px;
  line-height: 1.45;
}

.hint-pill svg {
  width: 15px;
  height: 15px;
  flex: none;
  color: #bd9dff;
}

@keyframes meter-float {
  from {
    transform: scaleY(0.88);
  }

  to {
    transform: scaleY(1.04);
  }
}

@media (max-width: 1280px) {
  .settings-dashboard,
  .settings-lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settings-card--tuner {
    grid-column: 1 / -1;
  }
}

@media (max-width: 820px) {
  .settings-heading,
  .account-strip__actions {
    align-items: flex-start;
  }

  .settings-heading {
    flex-direction: column;
  }

  .settings-heading__chips {
    justify-content: flex-start;
  }

  .account-strip,
  .settings-dashboard,
  .settings-lower-grid {
    grid-template-columns: 1fr;
  }

  .account-strip {
    gap: 14px;
  }

  .account-strip__actions {
    justify-content: flex-start;
  }

  .account-strip__arrow {
    display: none;
  }

  .settings-card--tuner {
    grid-column: auto;
  }
}

@media (max-width: 560px) {
  .settings-page {
    padding-top: 0;
  }

  .account-strip,
  .settings-card {
    border-radius: 16px;
  }

  .settings-segment,
  .preset-row {
    flex-wrap: wrap;
  }

  .settings-segment button,
  .preset-row button {
    flex: 1 1 30%;
  }

  .setting-line__copy--inline {
    display: block;
  }

  .select-pill {
    min-width: 112px;
  }
}
</style>
