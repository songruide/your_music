<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ArrowRight,
  Disc3,
  Layers3,
  ListMusic,
  ListX,
  LoaderCircle,
  Play,
  Search,
  SkipForward,
  X,
} from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AiSparkIcon from '@/components/assistant/AiSparkIcon.vue'
import { useAssistantStore, type AssistantUiMessage } from '@/stores/assistant'
import { usePlayerStore } from '@/stores/player'
import type { AssistantSongResult } from '@/types/ai'
import { buildAssistantRouteContext, getAssistantRouteLabel } from '@/utils/assistantContext'
import { ASSISTANT_SEARCH_SOURCE, buildSearchRoute } from '@/views/Search/utils'

const DEFAULT_VISIBLE_RESULT_COUNT = 3
const quickPrompts = [
  '来点深夜通勤适合听的电子乐',
  '播放一首周杰伦的歌',
  '把这首类似风格的歌加入下一首',
]

const route = useRoute()
const router = useRouter()
const assistantStore = useAssistantStore()
const playerStore = usePlayerStore()
const { currentTrack, queue } = storeToRefs(playerStore)
const { error, hasMessages, isPanelOpen, isSending, messages } = storeToRefs(assistantStore)
const composerInput = ref('')
const bodyRef = ref<HTMLElement | null>(null)

function isAssistantMessage(message: AssistantUiMessage) {
  return message.role === 'assistant'
}

function getSongList(message: AssistantUiMessage) {
  return message.action?.songs ?? []
}

function getVisibleSongList(message: AssistantUiMessage) {
  return getSongList(message).slice(0, DEFAULT_VISIBLE_RESULT_COUNT)
}

function getMessageSearchKeyword(message: AssistantUiMessage) {
  return message.action?.query?.trim() ?? ''
}

function canOpenSearchResult(message: AssistantUiMessage) {
  return isAssistantMessage(message) && Boolean(getMessageSearchKeyword(message))
}

function getMessageStatusLabel(message: AssistantUiMessage) {
  if (message.status === 'error') {
    return '执行失败'
  }

  if (message.status === 'streaming') {
    return '正在分析'
  }

  return message.usedModel ? '模型输出' : '本地兜底'
}

function getContextTrackLabel() {
  return currentTrack.value ? currentTrack.value.title : '未播放'
}

function getQueuePreviewLabel() {
  if (queue.value.length === 0) {
    return '队列为空'
  }

  return queue.value
    .slice(0, 2)
    .map((track) => track.title)
    .join(' / ')
}

async function scrollToBottom() {
  await nextTick()

  if (!bodyRef.value) {
    return
  }

  bodyRef.value.scrollTop = bodyRef.value.scrollHeight
}

async function handleSend() {
  const text = composerInput.value.trim()

  if (!text) {
    return
  }

  await assistantStore.sendMessage(text, buildAssistantRouteContext(route))
  composerInput.value = ''
}

async function handleQuickPrompt(prompt: string) {
  composerInput.value = prompt
  await handleSend()
}

async function handlePlaySongs(message: AssistantUiMessage, index = 0) {
  const songs = getSongList(message)

  if (!songs.length) {
    return
  }

  await assistantStore.playResolvedSong(songs, index)
}

async function handleEnqueueSong(song: AssistantSongResult) {
  await assistantStore.enqueueResolvedSong(song)
}

async function handleSimilarPrompt() {
  if (currentTrack.value) {
    await assistantStore.sendMessage(`来点和${currentTrack.value.title}类似的歌`, buildAssistantRouteContext(route))
    return
  }

  await assistantStore.sendMessage('来点适合现在听的歌', buildAssistantRouteContext(route))
}

async function openSearchResult(message: AssistantUiMessage) {
  const keyword = getMessageSearchKeyword(message)

  if (!keyword) {
    return
  }

  await router.push(buildSearchRoute(keyword, 'song', 1, { source: ASSISTANT_SEARCH_SOURCE }))
  assistantStore.closePanel()
}

