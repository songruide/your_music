import { AI_BASE_URL, AI_ENABLE_THINKING, AI_MODEL, DASHSCOPE_API_KEY } from '../config.js'
import { fetchNcm } from './ncm.js'
import { getArtists, getArtistNames, getSongCoverUrlsByIds } from './shared.js'

const COMPLETIONS_ENDPOINT = 'chat/completions'
const MAX_HISTORY_MESSAGES = 8
const SEARCH_RESULT_LIMIT = 8
const REPLY_OPEN_TAG = '<assistant_reply>'
const REPLY_CLOSE_TAG = '</assistant_reply>'
const ACTION_OPEN_TAG = '<assistant_action>'
const ACTION_CLOSE_TAG = '</assistant_action>'
const SUPPORTED_INTENTS = new Set(['reply_only', 'search_song', 'play_song', 'enqueue_song', 'play_next'])
const MODEL_RETRY_LIMIT = 2
const MODEL_RETRY_DELAY_MS = 700
const MODEL_FAILURE_MESSAGE_LIMIT = 180

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeRouteContext(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    name: sanitizeText(value.name),
    path: sanitizeText(value.path),
    title: sanitizeText(value.title),
  }
}

function normalizeTrackContext(value) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const title = sanitizeText(value.title)

  if (!title) {
    return null
  }

  return {
    id: sanitizeText(value.id),
    title,
    artist: sanitizeText(value.artist),
    album: sanitizeText(value.album),
    duration: sanitizeText(value.duration),
  }
}

function normalizeQueueContext(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const title = sanitizeText(item.title)

      if (!title) {
        return null
      }

      return {
        id: sanitizeText(item.id),
        title,
        artist: sanitizeText(item.artist),
      }
    })
    .filter(Boolean)
    .slice(0, 6)
}

export function normalizeAssistantRequestBody(body) {
  const payload = body && typeof body === 'object' ? body : {}
  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .map((message) => {
          const role = message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : ''
          const content = sanitizeText(message?.content)

          if (!role || !content) {
            return null
          }

          return {
            role,
            content,
          }
        })
        .filter(Boolean)
        .slice(-MAX_HISTORY_MESSAGES)
    : []

  return {
    messages,
    context: {
      route: normalizeRouteContext(payload.context?.route),
      currentTrack: normalizeTrackContext(payload.context?.currentTrack),
      queue: normalizeQueueContext(payload.context?.queue),
    },
  }
}

function hasModelCredentials() {
  return Boolean(DASHSCOPE_API_KEY && AI_MODEL && AI_BASE_URL)
}

function getSafeModelBaseUrl() {
  try {
    const url = new URL(AI_BASE_URL)

    return url.origin
  } catch {
    return ''
  }
}

function getSafeErrorMessage(error) {
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'unknown error')
  const message = rawMessage.replace(/\s+/g, ' ').trim()

  return message.slice(0, MODEL_FAILURE_MESSAGE_LIMIT) || 'unknown error'
}

function getErrorStatus(error) {
  const status = Number(error?.status)

  return Number.isFinite(status) ? status : undefined
}

function isAbortError(error, signal) {
  if (signal?.aborted) {
    return true
  }

  if (error instanceof Error) {
    return error.name === 'AbortError' || /aborted/i.test(error.message)
  }

  return false
}

function createMissingCredentialsDiagnostic() {
  return {
    fallbackReason: 'missing_credentials',
    model: AI_MODEL || '',
    modelBaseUrl: getSafeModelBaseUrl(),
  }
}

function createModelFailureDiagnostic(error, stage) {
  return {
    fallbackReason: 'model_error',
    model: AI_MODEL || '',
    modelBaseUrl: getSafeModelBaseUrl(),
    modelError: getSafeErrorMessage(error),
    modelStage: stage,
    modelStatus: getErrorStatus(error),
  }
}

function logModelFailure(error, stage) {
  if (isAbortError(error)) {
    return
  }

  const diagnostic = createModelFailureDiagnostic(error, stage)

  console.warn('[ai] model request failed; using local fallback', diagnostic)
}

