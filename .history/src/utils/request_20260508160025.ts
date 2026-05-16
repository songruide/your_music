export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null
  params?: Record<string, QueryValue>
}

interface ApiEnvelope<T> {
  code?: number
  data?: T
  message?: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}
//统一处理参数问题
function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(path, API_BASE_URL || window.location.origin)

  if (!params) {
    return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`
}
//统一处理post请求的请求体的参数
function resolveBody(body: unknown, headers: Headers): BodyInit | null | undefined {
  if (body == null) {
    return body as null | undefined
  }

  if (!isPlainObject(body)) {
    return body as BodyInit
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return JSON.stringify(body)
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return isPlainObject(payload) && ('code' in payload || 'data' in payload || 'message' in payload)
}

async function readJsonPayload<T>(response: Response, path: string) {
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()

  if (!rawText) {
    return undefined as T
  }

  if (!contentType.includes('application/json')) {
    const preview = rawText.slice(0, 80).trim()

    if (preview.startsWith('<')) {
      throw new Error(`接口 ${path} 返回了 HTML，不是 JSON。请检查 API 服务或 Vite 预览环境。`)
    }

    throw new Error(`接口 ${path} 返回了非 JSON 内容：${preview}`)
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    throw new Error(`接口 ${path} 返回的 JSON 解析失败`)
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers: rawHeaders, ...init } = options
  const headers = new Headers(rawHeaders)
  const response = await fetch(buildUrl(path, params), {
    credentials: 'include',
    ...init,
    headers,
    body: resolveBody(body, headers),
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await readJsonPayload<unknown>(response, path)) as unknown
//处理错误
  if (!response.ok) {
    if (isApiEnvelope(payload) && payload.message) {
      throw new Error(payload.message)
    }

    throw new Error(`Request failed with status ${response.status}`)
  }

  if (isApiEnvelope<T>(payload)) {
    if (payload.code !== undefined && payload.code !== 200) {
      throw new Error(payload.message ?? 'Request failed')
    }

    return payload.data as T
  }

  return payload as T
}
