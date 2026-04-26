const AUTH_COOKIE_NAME = 'your_music_ncm_session'
const AUTH_COOKIE_CHUNKS_NAME = `${AUTH_COOKIE_NAME}.chunks`
const AUTH_COOKIE_CHUNK_SIZE = 3000
const AUTH_COOKIE_MAX_CHUNKS = 12

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 30,
}

function parseCookieHeader(rawCookieHeader = '') {
  const cookies = new Map()

  for (const chunk of rawCookieHeader.split(';')) {
    const [rawName, ...rawValueParts] = chunk.trim().split('=')

    if (!rawName) {
      continue
    }

    cookies.set(rawName, rawValueParts.join('='))
  }

  return cookies
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function encodeSessionCookie(cookie) {
  return Buffer.from(cookie, 'utf8').toString('base64url')
}

function decodeSessionCookie(value) {
  try {
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    return safeDecodeURIComponent(value)
  }
}

function getChunkName(index) {
  return `${AUTH_COOKIE_NAME}.${index}`
}

export function readAuthCookie(req) {
  const cookies = parseCookieHeader(req.headers.cookie ?? '')
  const chunkCount = Number(cookies.get(AUTH_COOKIE_CHUNKS_NAME) ?? 0)

  if (Number.isInteger(chunkCount) && chunkCount > 0 && chunkCount <= AUTH_COOKIE_MAX_CHUNKS) {
    const encodedCookie = Array.from({ length: chunkCount }, (_, index) => cookies.get(getChunkName(index)) ?? '').join('')

    return encodedCookie ? decodeSessionCookie(encodedCookie) : ''
  }

  const legacyCookie = cookies.get(AUTH_COOKIE_NAME)

  return legacyCookie ? safeDecodeURIComponent(legacyCookie) : ''
}

export function clearAuthCookie(res) {
  const options = {
    httpOnly: AUTH_COOKIE_OPTIONS.httpOnly,
    sameSite: AUTH_COOKIE_OPTIONS.sameSite,
    path: AUTH_COOKIE_OPTIONS.path,
  }

  res.clearCookie(AUTH_COOKIE_NAME, options)
  res.clearCookie(AUTH_COOKIE_CHUNKS_NAME, options)

  for (let index = 0; index < AUTH_COOKIE_MAX_CHUNKS; index += 1) {
    res.clearCookie(getChunkName(index), options)
  }
}

export function writeAuthCookie(res, cookie) {
  const safeCookie = String(cookie ?? '').trim()

  clearAuthCookie(res)

  if (!safeCookie) {
    return
  }

  const encodedCookie = encodeSessionCookie(safeCookie)
  const chunks = encodedCookie.match(new RegExp(`.{1,${AUTH_COOKIE_CHUNK_SIZE}}`, 'g')) ?? []

  if (chunks.length === 0 || chunks.length > AUTH_COOKIE_MAX_CHUNKS) {
    throw new Error('登录凭证过长，无法保存到浏览器')
  }

  res.cookie(AUTH_COOKIE_CHUNKS_NAME, String(chunks.length), AUTH_COOKIE_OPTIONS)

  chunks.forEach((chunk, index) => {
    res.cookie(getChunkName(index), chunk, AUTH_COOKIE_OPTIONS)
  })
}