function buildSystemPrompt(context) {
  const routeLabel = context.route?.title || context.route?.name || context.route?.path || 'unknown'
  const currentTrackLabel = context.currentTrack
    ? `${context.currentTrack.title} - ${context.currentTrack.artist || '未知歌手'}`
    : '无'
  const queueLabel = context.queue.length
    ? context.queue.map((item, index) => `${index + 1}. ${item.title} - ${item.artist || '未知歌手'}`).join(' | ')
    : '空队列'

  return [
    '你是 Your Music 应用里的 AI 音乐助手，只负责帮助用户找歌、播歌、切歌和解释结果。',
    '输出必须严格遵守以下结构，不能添加 markdown、代码块或额外说明：',
    `${REPLY_OPEN_TAG}给用户的简短中文回复，控制在 60 字以内${REPLY_CLOSE_TAG}`,
    `${ACTION_OPEN_TAG}{"intent":"reply_only|search_song|play_song|enqueue_song|play_next","query":"当需要搜索歌曲时给出简短搜索词","selectedIndex":0}${ACTION_CLOSE_TAG}`,
    '规则：',
    '1. 不要虚构 song id、artist id、album id。',
    '2. 只有在用户明确要立即播放时才用 play_song。',
    '3. 只有在用户明确要加入下一首或稍后播放时才用 enqueue_song。',
    '4. 只有在用户明确说下一首、切歌、skip 时才用 play_next。',
    '5. 需要搜索或推荐但不立刻播放时，用 search_song。',
    '6. 如果只是闲聊、解释或无法判断动作，用 reply_only。',
    '7. query 必须是简短检索词，不要整句复述用户原话。',
    `当前页面: ${routeLabel}`,
    `当前播放: ${currentTrackLabel}`,
    `当前队列: ${queueLabel}`,
  ].join('\n')
}

function buildModelMessages(messages, context) {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(context),
    },
    ...messages,
  ]
}

function createTaggedResponse(reply, action) {
  return `${REPLY_OPEN_TAG}${reply}${REPLY_CLOSE_TAG}${ACTION_OPEN_TAG}${JSON.stringify(action)}${ACTION_CLOSE_TAG}`
}

function deriveQueryFromText(input, context) {
  let query = input
  const replacements = [
    '帮我',
    '请',
    '一下',
    '可以吗',
    '可以',
    '想听',
    '我想听',
    '适合听',
    '适合',
    '听点',
    '听',
    '来点',
    '来一首',
    '来首',
    '一首',
    '播放',
    '播一下',
    '播一首',
    '播首',
    '搜一下',
    '搜索',
    '搜',
    '找一下',
    '找',
    '推荐',
    '歌曲',
    '歌手',
    '音乐',
    '给我',
    '下一首',
    '切歌',
    '类似',
    '这种',
    '这首',
    '首',
    '歌',
    '的',
  ]

  for (const phrase of replacements) {
    query = query.replaceAll(phrase, ' ')
  }

  query = query.replace(/[，。！？,.!?/]/g, ' ').replace(/\s+/g, ' ').trim()

  if (!query && context.currentTrack?.title) {
    return context.currentTrack.title
  }

  if (!query && context.currentTrack?.artist) {
    return context.currentTrack.artist
  }

  return query || input.trim()
}

function createFallbackTaggedResponse(messages, context) {
  const latestUserMessage = sanitizeText(messages.at(-1)?.content)

  if (!latestUserMessage) {
    return createTaggedResponse('我在，告诉我你想听什么。', {
      intent: 'reply_only',
    })
  }

  const normalized = latestUserMessage.toLowerCase()
  const query = deriveQueryFromText(latestUserMessage, context)
  const isPlayIntent =
    latestUserMessage.includes('播放') ||
    latestUserMessage.includes('播一首') ||
    latestUserMessage.includes('来一首') ||
    latestUserMessage.includes('来首')
  const isSearchIntent =
    latestUserMessage.includes('找') ||
    latestUserMessage.includes('搜') ||
    latestUserMessage.includes('推荐') ||
    latestUserMessage.includes('来点') ||
    latestUserMessage.includes('想听') ||
    latestUserMessage.includes('听点') ||
    latestUserMessage.includes('适合听') ||
    latestUserMessage.includes('类似')

  if (normalized.includes('下一首') || normalized.includes('切歌') || normalized.includes('skip') || normalized.includes('next')) {
    return createTaggedResponse('收到，帮你切到下一首。', {
      intent: 'play_next',
    })
  }

  if (
    latestUserMessage.includes('加入下一首') ||
    latestUserMessage.includes('下一首播放') ||
    latestUserMessage.includes('稍后播放') ||
    latestUserMessage.includes('排到下一首')
  ) {
    return createTaggedResponse(`我先按“${query}”帮你找，找到后加入下一首。`, {
      intent: 'enqueue_song',
      query,
      selectedIndex: 0,
    })
  }

  if (isPlayIntent) {
    return createTaggedResponse(`我先按“${query}”帮你找，找到后直接播放。`, {
      intent: 'play_song',
      query,
      selectedIndex: 0,
    })
  }

  if (isSearchIntent) {
    return createTaggedResponse(`好，按“${query}”给你找几首更贴近现在氛围的歌。`, {
      intent: 'search_song',
      query,
      selectedIndex: 0,
    })
  }

  return createTaggedResponse('我可以帮你找歌、播歌、加到下一首，直接说需求就行。', {
    intent: 'reply_only',
  })
}

