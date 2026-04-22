<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ArrowUpDown,
  Filter,
  Heart,
  MoreVertical,
  Play,
  Search,
} from 'lucide-vue-next'
import { usePlayerStore, type RecentPlayerTrack } from '@/stores/player'
import { formatTime } from '@/stores/player/utils'

type HistorySection = 'song' | 'playlist' | 'video' | 'radio' | 'mv'
type SortMode = 'recent' | 'plays' | 'duration'

const playerStore = usePlayerStore()
const { currentTrack, isPlaying, queue, recentTracks } = storeToRefs(playerStore)

const activeSection = ref<HistorySection>('song')
const searchKeyword = ref('')
const showFrequentlyPlayedOnly = ref(false)
const showCurrentDeviceOnly = ref(true)
const sortMode = ref<SortMode>('recent')
const sortDescending = ref(true)

const sectionOptions = computed(() => [
  { key: 'song' as const, label: '单曲', count: recentTracks.value.length },
  { key: 'playlist' as const, label: '歌单', count: 0 },
  { key: 'video' as const, label: '视频', count: 0 },
  { key: 'radio' as const, label: '音乐频道', count: 0 },
  { key: 'mv' as const, label: 'MV频道', count: 0 },
])

const activeSectionLabel = computed(
  () => sectionOptions.value.find((item) => item.key === activeSection.value)?.label ?? '单曲',
)

const sortLabel = computed(() => {
  if (sortMode.value === 'plays') {
    return '播放次数'
  }

  if (sortMode.value === 'duration') {
    return '时长'
  }

  return '最近播放'
})

