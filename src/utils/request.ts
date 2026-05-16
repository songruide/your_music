import axios, { type AxiosRequestConfig } from 'axios'

export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions
  extends Omit<
    AxiosRequestConfig,
    'data' | 'params' | 'responseType' | 'transformResponse' | 'url' | 'validateStatus' | 'withCredentials'
  > {
  body?: BodyInit | Record<string, unknown> | null
  credentials?: RequestCredentials
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

function createHeaders(rawHeaders: RequestOptions['headers']) {
  if (!rawHeaders) {
    return new Headers()
  }

  if (rawHeaders instanceof Headers || Array.isArray(rawHeaders)) {
    return new Headers(rawHeaders)
  }

  const source =
    typeof rawHeaders === 'object' && 'toJSON' in rawHeaders && typeof rawHeaders.toJSON === 'function'
      ? rawHeaders.toJSON()
      : rawHeaders
  const headers = new Headers()

  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (value !== undefined && value !== null) {
      headers.set(key, String(value))
    }
  }

  return headers
}

function headersToRecord(headers: Headers) {
  const result: Record<string, string> = {}

  headers.forEach((value, key) => {
    result[key] = value
  })

  return result
}

function getHeaderValue(headers: unknown, name: string) {
  const maybeHeaders = headers as { get?: (key: string) => unknown }
  const fromGetter = maybeHeaders.get?.(name)

  if (fromGetter !== undefined && fromGetter !== null) {
    return Array.isArray(fromGetter) ? fromGetter.join(', ') : String(fromGetter)
  }

  const values = headers as Record<string, unknown>
  const directValue = values[name] ?? values[name.toLowerCase()]

  if (directValue === undefined || directValue === null) {
    return ''
  }

  return Array.isArray(directValue) ? directValue.join(', ') : String(directValue)
}

function resolveData(body: unknown, headers: Headers): BodyInit | Record<string, unknown> | null | undefined {
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

function readJsonPayload<T>(rawPayload: unknown, contentType: string, path: string) {
  const rawText = typeof rawPayload === 'string' ? rawPayload : String(rawPayload ?? '')

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
  const { params, body, headers: rawHeaders, credentials = 'include', ...config } = options
  const headers = createHeaders(rawHeaders)
  const data = resolveData(body, headers)
  const response = await axios.request<string>({
    ...config,
    data,
    headers: headersToRecord(headers),
    responseType: 'text',
    transformResponse: [(payload) => payload],
    url: buildUrl(path, params),
    validateStatus: () => true,
    withCredentials: credentials === 'include',
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = readJsonPayload<unknown>(response.data, getHeaderValue(response.headers, 'content-type'), path)

  if (response.status < 200 || response.status >= 300) {
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
