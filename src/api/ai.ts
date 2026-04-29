import { request } from '@/utils/request'
import type { AssistantRequestPayload, AssistantResponsePayload } from '@/types/ai'

interface AssistantStreamHandlers {
  onError?: (message: string) => void
  onResult?: (payload: AssistantResponsePayload) => void
  onTextDelta?: (text: string) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''

function buildApiUrl(path: string) {
  const url = new URL(path, API_BASE_URL || window.location.origin)

  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()

  if (!rawText) {
    return `Request failed with status ${response.status}`
  }

  if (contentType.includes('application/json')) {
    try {
      const payload = JSON.parse(rawText) as { message?: string }

      return payload.message || `Request failed with status ${response.status}`
    } catch {
      return `Request failed with status ${response.status}`
    }
  }

  return rawText.trim() || `Request failed with status ${response.status}`
}

function processSseBlock(block: string, handlers: AssistantStreamHandlers) {
  const dataLines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())

  if (dataLines.length === 0) {
    return false
  }

  for (const rawLine of dataLines) {
    if (!rawLine || rawLine === '[DONE]') {
      continue
    }

    let payload

    try {
      payload = JSON.parse(rawLine) as
        | { message?: string; payload?: AssistantResponsePayload; text?: string; type?: string }
        | undefined
    } catch {
      continue
    }

    if (!payload?.type) {
      continue
    }

    if (payload.type === 'text-delta' && payload.text) {
      handlers.onTextDelta?.(payload.text)
      continue
    }

    if (payload.type === 'result' && payload.payload) {
      handlers.onResult?.(payload.payload)
      continue
    }

    if (payload.type === 'error' && payload.message) {
      handlers.onError?.(payload.message)
      throw new Error(payload.message)
    }
  }

  return block.includes('"type":"done"')
}

export function requestAssistantReply(payload: AssistantRequestPayload, signal?: AbortSignal) {
  return request<AssistantResponsePayload>('/api/ai/chat', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
    signal,
  })
}

export async function streamAssistantReply(
  payload: AssistantRequestPayload,
  handlers: AssistantStreamHandlers,
  signal?: AbortSignal,
) {
  const response = await fetch(buildApiUrl('/api/ai/stream'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  if (!response.body) {
    throw new Error('assistant stream body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      if (processSseBlock(block, handlers)) {
        return
      }
    }
  }

  const finalBlock = decoder.decode()

  if (finalBlock) {
    buffer += finalBlock
  }

  if (buffer.trim()) {
    processSseBlock(buffer, handlers)
  }
}
