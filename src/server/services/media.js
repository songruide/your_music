import { Readable } from 'node:stream'

export async function pipeUpstreamStream(req, res, options) {
  const {
    url,
    responseHeaders,
    fallbackContentType,
    requestFailedMessage,
  } = options
  const upstreamHeaders = new Headers()

  if (req.headers.range) {
    upstreamHeaders.set('Range', req.headers.range)
  }

  const upstreamResponse = await fetch(url, {
    headers: upstreamHeaders,
    redirect: 'follow',
  })

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    throw new Error(`${requestFailedMessage}: ${upstreamResponse.status}`)
  }

  for (const headerName of responseHeaders) {
    const headerValue = upstreamResponse.headers.get(headerName)

    if (headerValue) {
      res.setHeader(headerName, headerValue)
    }
  }

  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Accept-Ranges', upstreamResponse.headers.get('accept-ranges') ?? 'bytes')

  if (!res.getHeader('content-type') && fallbackContentType) {
    res.setHeader('Content-Type', fallbackContentType)
  }

  res.status(upstreamResponse.status)

  if (!upstreamResponse.body) {
    res.end()
    return
  }

  Readable.fromWeb(upstreamResponse.body).pipe(res)
}