const filteredTracks = computed(() => {
  if (activeSection.value !== 'song') {
    return []
  }

  let items = recentTracks.value.slice()

  if (showCurrentDeviceOnly.value) {
    items = items.slice()
  }

  if (showFrequentlyPlayedOnly.value) {
    items = items.filter((item) => item.playCount >= 2)
  }

  const keyword = searchKeyword.value.trim().toLowerCase()

  if (keyword) {
    items = items.filter((item) => {
      const haystack = `${item.title} ${item.artist}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }

  items.sort((left, right) => {
    if (sortMode.value === 'plays') {
      return right.playCount - left.playCount
    }

    if (sortMode.value === 'duration') {
      return (right.durationMs ?? 0) - (left.durationMs ?? 0)
    }

    return right.lastPlayedAt - left.lastPlayedAt
  })

  if (!sortDescending.value) {
    items.reverse()
  }

  return items
})

const summaryText = computed(() => {
  if (activeSection.value !== 'song') {
    return `${activeSectionLabel.value} 最近播放会在后续接入。`
  }

  if (filteredTracks.value.length === 0) {
    return '还没有符合条件的最近播放记录。'
  }

  if (showFrequentlyPlayedOnly.value) {
    return `筛出了 ${filteredTracks.value.length} 首最近常听的单曲。`
  }

  return `当前展示 ${filteredTracks.value.length} 条本地最近播放记录。`
})

const primaryButtonLabel = computed(() => {
  if (activeSection.value !== 'song') {
    return '播放'
  }

  if (filteredTracks.value.length === 0) {
    return '播放'
  }

  const firstTrack = filteredTracks.value[0]

  if (currentTrack.value?.id === firstTrack.id) {
    return isPlaying.value ? '暂停' : '继续播放'
  }

  return '播放'
})

function cycleSortMode() {
  if (sortMode.value === 'recent') {
    sortMode.value = 'plays'
    return
  }

  if (sortMode.value === 'plays') {
    sortMode.value = 'duration'
    return
  }

  sortMode.value = 'recent'
}

function handlePrimaryPlay() {
  if (activeSection.value !== 'song' || filteredTracks.value.length === 0) {
    return
  }

  const firstTrack = filteredTracks.value[0]

  if (currentTrack.value?.id === firstTrack.id) {
    void playerStore.togglePlay()
    return
  }

  void playerStore.playQueue(filteredTracks.value, 0, {
    startTimeSeconds: firstTrack.lastTimeSeconds,
  })
}

function handleResumeTrack(track: RecentPlayerTrack) {
  void playerStore.resumeRecentTrack(track)
}

function handleToggleFavorite(trackId: string) {
  playerStore.toggleRecentFavorite(trackId)
}

function handleRemoveTrack(trackId: string) {
  playerStore.removeRecentTrack(trackId)
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function formatLastPlayedAt(timestamp: number) {
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

function formatPlayCount(count: number) {
  return `听过${count}次`
}

function getResumeLabel(track: RecentPlayerTrack) {
  if (track.lastTimeSeconds <= 0) {
    return '从头开始'
  }

  return `上次停在 ${formatTime(track.lastTimeSeconds)}`
}

function getProgressPercent(track: RecentPlayerTrack) {
  const totalSeconds = track.durationMs ? track.durationMs / 1000 : 0

  if (totalSeconds <= 0) {
    return 0
  }

  return Math.min((track.lastTimeSeconds / totalSeconds) * 100, 100)
}
</script>

<template>
  <section class="history-page">
    <header class="history-page__header">
      <div>
        <h1 class="history-page__title">最近播放</h1>
        <p class="history-page__desc">
          保留项目原来的背景氛围，只把内容布局整理成更接近桌面播放器的最近播放列表。
        </p>
      </div>

      <div class="history-page__badge">当前队列 {{ queue.length }}</div>
    </header>

    <div class="history-shell">
      <div class="history-tabs">
        <button
          v-for="item in sectionOptions"
          :key="item.key"
          class="history-tabs__item"
          :class="{ 'history-tabs__item--active': item.key === activeSection }"
          type="button"
          @click="activeSection = item.key"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.count }}</strong>
        </button>

        <label class="history-tabs__check">
          <input v-model="showFrequentlyPlayedOnly" type="checkbox" />
          <span>最近常听</span>
        </label>

        <label class="history-tabs__check">
          <input v-model="showCurrentDeviceOnly" type="checkbox" />
          <span>只看本设备播放记录</span>
        </label>
      </div>

      <div class="history-toolbar">
        <div class="history-toolbar__left">
          <button
            class="history-toolbar__play"
            type="button"
            :disabled="activeSection !== 'song' || filteredTracks.length === 0"
            @click="handlePrimaryPlay"
          >
            <Play class="history-toolbar__play-icon" :stroke-width="2.25" />
            <span>{{ primaryButtonLabel }}</span>
          </button>

          <div class="history-toolbar__summary">
            {{ summaryText }}
          </div>
        </div>

        <div class="history-toolbar__right">
          <button class="history-toolbar__ghost" type="button" @click="cycleSortMode">
            <Filter class="history-toolbar__ghost-icon" :stroke-width="2" />
            <span>{{ sortLabel }}</span>
          </button>

          <label class="history-toolbar__search">
            <Search class="history-toolbar__search-icon" :stroke-width="2" />
            <input v-model="searchKeyword" type="search" placeholder="搜索最近播放" />
          </label>

          <button
            class="history-toolbar__icon"
            type="button"
            :title="sortDescending ? '当前为降序' : '当前为升序'"
            @click="sortDescending = !sortDescending"
          >
            <ArrowUpDown class="history-toolbar__ghost-icon" :stroke-width="2" />
          </button>
        </div>
      </div>

      <div v-if="activeSection !== 'song'" class="history-empty">
        当前版本先把单曲最近播放做完整，{{ activeSectionLabel }} 分组后面再接入。
      </div>

      <template v-else>
        <div class="history-table__head">
          <div></div>
          <div>歌曲</div>
          <div>最近播放</div>
          <div>播放次数</div>
          <div>时长</div>
          <div>喜欢</div>
          <div></div>
        </div>

        <div v-if="filteredTracks.length === 0" class="history-empty">
          还没有符合当前筛选条件的播放记录，换个筛选试试，或者先去播放几首歌。
        </div>

        <div v-else class="history-list">
          <article
            v-for="(track, index) in filteredTracks"
            :key="track.id"
            class="history-row"
            :class="{ 'history-row--active': currentTrack?.id === track.id }"
          >
            <button class="history-row__main" type="button" @click="handleResumeTrack(track)">
              <div class="history-row__index">
                <span v-if="currentTrack?.id !== track.id">{{ formatIndex(index) }}</span>
                <span v-else class="history-row__equalizer">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>

              <div class="history-row__song">
                <img
                  v-if="track.coverUrl"
                  class="history-row__cover"
                  :src="track.coverUrl"
                  :alt="track.title"
                  referrerpolicy="no-referrer"
                />
                <div v-else class="history-row__cover history-row__cover--placeholder" aria-hidden="true"></div>

                <div class="history-row__copy">
                  <div class="history-row__titleline">
                    <div class="history-row__title">{{ track.title }}</div>
                    <span v-if="currentTrack?.id === track.id" class="history-row__playing-badge">
                      当前播放
                    </span>
                  </div>
                  <div class="history-row__artist">{{ track.artist }}</div>
                </div>
              </div>
            </button>

            <div class="history-row__recent">
              <div class="history-row__recent-top">{{ formatLastPlayedAt(track.lastPlayedAt) }}</div>
              <div class="history-row__recent-sub">{{ getResumeLabel(track) }}</div>
              <div class="history-row__progress">
                <span :style="{ width: `${getProgressPercent(track)}%` }"></span>
              </div>
            </div>

            <div class="history-row__plays">{{ formatPlayCount(track.playCount) }}</div>
            <div class="history-row__duration">{{ track.duration }}</div>

            <button
              class="history-row__icon"
              :class="{ 'history-row__icon--favorite': track.isFavorite }"
              type="button"
              :title="track.isFavorite ? '取消喜欢' : '加入喜欢'"
              @click="handleToggleFavorite(track.id)"
            >
              <Heart :stroke-width="2" :fill="track.isFavorite ? 'currentColor' : 'none'" />
            </button>

            <button
              class="history-row__icon"
              type="button"
              title="从最近播放移除"
              @click="handleRemoveTrack(track.id)"
            >
              <MoreVertical :stroke-width="2" />
            </button>
          </article>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped lang="scss">
.history-page {
  width: 100%;
  display: grid;
  gap: 18px;
  padding-bottom: 12px;
}

.history-page__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.history-page__title {
  margin: 0;
  color: rgba(251, 250, 255, 0.98);
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.05em;
}

.history-page__desc {
  margin: 10px 0 0;
  color: rgba(228, 235, 255, 0.6);
  font-size: 13px;
  line-height: 1.75;
}

.history-page__badge {
  height: 34px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(245, 248, 255, 0.86);
  font-size: 12px;
  font-weight: 700;
}

.history-shell {
  position: relative;
  overflow: hidden;
  padding: 20px 22px 14px;
  border-radius: 30px;
  border: 1px solid rgba(214, 207, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015)),
    rgba(18, 12, 56, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 20px 46px rgba(7, 6, 26, 0.18);
  backdrop-filter: blur(26px);
}

.history-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top left, rgba(255, 123, 209, 0.12), transparent 22%),
    radial-gradient(circle at top right, rgba(91, 166, 255, 0.12), transparent 24%);
}

.history-tabs,
.history-toolbar,
.history-table__head,
.history-list,
.history-empty {
  position: relative;
  z-index: 1;
}

.history-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
}

.history-tabs__item {
  padding: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  border: 0;
  background: transparent;
  color: rgba(223, 230, 255, 0.62);
  font-size: 14px;
  cursor: pointer;
  transition: color 180ms ease;
}

.history-tabs__item strong {
  font-size: 12px;
  font-weight: 700;
}

.history-tabs__item:hover,
.history-tabs__item--active {
  color: #68a4ff;
}

.history-tabs__item--active {
  text-shadow: 0 0 18px rgba(104, 164, 255, 0.24);
}

.history-tabs__check {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(226, 233, 255, 0.62);
  font-size: 12px;
  white-space: nowrap;
}

.history-tabs__check + .history-tabs__check {
  margin-left: 0;
}

.history-tabs__check input {
  width: 14px;
  height: 14px;
  accent-color: #4f95ff;
}

.history-toolbar {
  margin-top: 18px;
  padding: 18px 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.history-toolbar__left,
.history-toolbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-toolbar__left {
  min-width: 0;
  flex: 1;
}

.history-toolbar__right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.history-toolbar__play,
.history-toolbar__ghost,
.history-toolbar__icon {
  height: 40px;
  border: 0;
  color: #fff;
  cursor: pointer;
}

.history-toolbar__play {
  padding: 0 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  background: linear-gradient(180deg, #2b86ff, #1b67ff);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 10px 24px rgba(40, 108, 255, 0.18);
  font-size: 14px;
  font-weight: 700;
}

.history-toolbar__play:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

.history-toolbar__play-icon,
.history-toolbar__ghost-icon {
  width: 16px;
  height: 16px;
  flex: none;
}

.history-toolbar__summary {
  min-width: 0;
  color: rgba(229, 235, 255, 0.56);
  font-size: 12px;
  line-height: 1.65;
}

.history-toolbar__ghost,
.history-toolbar__icon,
.history-toolbar__search {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.history-toolbar__ghost {
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(244, 247, 255, 0.88);
  font-size: 12px;
  font-weight: 600;
}

.history-toolbar__icon {
  width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.history-toolbar__search {
  width: 220px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-toolbar__search-icon {
  width: 15px;
  height: 15px;
  flex: none;
  color: rgba(233, 239, 255, 0.52);
}

.history-toolbar__search input {
  width: 100%;
  height: 38px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 12px;
}

.history-toolbar__search input::placeholder {
  color: rgba(228, 235, 255, 0.4);
}

.history-table__head {
  margin-top: 12px;
  padding: 0 10px 10px;
  display: grid;
  grid-template-columns: 76px minmax(280px, 2fr) minmax(180px, 1.2fr) 108px 72px 54px 42px;
  gap: 12px;
  color: rgba(233, 239, 255, 0.42);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.history-list {
  display: grid;
}

.history-row {
  display: grid;
  grid-template-columns: 76px minmax(280px, 2fr) minmax(180px, 1.2fr) 108px 72px 54px 42px;
  align-items: center;
  gap: 12px;
  min-height: 88px;
  padding: 8px 10px;
  border-radius: 18px;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.history-row + .history-row {
  margin-top: 4px;
}

.history-row:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.05);
}

.history-row--active {
  background: linear-gradient(90deg, rgba(74, 136, 255, 0.18), rgba(255, 255, 255, 0.04));
  box-shadow: inset 0 0 0 1px rgba(95, 156, 255, 0.14);
}

.history-row__main {
  grid-column: 1 / 3;
  width: 100%;
  padding: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.history-row__index {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(245, 248, 255, 0.54);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.history-row__equalizer {
  display: inline-flex;
  align-items: end;
  gap: 3px;
  height: 22px;
  color: #69a7ff;
}

.history-row__equalizer span {
  width: 4px;
  border-radius: 999px;
  background: currentColor;
  animation: equalizer 0.9s ease-in-out infinite alternate;
}

.history-row__equalizer span:nth-child(1) {
  height: 10px;
}

.history-row__equalizer span:nth-child(2) {
  height: 22px;
  animation-delay: 0.16s;
}

.history-row__equalizer span:nth-child(3) {
  height: 14px;
  animation-delay: 0.32s;
}

.history-row__song {
  min-width: 0;
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.history-row__cover {
  width: 62px;
  height: 62px;
  border-radius: 14px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.history-row__cover--placeholder {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    linear-gradient(135deg, rgba(255, 118, 209, 0.62), rgba(79, 141, 255, 0.68));
}

.history-row__copy {
  min-width: 0;
}

.history-row__titleline {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.history-row__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(252, 249, 255, 0.96);
  font-size: 16px;
  font-weight: 600;
}

.history-row__playing-badge {
  flex: none;
  height: 22px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(74, 136, 255, 0.14);
  color: #79b2ff;
  font-size: 11px;
  font-weight: 700;
}

.history-row__artist,
.history-row__recent-top,
.history-row__recent-sub,
.history-row__plays,
.history-row__duration {
  color: rgba(228, 235, 255, 0.58);
  font-size: 13px;
}

.history-row__artist {
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-row__recent {
  min-width: 0;
}

.history-row__recent-top {
  color: rgba(244, 247, 255, 0.84);
}

.history-row__recent-sub {
  margin-top: 6px;
}

.history-row__progress {
  height: 5px;
  margin-top: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.history-row__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6faeff, #ff75c2);
}

.history-row__plays,
.history-row__duration {
  font-variant-numeric: tabular-nums;
}

.history-row__icon {
  width: 40px;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(239, 243, 255, 0.72);
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.history-row__icon:hover {
  background: rgba(255, 255, 255, 0.12);
}

.history-row__icon--favorite {
  color: #ff7aa7;
}

.history-row__icon svg {
  width: 16px;
  height: 16px;
}

.history-empty {
  margin-top: 16px;
  display: grid;
  place-items: center;
  min-height: 280px;
  border-radius: 22px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  color: rgba(229, 235, 255, 0.6);
  text-align: center;
  line-height: 1.8;
}

@keyframes equalizer {
  from {
    transform: scaleY(0.42);
    opacity: 0.66;
  }

  to {
    transform: scaleY(1);
    opacity: 1;
  }
}

@media (max-width: 1200px) {
  .history-tabs__check {
    margin-left: 0;
  }

  .history-toolbar {
    display: grid;
  }

  .history-toolbar__left,
  .history-toolbar__right {
    width: 100%;
  }

  .history-table__head,
  .history-row {
    grid-template-columns: 68px minmax(220px, 2fr) minmax(160px, 1fr) 96px 64px 48px 40px;
  }
}

@media (max-width: 960px) {
  .history-page__header {
    display: grid;
  }

  .history-toolbar__right {
    justify-content: start;
  }

  .history-toolbar__search {
    width: min(100%, 240px);
  }

  .history-table__head,
  .history-row {
    grid-template-columns: 60px minmax(0, 1.7fr) minmax(140px, 1fr) 88px 60px 44px 36px;
  }
}

@media (max-width: 720px) {
  .history-shell {
    padding: 16px 14px 12px;
    border-radius: 24px;
  }

  .history-table__head {
    display: none;
  }

  .history-row {
    grid-template-columns: 1fr auto auto;
    align-items: start;
    gap: 10px;
    padding: 14px 10px;
  }

  .history-row__main {
    grid-column: 1 / -1;
  }

  .history-row__recent,
  .history-row__plays {
    grid-column: 2 / 4;
    text-align: right;
  }

  .history-row__duration {
    display: none;
  }
}

@media (max-width: 560px) {
  .history-tabs {
    gap: 8px 14px;
  }

  .history-toolbar__left,
  .history-toolbar__right {
    display: grid;
  }

  .history-toolbar__play,
  .history-toolbar__ghost,
  .history-toolbar__icon,
  .history-toolbar__search {
    width: 100%;
  }

  .history-row {
    grid-template-columns: 1fr;
  }

  .history-row__main {
    grid-template-columns: 1fr;
  }

  .history-row__index {
    display: none;
  }

  .history-row__song {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .history-row__recent,
  .history-row__plays {
    grid-column: auto;
    text-align: left;
  }

  .history-row__icon {
    width: 36px;
    height: 36px;
  }
}
</style>