function coerceModelText(content) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (typeof item?.text === 'string') {
          return item.text
        }

        return ''
      })
      .join('')
  }

  if (typeof content?.text === 'string') {
    return content.text
  }

  return ''
}

function buildCompletionsRequest(messages, context, stream) {
  const body = {
    model: AI_MODEL,
    messages: buildModelMessages(messages, context),
    stream,
    temperature: 0.4,
  }

  if (AI_ENABLE_THINKING) {
    body.enable_thinking = true
  }

  return body
}

function buildModelUrl(endpoint) {
  const baseURL = AI_BASE_URL.endsWith('/') ? AI_BASE_URL : `${AI_BASE_URL}/`

  return new URL(endpoint, baseURL)
}

function shouldRetryModelRequest(status, responseText) {
  if (status === 429) {
    return true
  }

  if (status >= 500 && /too many requests|throttl|capacity/i.test(responseText)) {
    return true
  }

  return false
}

async function waitForRetry(signal, delayMs) {
  await new Promise((resolve, reject) => {
    let settled = false
    let handleAbort = null
    const timer = setTimeout(() => {
      settled = true

      if (signal && handleAbort) {
        signal.removeEventListener('abort', handleAbort)
      }

      resolve()
    }, delayMs)

    if (!signal) {
      return
    }

    handleAbort = () => {
      if (settled) {
        return
      }

      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', handleAbort)
      reject(new Error('AI stream aborted'))
    }

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

async function requestModelResponse(messages, context, stream, signal) {
  let lastError = null

  for (let attempt = 0; attempt < MODEL_RETRY_LIMIT; attempt += 1) {
    const response = await fetch(buildModelUrl(COMPLETIONS_ENDPOINT), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildCompletionsRequest(messages, context, stream)),
      signal,
    })

    if (response.ok) {
      return response
    }

    const responseText = await response.text()
    const shouldRetry = shouldRetryModelRequest(response.status, responseText)

    lastError = new Error(`AI request failed: ${response.status}`)
    lastError.status = response.status

    if (!shouldRetry || attempt >= MODEL_RETRY_LIMIT - 1) {
      throw lastError
    }

    await waitForRetry(signal, MODEL_RETRY_DELAY_MS * (attempt + 1))
  }

  throw lastError ?? new Error('AI request failed')
}

async function callModelCompletion(messages, context, signal) {
  const response = await requestModelResponse(messages, context, false, signal)
  const payload = await response.json()
  const message = payload?.choices?.[0]?.message ?? {}
  const rawText = coerceModelText(message.content)

  if (!rawText) {
    throw new Error('AI returned an empty response')
  }

  return rawText
}

async function consumeModelStream(response, onChunk, signal) {
  if (!response.body) {
    throw new Error('AI stream body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    if (signal?.aborted) {
      await reader.cancel()
      throw new Error('AI stream aborted')
    }

    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const eventBlock of events) {
      const dataLines = eventBlock
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())

      if (dataLines.length === 0) {
        continue
      }

      for (const rawData of dataLines) {
        if (rawData === '[DONE]') {
          return
        }

        let payload

        try {
          payload = JSON.parse(rawData)
        } catch {
          continue
        }

        const delta = payload?.choices?.[0]?.delta ?? {}
        const content = coerceModelText(delta.content)

        if (content) {
          onChunk(content)
        }
      }
    }
  }
}

async function streamModelCompletion(messages, context, signal, onChunk) {
  const response = await requestModelResponse(messages, context, true, signal)
  let fullText = ''

  await consumeModelStream(
    response,
    (chunk) => {
      fullText += chunk
      onChunk(fullText)
    },
    signal,
  )

  return fullText
}