watch(
  () => [isPanelOpen.value, messages.value.length, isSending.value],
  () => {
    void scrollToBottom()
  },
)
</script>

<template>
  <Transition name="assistant-panel">
    <aside v-if="isPanelOpen" class="assistant-panel" role="dialog" aria-label="AI Music Assistant">
      <header class="assistant-panel__header">
        <div class="assistant-panel__title-block">
          <div class="assistant-panel__title-row">
            <div class="assistant-panel__title">
              <AiSparkIcon class="assistant-panel__title-icon assistant-panel__title-icon--spark" />
              <span>AI Music Assistant</span>
            </div>

            <span class="assistant-panel__live">
              <span class="assistant-panel__live-dot"></span>
              <span>{{ isSending ? '正在响应' : '在线待命' }}</span>
            </span>
          </div>
          <p class="assistant-panel__subtitle">像控制台一样聊天，像播放器一样执行动作。</p>
        </div>

        <button class="assistant-panel__close" type="button" aria-label="关闭 AI 面板" @click="assistantStore.closePanel()">
          <X class="assistant-panel__close-icon" :stroke-width="2" />
        </button>
      </header>

      <div class="assistant-panel__context-row">
        <div class="assistant-panel__context-card">
          <span class="assistant-panel__context-icon">
            <Disc3 class="assistant-panel__chip-icon" :stroke-width="1.8" />
          </span>
          <div class="assistant-panel__context-copy">
            <span class="assistant-panel__context-label">当前参考</span>
            <span class="assistant-panel__context-value">{{ getContextTrackLabel() }}</span>
          </div>
        </div>

        <div class="assistant-panel__context-card">
          <span class="assistant-panel__context-icon">
            <Layers3 class="assistant-panel__chip-icon" :stroke-width="1.8" />
          </span>
          <div class="assistant-panel__context-copy">
            <span class="assistant-panel__context-label">队列 {{ queue.length }} 首</span>
            <span class="assistant-panel__context-value">{{ getQueuePreviewLabel() }}</span>
          </div>
        </div>

        <div class="assistant-panel__context-actions">
          <span class="assistant-panel__route-pill">
            <ArrowRight class="assistant-panel__chip-icon" :stroke-width="1.8" />
            <span>{{ getAssistantRouteLabel(typeof route.name === 'string' ? route.name : '') }}</span>
          </span>

          <button class="assistant-panel__mini-action" type="button" :disabled="isSending" @click="handleSimilarPrompt">
            相似推荐
          </button>

          <button class="assistant-panel__mini-action assistant-panel__mini-action--ghost" type="button" @click="assistantStore.clearMessages()">
            <ListX class="assistant-panel__mini-action-icon" :stroke-width="1.8" />
            <span>清空</span>
          </button>
        </div>
      </div>

      <div ref="bodyRef" class="assistant-panel__body">
        <div v-if="!hasMessages" class="assistant-panel__empty">
          <section class="assistant-panel__hero">
            <div class="assistant-panel__hero-copy">
              <span class="assistant-panel__hero-eyebrow">SMART PLAYBACK</span>
              <h3 class="assistant-panel__empty-title">从一句自然语言开始控制你的播放器</h3>
              <p class="assistant-panel__empty-copy">
                找歌、直接播放、加入下一首，都会沿用当前播放器和真实搜索结果，不会脱离你现有页面。
              </p>
            </div>

            <div class="assistant-panel__hero-art">
              <div class="assistant-panel__hero-core">
                <AiSparkIcon class="assistant-panel__hero-icon" />
              </div>
              <span class="assistant-panel__hero-ring assistant-panel__hero-ring--outer"></span>
              <span class="assistant-panel__hero-ring assistant-panel__hero-ring--inner"></span>
            </div>
          </section>

          <section class="assistant-panel__spotlight">
            <div class="assistant-panel__spotlight-cover">
              <img
                v-if="currentTrack?.coverUrl"
                :src="currentTrack.coverUrl"
                :alt="currentTrack.title"
                referrerpolicy="no-referrer"
              />
              <div v-else class="assistant-panel__spotlight-cover assistant-panel__spotlight-cover--placeholder"></div>
            </div>

            <div class="assistant-panel__spotlight-copy">
              <span class="assistant-panel__spotlight-label">当前播放上下文</span>
              <div class="assistant-panel__spotlight-title">{{ currentTrack ? currentTrack.title : '还没有开始播放' }}</div>
              <div class="assistant-panel__spotlight-meta">
                {{ currentTrack ? currentTrack.artist : '先点一首歌，再让 AI 帮你延展播放' }}
              </div>
            </div>
          </section>

          <div class="assistant-panel__prompt-list">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              class="assistant-panel__prompt"
              type="button"
              @click="handleQuickPrompt(prompt)"
            >
              <AiSparkIcon class="assistant-panel__prompt-icon assistant-panel__prompt-icon--spark" />
              <span>{{ prompt }}</span>
              <ArrowRight class="assistant-panel__prompt-arrow" :stroke-width="1.8" />
            </button>
          </div>
        </div>

        <div v-else class="assistant-panel__messages">
          <article
            v-for="message in messages"
            :key="message.id"
            class="assistant-panel__message"
            :class="{
              'assistant-panel__message--assistant': isAssistantMessage(message),
              'assistant-panel__message--error': message.status === 'error',
            }"
          >
            <div class="assistant-panel__bubble">
              <div v-if="isAssistantMessage(message)" class="assistant-panel__bubble-head">
                <span class="assistant-panel__bubble-label">AI 响应</span>
                <span class="assistant-panel__bubble-badge">{{ getMessageStatusLabel(message) }}</span>
              </div>

              <p class="assistant-panel__text">{{ message.text || (message.status === 'streaming' ? '正在整理结果...' : '') }}</p>

              <div
                v-if="isAssistantMessage(message) && getSongList(message).length > 0"
                class="assistant-panel__result-list"
              >
                <article
                  v-for="(song, index) in getVisibleSongList(message)"
                  :key="`${song.id}-${index}`"
                  class="assistant-panel__song-card"
                >
                  <div class="assistant-panel__song-rank">{{ String(index + 1).padStart(2, '0') }}</div>
                  <img class="assistant-panel__song-cover" :src="song.coverUrl" :alt="song.name" referrerpolicy="no-referrer" />

                  <div class="assistant-panel__song-copy">
                    <div class="assistant-panel__song-name">{{ song.name }}</div>
                    <div class="assistant-panel__song-meta">{{ song.artistNames.join(' / ') || '未知歌手' }}</div>
                    <div class="assistant-panel__song-submeta">
                      <span>{{ song.albumName || '单曲' }}</span>
                      <span v-if="song.duration">· {{ Math.round(song.duration / 1000 / 60) }} min</span>
                    </div>
                  </div>

                  <div class="assistant-panel__song-actions">
                    <button class="assistant-panel__song-button" type="button" @click="handlePlaySongs(message, index)">
                      <Play class="assistant-panel__song-button-icon" :stroke-width="1.9" />
                      <span>播放</span>
                    </button>

                    <button class="assistant-panel__song-button assistant-panel__song-button--ghost" type="button" @click="handleEnqueueSong(song)">
                      <ListMusic class="assistant-panel__song-button-icon" :stroke-width="1.9" />
                      <span>下一首</span>
                    </button>
                  </div>
                </article>
              </div>

              <div
                v-if="isAssistantMessage(message) && (message.action?.songs?.length || canOpenSearchResult(message))"
                class="assistant-panel__footer-actions"
              >
                <button
                  v-if="message.action?.songs?.length"
                  class="assistant-panel__footer-button"
                  type="button"
                  @click="handlePlaySongs(message, message.action.selectedIndex ?? 0)"
                >
                  <SkipForward class="assistant-panel__footer-icon" :stroke-width="1.9" />
                  <span>执行推荐动作</span>
                </button>

                <button
                  v-if="canOpenSearchResult(message)"
                  class="assistant-panel__footer-button assistant-panel__footer-button--ghost"
                  type="button"
                  @click="openSearchResult(message)"
                >
                  <Search class="assistant-panel__footer-icon" :stroke-width="1.9" />
                  <span>查看搜索结果</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-if="error" class="assistant-panel__status assistant-panel__status--error">{{ error }}</div>

      <form class="assistant-panel__composer" @submit.prevent="handleSend">
        <label class="assistant-panel__composer-field">
          <textarea
            v-model="composerInput"
            class="assistant-panel__composer-input"
            :disabled="isSending"
            rows="1"
            placeholder="继续说一句，例如：来点今晚适合循环的歌"
          ></textarea>
        </label>

        <div class="assistant-panel__composer-actions">
          <button
            v-if="isSending"
            class="assistant-panel__composer-button assistant-panel__composer-button--ghost"
            type="button"
            @click="assistantStore.stopCurrentResponse()"
          >
            停止
          </button>

          <button class="assistant-panel__composer-button" type="submit" :disabled="!composerInput.trim() || isSending">
            <LoaderCircle
              v-if="isSending"
              class="assistant-panel__composer-icon assistant-panel__composer-icon--spinning"
              :stroke-width="1.9"
            />
            <ArrowRight v-else class="assistant-panel__composer-icon" :stroke-width="2" />
            <span>{{ isSending ? '处理中' : '发送' }}</span>
          </button>
        </div>
      </form>
    </aside>
  </Transition>
