import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { requestAssistantReply, streamAssistantReply } from '@/api/ai'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { useSettingsStore } from '@/stores/settings'
import type {
  AssistantActionPayload,
  AssistantConversationContext,
  AssistantDiagnostics,
  AssistantRequestPayload,
  AssistantResponsePayload,
  AssistantRouteContext,
  AssistantSongResult,
  AssistantTransportMessage,
} from '@/types/ai'
import { buildPlayerTrack } from '@/utils/playerTrack'

const CONVERSATION_HISTORY_LIMIT = 8
const ASSISTANT_HISTORY_LIMIT = 80
const ASSISTANT_STORAGE_KEY = 'your-music:assistant-history:v1'
const ASSISTANT_STORAGE_VERSION = 1
const GUEST_USER_KEY = 'guest'
const MAX_STORED_ACTION_SONGS = 12

export interface AssistantUiMessage {
  action?: AssistantActionPayload
  createdAt: number
  diagnostics?: AssistantDiagnostics | null
  id: string
  role: 'user' | 'assistant'
  source?: 'model' | 'fallback'
  status: 'done' | 'error' | 'streaming'
  text: string
  usedModel?: boolean
}

interface AssistantHistorySnapshot {
  messages: AssistantUiMessage[]
  updatedAt: number
}

interface AssistantStoragePayload {
  users: Record<string, AssistantHistorySnapshot>
  version: number
}

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function mapSongToPlayerTrack(song: AssistantSongResult) {
  return buildPlayerTrack({
    id: song.id,
    title: song.name,
    artists: song.artists,
    artistNames: song.artistNames,
    albumId: song.albumId,
    albumName: song.albumName,
    coverUrl: song.coverUrl,
    durationMs: song.duration,
  })
}

function clampIndex(index: number | undefined, length: number) {
  if (length <= 0) {
    return 0
  }

  if (!Number.isFinite(index) || Number(index) < 0) {
    return 0
  }

  return Math.min(Math.floor(Number(index)), length - 1)
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
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

function sanitizeText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function sanitizeOptionalText(value: unknown) {
  const text = sanitizeText(value).trim()

  return text || undefined
}

function sanitizeNumber(value: unknown) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : undefined
}

function normalizeStoredSong(value: unknown): AssistantSongResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const song = value as Partial<AssistantSongResult>
  const id = sanitizeText(song.id).trim()
  const name = sanitizeText(song.name).trim()

  if (!id || !name) {
    return null
  }

  const artists = Array.isArray(song.artists)
    ? song.artists
        .map((artist) => {
          if (!artist || typeof artist !== 'object') {
            return null
          }

          const artistName = sanitizeText((artist as { name?: unknown }).name).trim()

          if (!artistName) {
            return null
          }

          return {
            id: sanitizeText((artist as { id?: unknown }).id).trim(),
            name: artistName,
          }
        })
        .filter((artist): artist is { id: string; name: string } => Boolean(artist))
    : []

  const artistNames = Array.isArray(song.artistNames)
    ? song.artistNames.map((artistName) => sanitizeText(artistName).trim()).filter(Boolean)
    : artists.map((artist) => artist.name)

  return {
    id,
    name,
    artists,
    artistNames,
    albumId: sanitizeOptionalText(song.albumId),
    albumName: sanitizeText(song.albumName).trim() || '单曲',
    coverUrl: sanitizeText(song.coverUrl),
    duration: sanitizeNumber(song.duration),
    playable: typeof song.playable === 'boolean' ? song.playable : undefined,
  }
}

function normalizeStoredAction(value: unknown): AssistantActionPayload | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const action = value as Partial<AssistantActionPayload>
  const intent = action.intent
  const safeIntent =
    intent === 'search_song' ||
    intent === 'play_song' ||
    intent === 'enqueue_song' ||
    intent === 'play_next' ||
    intent === 'reply_only'
      ? intent
      : 'reply_only'

  return {
    intent: safeIntent,
    query: sanitizeOptionalText(action.query),
    selectedIndex: sanitizeNumber(action.selectedIndex),
    songs: Array.isArray(action.songs)
      ? action.songs
          .map((song) => normalizeStoredSong(song))
          .filter((song): song is AssistantSongResult => Boolean(song))
          .slice(0, MAX_STORED_ACTION_SONGS)
      : [],
  }
}