function extractTagContent(sourceText, openTag, closeTag) {
  const openIndex = sourceText.indexOf(openTag)

  if (openIndex < 0) {
    return ''
  }

  const contentStart = openIndex + openTag.length
  const closeIndex = sourceText.indexOf(closeTag, contentStart)

  if (closeIndex < 0) {
    return sourceText.slice(contentStart)
  }

  return sourceText.slice(contentStart, closeIndex)
}

function extractPartialReplyText(rawText) {
  return extractTagContent(rawText, REPLY_OPEN_TAG, REPLY_CLOSE_TAG).replace(/<[^>]*$/g, '')
}

function parseTaggedAssistantResponse(rawText, fallbackInput, context) {
  const reply = sanitizeText(extractTagContent(rawText, REPLY_OPEN_TAG, REPLY_CLOSE_TAG))
  const actionText = extractTagContent(rawText, ACTION_OPEN_TAG, ACTION_CLOSE_TAG)

  if (!reply || !actionText) {
    return parseTaggedAssistantResponse(
      createFallbackTaggedResponse([{ role: 'user', content: fallbackInput }], context),
      fallbackInput,
      context,
    )
  }

  let action = null

  try {
    action = JSON.parse(actionText)
  } catch {
    action = null
  }

  const intent = SUPPORTED_INTENTS.has(action?.intent) ? action.intent : 'reply_only'
  const query = sanitizeText(action?.query)
  const selectedIndex = Number.isFinite(action?.selectedIndex) ? Number(action.selectedIndex) : 0

  return {
    reply,
    action: {
      intent,
      query,
      selectedIndex,
    },
  }
}

async function searchSongsByKeyword(query) {
  const payload = await fetchNcm('/search', {
    keywords: query,
    limit: SEARCH_RESULT_LIMIT,
    offset: 0,
    type: 1,
  })

  const songs = (payload.result?.songs ?? []).map((item) => ({
    id: String(item.id),
    name: item.name ?? '',
    coverUrl: item.album?.picUrl ?? item.al?.picUrl ?? '',
    artists: getArtists(item.artists ?? item.ar),
    artistNames: getArtistNames(item.artists ?? item.ar),
    albumId: String(item.album?.id ?? item.al?.id ?? '').trim() || undefined,
    albumName: item.album?.name ?? item.al?.name ?? '未知专辑',
    duration: item.duration ?? item.dt,
    playable: true,
  }))
  const missingCoverSongIds = songs.filter((song) => !song.coverUrl).map((song) => song.id)

  if (missingCoverSongIds.length > 0) {
    const coverUrlMap = await getSongCoverUrlsByIds(missingCoverSongIds)

    for (const song of songs) {
      if (!song.coverUrl) {
        song.coverUrl = coverUrlMap.get(song.id) ?? ''
      }
    }
  }

  return songs
}

function buildReplyOnlyPayload(reply) {
  return {
    reply: reply || '我可以帮你找歌、播歌、加到下一首，直接说需求就行。',
    action: {
      intent: 'reply_only',
      query: '',
      selectedIndex: 0,
      songs: [],
    },
  }
}

async function resolveActionResult(parsed, fallbackInput, context) {
  const intent = SUPPORTED_INTENTS.has(parsed.action.intent) ? parsed.action.intent : 'reply_only'
  const query = sanitizeText(parsed.action.query) || deriveQueryFromText(fallbackInput, context)
  const selectedIndex = Number.isFinite(parsed.action.selectedIndex) ? Number(parsed.action.selectedIndex) : 0

  if (intent === 'reply_only' || intent === 'play_next') {
    return {
      reply: parsed.reply,
      action: {
        intent,
        query: '',
        selectedIndex: 0,
        songs: [],
      },
    }
  }

  if (!query) {
    return buildReplyOnlyPayload(parsed.reply)
  }

  const songs = await searchSongsByKeyword(query)
  const resolvedQuery = query

  if (songs.length === 0) {
    return {
      reply: parsed.reply || `我按“${resolvedQuery}”找了一下，暂时没找到合适结果。`,
      action: {
        intent: 'search_song',
        query: resolvedQuery,
        selectedIndex: 0,
        songs: [],
      },
    }
  }

  return {
    reply: parsed.reply,
    action: {
      intent,
      query: resolvedQuery,
      selectedIndex: clampIndex(selectedIndex, songs.length),
      songs,
    },
  }
}