</template>

<style scoped lang="scss">
.assistant-panel {
  position: fixed;
  top: 22px;
  right: 24px;
  bottom: calc(var(--layout-player-height, 62px) + 18px);
  width: min(408px, calc(100vw - 48px));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  gap: 12px;
  padding: 16px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(91, 147, 255, 0.13), transparent 30%),
    radial-gradient(circle at top left, rgba(243, 96, 218, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(11, 16, 46, 0.92), rgba(10, 18, 54, 0.9));
  border: 1px solid rgba(214, 221, 255, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 52px rgba(6, 10, 28, 0.3);
  backdrop-filter: blur(20px);
  z-index: 7;
}

.assistant-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);
  pointer-events: none;
}

.assistant-panel__header,
.assistant-panel__context-row,
.assistant-panel__composer,
.assistant-panel__status {
  position: relative;
  z-index: 1;
}

.assistant-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.assistant-panel__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.assistant-panel__title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

.assistant-panel__live {
  min-height: 24px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(233, 239, 255, 0.74);
  font-size: 10px;
}

.assistant-panel__live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(180deg, #66d8ff, #b65dff);
  box-shadow: 0 0 0 3px rgba(121, 155, 255, 0.12);
}

.assistant-panel__title-icon,
.assistant-panel__chip-icon,
.assistant-panel__footer-icon,
.assistant-panel__composer-icon,
.assistant-panel__song-button-icon,
.assistant-panel__close-icon,
.assistant-panel__prompt-icon,
.assistant-panel__prompt-arrow {
  width: 16px;
  height: 16px;
}