function normalizeStoredDiagnostics(value: unknown): AssistantDiagnostics | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const diagnostics = value as Partial<AssistantDiagnostics>
  const fallbackReason =
    diagnostics.fallbackReason === 'missing_credentials' || diagnostics.fallbackReason === 'model_error'
      ? diagnostics.fallbackReason
      : undefined

  if (!fallbackReason) {
    return null
  }

  return {
    fallbackReason,
    model: sanitizeOptionalText(diagnostics.model),
    modelBaseUrl: sanitizeOptionalText(diagnostics.modelBaseUrl),
    modelError: sanitizeOptionalText(diagnostics.modelError),
    modelStage: sanitizeOptionalText(diagnostics.modelStage),
    modelStatus: sanitizeNumber(diagnostics.modelStatus),
  }
}

function normalizeStoredMessage(value: unknown): AssistantUiMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const message = value as Partial<AssistantUiMessage>
  const id = sanitizeText(message.id).trim()
  const role = message.role

  if (!id || (role !== 'user' && role !== 'assistant')) {
    return null
  }

  const status = message.status === 'error' ? 'error' : 'done'
  const source = message.source === 'model' || message.source === 'fallback' ? message.source : undefined
  const createdAt = sanitizeNumber(message.createdAt) ?? Date.now()

  return {
    action: normalizeStoredAction(message.action),
    createdAt,
    diagnostics: normalizeStoredDiagnostics(message.diagnostics),
    id,
    role,
    source,
    status,
    text: sanitizeText(message.text),
    usedModel: typeof message.usedModel === 'boolean' ? message.usedModel : undefined,
  }
}

function normalizeMessageList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((message) => normalizeStoredMessage(message))
    .filter((message): message is AssistantUiMessage => Boolean(message))
    .slice(-ASSISTANT_HISTORY_LIMIT)
}

function normalizeSnapshot(value: unknown): AssistantHistorySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      messages: [],
      updatedAt: 0,
    }
  }

  const snapshot = value as Partial<AssistantHistorySnapshot>

  return {
    messages: normalizeMessageList(snapshot.messages),
    updatedAt: sanitizeNumber(snapshot.updatedAt) ?? 0,
  }
}

function normalizeUserSnapshots(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([userKey]) => Boolean(userKey))
      .map(([userKey, snapshot]) => [userKey, normalizeSnapshot(snapshot)]),
  )
}

function normalizePayload(value: unknown): AssistantStoragePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      users: {},
      version: ASSISTANT_STORAGE_VERSION,
    }
  }

  const payload = value as Partial<AssistantStoragePayload>

  return {
    users: normalizeUserSnapshots(payload.users),
    version: ASSISTANT_STORAGE_VERSION,
  }
}

function getPersistableMessages(sourceMessages: AssistantUiMessage[]) {
  return normalizeMessageList(sourceMessages.filter((message) => message.status !== 'streaming'))
}

