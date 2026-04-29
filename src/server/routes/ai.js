import express from 'express'
import { chatWithAssistant, normalizeAssistantRequestBody, streamAssistantConversation } from '../services/ai.js'
import { createRouteHandler, HttpError, sendError, sendOk } from '../utils/http.js'

const router = express.Router()

function getAssistantPayload(req) {
  const payload = normalizeAssistantRequestBody(req.body)

  if (payload.messages.length === 0) {
    throw new HttpError(400, 'assistant message is required')
  }

  return payload
}

function writeSseEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

router.post('/api/ai/chat', createRouteHandler(async (req, res) => {
  const payload = getAssistantPayload(req)
  const data = await chatWithAssistant(payload)

  sendOk(res, data)
}))

router.post('/api/ai/stream', async (req, res) => {
  const abortController = new AbortController()
  let connectionClosed = false
  let responseCompleted = false

  const cleanup = () => {
    if (responseCompleted) {
      return
    }

    connectionClosed = true
    abortController.abort()
  }

  res.on('close', cleanup)

  try {
    const payload = getAssistantPayload(req)

    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    writeSseEvent(res, { type: 'ready' })

    const result = await streamAssistantConversation({
      ...payload,
      signal: abortController.signal,
      onReplyDelta(text) {
        if (!connectionClosed && text) {
          writeSseEvent(res, {
            type: 'text-delta',
            text,
          })
        }
      },
    })

    if (!connectionClosed) {
      writeSseEvent(res, {
        type: 'result',
        payload: result,
      })
      writeSseEvent(res, { type: 'done' })
      responseCompleted = true
      res.end()
    }
  } catch (error) {
    if (!res.headersSent) {
      sendError(res, error)
      return
    }

    if (!connectionClosed) {
      writeSseEvent(res, {
        type: 'error',
        message: error instanceof Error ? error.message : 'assistant stream failed',
      })
      responseCompleted = true
      res.end()
    }
  } finally {
    res.off('close', cleanup)
  }
})

export default router