function clampIndex(index, length) {
  if (!Number.isFinite(index) || index < 0) {
    return 0
  }

  if (length <= 0) {
    return 0
  }

  return Math.min(Math.floor(index), length - 1)
}

function chunkText(value, size = 24) {
  const text = sanitizeText(value)

  if (!text) {
    return []
  }

  const chunks = []

  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size))
  }

  return chunks
}

function buildFallbackReply(messages, context) {
  return createFallbackTaggedResponse(messages, context)
}

async function buildResolvedPayload(rawText, fallbackInput, source, context, diagnostics) {
  const parsed = parseTaggedAssistantResponse(rawText, fallbackInput, context)
  const resolved = await resolveActionResult(parsed, fallbackInput, context)

  return {
    reply: resolved.reply,
    action: resolved.action,
    diagnostics,
    source,
    usedModel: source === 'model',
  }
}

export async function chatWithAssistant({ messages, context, signal }) {
  const fallbackInput = sanitizeText(messages.at(-1)?.content)

  if (!messages.length) {
    return {
      reply: '我在，告诉我你想听什么。',
      action: {
        intent: 'reply_only',
        query: '',
        selectedIndex: 0,
        songs: [],
      },
      source: 'fallback',
      usedModel: false,
    }
  }

  let diagnostics = null

  if (hasModelCredentials()) {
    try {
      const rawText = await callModelCompletion(messages, context, signal)
      return await buildResolvedPayload(rawText, fallbackInput, 'model', context)
    } catch (error) {
      if (isAbortError(error, signal)) {
        throw error
      }

      logModelFailure(error, 'completion')
      diagnostics = createModelFailureDiagnostic(error, 'completion')
    }
  } else {
    diagnostics = createMissingCredentialsDiagnostic()
  }

  const fallbackText = buildFallbackReply(messages, context)
  return await buildResolvedPayload(fallbackText, fallbackInput, 'fallback', context, diagnostics)
}

export async function streamAssistantConversation({ messages, context, signal, onReplyDelta }) {
  const fallbackInput = sanitizeText(messages.at(-1)?.content)

  if (!messages.length) {
    const reply = '我在，告诉我你想听什么。'

    if (onReplyDelta) {
      onReplyDelta(reply)
    }

    return {
      reply,
      action: {
        intent: 'reply_only',
        query: '',
        selectedIndex: 0,
        songs: [],
      },
      source: 'fallback',
      usedModel: false,
    }
  }

  let diagnostics = null

  if (hasModelCredentials()) {
    try {
      let streamedLength = 0
      const rawText = await streamModelCompletion(messages, context, signal, (fullText) => {
        const partialReply = extractPartialReplyText(fullText)

        if (!partialReply || partialReply.length <= streamedLength) {
          return
        }

        const nextText = partialReply.slice(streamedLength)
        streamedLength = partialReply.length
        onReplyDelta?.(nextText)
      })
      const payload = await buildResolvedPayload(rawText, fallbackInput, 'model', context)
      const remainingReply = payload.reply.slice(streamedLength)

      if (remainingReply) {
        onReplyDelta?.(remainingReply)
      }

      return payload
    } catch (error) {
      if (isAbortError(error, signal)) {
        throw error
      }

      logModelFailure(error, 'stream')
      diagnostics = createModelFailureDiagnostic(error, 'stream')

      try {
        const rawText = await callModelCompletion(messages, context, signal)
        const payload = await buildResolvedPayload(rawText, fallbackInput, 'model', context)

        for (const textChunk of chunkText(payload.reply)) {
          onReplyDelta?.(textChunk)
        }

        return payload
      } catch (completionError) {
        if (isAbortError(completionError, signal)) {
          throw completionError
        }

        logModelFailure(completionError, 'stream-fallback-completion')
        diagnostics = createModelFailureDiagnostic(completionError, 'stream-fallback-completion')
      }
    }
  } else {
    diagnostics = createMissingCredentialsDiagnostic()
  }

  const fallbackText = buildFallbackReply(messages, context)
  const fallbackPayload = await buildResolvedPayload(fallbackText, fallbackInput, 'fallback', context, diagnostics)

  for (const textChunk of chunkText(fallbackPayload.reply)) {
    onReplyDelta?.(textChunk)
  }

  return fallbackPayload
}