.assistant-panel__title-icon--spark {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.assistant-panel__subtitle,
.assistant-panel__empty-copy,
.assistant-panel__status {
  margin: 0;
  color: rgba(220, 228, 255, 0.64);
  font-size: 11px;
  line-height: 1.55;
}

.assistant-panel__close {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.86);
  cursor: pointer;
  transition:
    background 180ms ease,
    transform 180ms ease;
}

.assistant-panel__close:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
}

.assistant-panel__context-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.assistant-panel__context-card {
  min-width: 0;
  min-height: 48px;
  padding: 8px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.055);
  color: rgba(245, 247, 255, 0.84);
}

.assistant-panel__context-icon {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(126, 107, 255, 0.12);
  color: rgba(227, 234, 255, 0.82);
}

.assistant-panel__context-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.assistant-panel__context-label {
  color: rgba(219, 228, 255, 0.46);
  font-size: 10px;
}

.assistant-panel__context-value {
  overflow: hidden;
  color: rgba(248, 250, 255, 0.9);
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__context-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.assistant-panel__route-pill,
.assistant-panel__mini-action {
  min-height: 28px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.055);
  color: rgba(245, 247, 255, 0.84);
  font-size: 11px;
}

.assistant-panel__mini-action {
  cursor: pointer;
  font-weight: 700;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    background 180ms ease;
}

