export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function ok(data) {
  return {
    code: 200,
    data,
    message: 'ok',
  }
}

export function sendOk(res, data) {
  res.json(ok(data))
}

export function sendError(res, error) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      code: error.status,
      data: null,
      message: error.message,
    })
    return
  }

  res.status(500).json({
    code: 500,
    data: null,
    message: error instanceof Error ? error.message : 'server error',
  })
}

export function createRouteHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      sendError(res, error)
    }
  }
}

export function getRequiredQueryString(req, key, message = `${key} is required`) {
  const value = String(req.query[key] ?? '').trim()

  if (!value) {
    throw new HttpError(400, message)
  }

  return value
}