export const useAssistantStore = defineStore('assistant', () => {
  const authStore = useAuthStore()
  const playerStore = usePlayerStore()
  const settingsStore = useSettingsStore()
  const payload = ref<AssistantStoragePayload>(normalizePayload(readJson(ASSISTANT_STORAGE_KEY, {})))
  const error = ref('')
  const isPanelOpen = ref(false)
  const isSending = ref(false)
  const messages = ref<AssistantUiMessage[]>([])
  let activeAbortController: AbortController | null = null

  const hasMessages = computed(() => messages.value.length > 0)
  const isAssistantEnabled = computed(() => settingsStore.isAssistantEnabled)
  const isSmartRecommendEnabled = computed(() => settingsStore.toggles.aiSmartRecommend)
  const currentUserKey = computed(() => {
    if (authStore.loggedIn && authStore.profile?.userId) {
      return `user:${authStore.profile.userId}`
    }

    return GUEST_USER_KEY
  })

  function writePayload(nextPayload: AssistantStoragePayload) {
    payload.value = {
      users: nextPayload.users,
      version: ASSISTANT_STORAGE_VERSION,
    }

    writeJson(ASSISTANT_STORAGE_KEY, payload.value)
  }

  function persistHistoryForUser(userKey: string, sourceMessages = messages.value) {
    writePayload({
      users: {
        ...payload.value.users,
        [userKey]: {
          messages: getPersistableMessages(sourceMessages),
          updatedAt: Date.now(),
        },
      },
      version: ASSISTANT_STORAGE_VERSION,
    })
  }

  function persistCurrentHistory(sourceMessages = messages.value) {
    persistHistoryForUser(currentUserKey.value, sourceMessages)
  }

  function loadHistoryForUser(userKey: string) {
    const snapshot = normalizeSnapshot(payload.value.users[userKey])

    messages.value = snapshot.messages
    error.value = ''
  }

  function openPanel() {
    if (!isAssistantEnabled.value) {
      error.value = 'AI 助手已在设置中关闭'
      return
    }

    isPanelOpen.value = true
  }

  function closePanel() {
    isPanelOpen.value = false
  }

  function togglePanel() {
    if (!isPanelOpen.value && !isAssistantEnabled.value) {
      error.value = 'AI 助手已在设置中关闭'
      return
    }

    isPanelOpen.value = !isPanelOpen.value
  }

  function clearMessages() {
    messages.value = []
    error.value = ''
    persistCurrentHistory()
  }

  function buildConversationMessages(nextUserText: string): AssistantTransportMessage[] {
    const recentMessages = messages.value
      .filter((message) => message.text.trim() && (message.role === 'user' || message.role === 'assistant'))
      .slice(-CONVERSATION_HISTORY_LIMIT)
      .map<AssistantTransportMessage>((message) => ({
        role: message.role,
        content: message.text.trim(),
      }))

    return [
      ...recentMessages,
      {
        role: 'user',
        content: nextUserText,
      },
    ]
  }

  function buildContextSnapshot(routeContext: AssistantRouteContext): AssistantConversationContext {
    return {
      route: routeContext,
      currentTrack: playerStore.currentTrack
        ? {
            id: playerStore.currentTrack.id,
            title: playerStore.currentTrack.title,
            artist: playerStore.currentTrack.artist,
            album: playerStore.currentTrack.album,
            duration: playerStore.currentTrack.duration,
          }
        : null,
      queue: playerStore.queue.slice(0, 6).map((item) => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
      })),
    }
  }

  function buildRequestPayload(text: string, routeContext: AssistantRouteContext): AssistantRequestPayload {
    return {
      messages: buildConversationMessages(text),
      context: buildContextSnapshot(routeContext),
    }
  }

  function appendAssistantText(messageId: string, text: string) {
    const targetMessage = messages.value.find((message) => message.id === messageId)

    if (!targetMessage || !text) {
      return
    }

    targetMessage.text += text
  }

  function finalizeAssistantMessage(messageId: string, payloadValue: AssistantResponsePayload) {
    const targetMessage = messages.value.find((message) => message.id === messageId)

    if (!targetMessage) {
      return
    }

    targetMessage.action = payloadValue.action
    targetMessage.diagnostics = payloadValue.diagnostics
    targetMessage.source = payloadValue.source
    targetMessage.status = 'done'
    targetMessage.text = payloadValue.reply
    targetMessage.usedModel = payloadValue.usedModel
    persistCurrentHistory()
  }

  function markAssistantMessageError(messageId: string, message: string) {
    const targetMessage = messages.value.find((item) => item.id === messageId)

    if (!targetMessage) {
      return
    }

    targetMessage.status = 'error'
    targetMessage.text = targetMessage.text.trim() || message
    persistCurrentHistory()
  }

  async function executeResolvedAction(action: AssistantActionPayload) {
    const songs = action.songs ?? []
    const selectedIndex = clampIndex(action.selectedIndex, songs.length)

    if (action.intent === 'play_song' && songs.length > 0) {
      await playerStore.playQueue(songs.map(mapSongToPlayerTrack), selectedIndex)
      return
    }

    if (action.intent === 'enqueue_song' && songs.length > 0) {
      await playerStore.enqueueNextTrack(mapSongToPlayerTrack(songs[selectedIndex]))
      return
    }

    if (action.intent === 'play_next') {
      await playerStore.playNextTrack()
    }
  }

  async function safelyExecuteResolvedAction(action: AssistantActionPayload) {
    try {
      await executeResolvedAction(action)
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : '执行播放动作失败'
      error.value = `AI 已返回结果，但执行播放器动作失败：${detail}`
    }
  }

  async function sendMessage(text: string, routeContext: AssistantRouteContext) {
    const content = text.trim()

    if (!content || isSending.value) {
      return
    }

    if (!isAssistantEnabled.value) {
      error.value = 'AI 助手已在设置中关闭'
      return
    }

    error.value = ''
    openPanel()

    const userMessageId = createMessageId()
    const assistantMessageId = createMessageId()
    const requestPayload = buildRequestPayload(content, routeContext)

    messages.value.push(
      {
        createdAt: Date.now(),
        id: userMessageId,
        role: 'user',
        status: 'done',
        text: content,
      },
      {
        createdAt: Date.now(),
        id: assistantMessageId,
        role: 'assistant',
        status: 'streaming',
        text: '',
      },
    )
    persistCurrentHistory()

    isSending.value = true
    activeAbortController = new AbortController()
    let finalPayload: AssistantResponsePayload | null = null

    try {
      try {
        await streamAssistantReply(
          requestPayload,
          {
            onError(message) {
              throw new Error(message)
            },
            onResult(payloadValue) {
              finalPayload = payloadValue
            },
            onTextDelta(textDelta) {
              appendAssistantText(assistantMessageId, textDelta)
            },
          },
          activeAbortController.signal,
        )
      } catch {
        finalPayload = await requestAssistantReply(requestPayload, activeAbortController.signal)
      }

      if (!finalPayload) {
        throw new Error('AI 助手没有返回可用结果')
      }

      finalizeAssistantMessage(assistantMessageId, finalPayload)
      await safelyExecuteResolvedAction(finalPayload.action)
    } catch (reason) {
      const safeMessage =
        activeAbortController?.signal.aborted
          ? '本次 AI 响应已停止'
          : reason instanceof Error
            ? reason.message
            : 'AI 助手暂时不可用'

      error.value = safeMessage
      markAssistantMessageError(assistantMessageId, safeMessage)
    } finally {
      isSending.value = false
      activeAbortController = null
    }
  }

  function stopCurrentResponse() {
    if (!activeAbortController) {
      return
    }

    activeAbortController.abort()
  }

  async function playResolvedSong(songs: AssistantSongResult[], index = 0) {
    if (!songs.length) {
      return
    }

    await playerStore.playQueue(songs.map(mapSongToPlayerTrack), clampIndex(index, songs.length))
  }

  async function enqueueResolvedSong(song: AssistantSongResult) {
    if (!song?.id) {
      return
    }

    await playerStore.enqueueNextTrack(mapSongToPlayerTrack(song))
  }

  watch(
    currentUserKey,
    (nextUserKey, previousUserKey) => {
      if (previousUserKey) {
        persistHistoryForUser(previousUserKey)
      }

      loadHistoryForUser(nextUserKey)
    },
    { immediate: true },
  )

  watch(
    isAssistantEnabled,
    (enabled) => {
      if (enabled) {
        if (error.value === 'AI 助手已在设置中关闭') {
          error.value = ''
        }

        return
      }

      stopCurrentResponse()
      isPanelOpen.value = false
      error.value = 'AI 助手已在设置中关闭'
    },
  )

  return {
    clearMessages,
    closePanel,
    currentUserKey,
    enqueueResolvedSong,
    error,
    hasMessages,
    isAssistantEnabled,
    isPanelOpen,
    isSending,
    isSmartRecommendEnabled,
    messages,
    openPanel,
    playResolvedSong,
    sendMessage,
    stopCurrentResponse,
    togglePanel,
  }
})