.assistant-panel__mini-action:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.08);
}

.assistant-panel__mini-action:disabled {
  cursor: default;
  opacity: 0.56;
}

.assistant-panel__mini-action--ghost {
  color: rgba(219, 228, 255, 0.64);
}

.assistant-panel__mini-action-icon {
  width: 14px;
  height: 14px;
}

.assistant-panel__body {
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.assistant-panel__body::-webkit-scrollbar {
  width: 10px;
}

.assistant-panel__body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  background-clip: padding-box;
}

.assistant-panel__empty {
  min-height: 100%;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 6px 0 10px;
}

.assistant-panel__hero {
  position: relative;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px;
  align-items: center;
  gap: 14px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(238, 101, 221, 0.15), transparent 28%),
    radial-gradient(circle at bottom right, rgba(88, 150, 255, 0.16), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.assistant-panel__hero-eyebrow,
.assistant-panel__spotlight-label,
.assistant-panel__bubble-label {
  color: rgba(224, 231, 255, 0.5);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.assistant-panel__empty-title {
  margin: 6px 0 0;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.assistant-panel__hero-art {
  position: relative;
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
}

.assistant-panel__hero-core {
  position: relative;
  z-index: 1;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(118, 92, 255, 0.1);
  box-shadow:
    inset 0 0 0 1px rgba(177, 156, 255, 0.14),
    0 12px 24px rgba(94, 81, 204, 0.18);
}

.assistant-panel__hero-icon {
  width: 24px;
  height: 24px;
}

.assistant-panel__hero-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.assistant-panel__hero-ring--outer {
  inset: 4px;
}

.assistant-panel__hero-ring--inner {
  inset: 18px;
}

.assistant-panel__spotlight {
  padding: 10px;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.assistant-panel__spotlight-cover {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  object-fit: cover;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
    linear-gradient(135deg, rgba(243, 96, 218, 0.28), rgba(89, 151, 255, 0.28));
}

.assistant-panel__spotlight-cover img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.assistant-panel__spotlight-cover--placeholder {
  display: block;
}

.assistant-panel__spotlight-copy {
  min-width: 0;
}

.assistant-panel__spotlight-title,
.assistant-panel__spotlight-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__spotlight-title {
  margin-top: 5px;
  color: rgba(248, 250, 255, 0.96);
  font-size: 14px;
  font-weight: 700;
}

.assistant-panel__spotlight-meta {
  margin-top: 4px;
  color: rgba(220, 228, 255, 0.62);
  font-size: 11px;
}

.assistant-panel__prompt-list,
.assistant-panel__messages {
  display: grid;
  gap: 10px;
}

.assistant-panel__prompt {
  width: 100%;
  min-height: 40px;
  padding: 0 13px;
  border: 0;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.03);
  color: rgba(248, 250, 255, 0.92);
  font-size: 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background 180ms ease;
}

.assistant-panel__prompt:hover {
  transform: translateY(-1px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
    rgba(255, 255, 255, 0.05);
}

.assistant-panel__prompt-icon,
.assistant-panel__prompt-arrow {
  color: rgba(238, 244, 255, 0.92);
}

.assistant-panel__prompt-icon--spark {
  width: 18px;
  height: 18px;
}

.assistant-panel__message {
  display: flex;
  justify-content: flex-end;
}

.assistant-panel__message--assistant {
  justify-content: flex-start;
}

.assistant-panel__bubble {
  max-width: 100%;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.assistant-panel__bubble-head {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.assistant-panel__bubble-badge {
  min-height: 22px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(228, 235, 255, 0.7);
  font-size: 10px;
}

.assistant-panel__message:not(.assistant-panel__message--assistant) .assistant-panel__bubble {
  max-width: 86%;
  background:
    linear-gradient(180deg, rgba(94, 154, 255, 0.24), rgba(94, 154, 255, 0.12)),
    rgba(31, 69, 137, 0.3);
}

.assistant-panel__message--assistant .assistant-panel__bubble {
  width: min(100%, 100%);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(255, 255, 255, 0.03);
}

.assistant-panel__message--error .assistant-panel__bubble {
  background: rgba(255, 112, 148, 0.12);
  border-color: rgba(255, 162, 186, 0.16);
}

.assistant-panel__text {
  margin: 0;
  color: rgba(246, 249, 255, 0.94);
  font-size: 13px;
  line-height: 1.58;
  white-space: pre-wrap;
}

.assistant-panel__result-list {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.assistant-panel__song-card {
  padding: 9px;
  display: grid;
  grid-template-columns: 28px 48px minmax(0, 1fr);
  gap: 9px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
}

.assistant-panel__song-rank {
  color: rgba(220, 228, 255, 0.42);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  align-self: center;
}

.assistant-panel__song-cover {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
}

.assistant-panel__song-copy {
  min-width: 0;
}

.assistant-panel__song-name,
.assistant-panel__song-meta,
.assistant-panel__song-submeta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assistant-panel__song-name {
  color: rgba(248, 250, 255, 0.96);
  font-size: 12px;
  font-weight: 700;
}

.assistant-panel__song-meta {
  margin-top: 4px;
  color: rgba(220, 228, 255, 0.62);
  font-size: 11px;
}

.assistant-panel__song-submeta {
  margin-top: 4px;
  color: rgba(203, 214, 255, 0.46);
  font-size: 10px;
}

.assistant-panel__song-actions,
.assistant-panel__footer-actions,
.assistant-panel__composer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assistant-panel__song-actions {
  grid-column: 1 / -1;
  margin-top: 2px;
}

.assistant-panel__song-button,
.assistant-panel__footer-button,
.assistant-panel__composer-button {
  min-height: 32px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(94, 154, 255, 0.94), rgba(232, 90, 216, 0.92));
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.assistant-panel__song-button:hover,
.assistant-panel__footer-button:hover,
.assistant-panel__composer-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.assistant-panel__song-button--ghost,
.assistant-panel__footer-button--ghost,
.assistant-panel__composer-button--ghost {
  background: rgba(255, 255, 255, 0.08);
}

.assistant-panel__footer-actions {
  margin-top: 10px;
}

.assistant-panel__status--error {
  padding: 0 2px;
  color: #ffd4df;
}

.assistant-panel__composer {
  display: grid;
  gap: 9px;
}

.assistant-panel__composer-field {
  min-height: 84px;
  padding: 9px 11px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.assistant-panel__composer-field:focus-within {
  border-color: rgba(151, 184, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.assistant-panel__composer-input {
  width: 100%;
  min-height: 62px;
  resize: none;
  border: 0;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 13px;
  line-height: 1.55;
}

.assistant-panel__composer-input::placeholder {
  color: rgba(220, 228, 255, 0.52);
}

.assistant-panel__composer-button:disabled {
  cursor: default;
  opacity: 0.66;
}

.assistant-panel__composer-icon--spinning {
  animation: assistant-panel-spin 0.9s linear infinite;
}

.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition:
    opacity 200ms ease,
    transform 220ms ease;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

@keyframes assistant-panel-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .assistant-panel {
    top: auto;
    left: 14px;
    right: 14px;
    bottom: calc(var(--layout-player-height, 62px) + 14px);
    width: auto;
    max-height: min(72vh, 680px);
  }
}

@media (max-width: 640px) {
  .assistant-panel {
    left: 12px;
    right: 12px;
    bottom: 12px;
    top: auto;
    max-height: min(78vh, 720px);
    padding: 16px;
  }

  .assistant-panel__hero {
    grid-template-columns: 1fr;
  }

  .assistant-panel__song-card {
    grid-template-columns: 24px 44px minmax(0, 1fr);
  }

  .assistant-panel__song-cover {
    width: 44px;
    height: 44px;
  }
}
</style>
