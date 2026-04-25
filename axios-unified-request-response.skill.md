# Skill: Axios 风格统一请求与响应封装（拦截器版）

## 适用场景
当项目希望采用 **Axios + 拦截器** 做前端统一请求管理时使用本 Skill。

目标：
- 页面/组件层不直接处理重复请求细节
- API 层统一返回业务 `data`
- 错误信息优先使用后端返回 `message`

---

## 推荐统一响应协议（与后端约定）

```json
{
  "code": 200,
  "data": {},
  "message": "ok"
}
```

失败：

```json
{
  "code": 4001,
  "data": null,
  "message": "参数错误"
}
```

约定：
- `code === 200`：业务成功
- `data`：业务数据
- `message`：可展示错误信息

---

## 标准实现模板（Axios 风格）

> 放在 `src/utils/request.ts` 或 `src/utils/http.ts`

```ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export type QueryValue = string | number | boolean | null | undefined

interface ApiEnvelope<T> {
  code?: number
  data?: T
  message?: string | null
}

interface RequestOptions extends Omit<AxiosRequestConfig, 'params' | 'data'> {
  params?: Record<string, QueryValue>
  body?: unknown
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''

const http = axios.create({
  baseURL: API_BASE_URL || undefined,
  withCredentials: true,
  timeout: 15000,
})

function normalizeParams(params?: Record<string, QueryValue>) {
  if (!params) return undefined
  const next: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    next[k] = v as string | number | boolean
  }
  return next
}

// ===== 请求拦截器：token / body 统一处理 =====
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }

  // 若 data 是普通对象，axios 默认会转 JSON。这里可按团队规范显式设置。
  if (config.data && Object.prototype.toString.call(config.data) === '[object Object]') {
    config.headers = config.headers ?? {}
    const headers = config.headers as Record<string, string>
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  return config
})

// ===== 响应拦截器：统一 data / 业务错误处理 =====
http.interceptors.response.use(
  (response) => {
    const payload = response.data as unknown

    // 包装协议：{ code, data, message }
    if (
      payload &&
      typeof payload === 'object' &&
      ('code' in (payload as Record<string, unknown>) ||
        'data' in (payload as Record<string, unknown>) ||
        'message' in (payload as Record<string, unknown>))
    ) {
      const envelope = payload as ApiEnvelope<unknown>
      if (envelope.code !== undefined && envelope.code !== 200) {
        throw new Error(envelope.message ?? 'Request failed')
      }
      return envelope.data
    }

    // 非包装协议，直接透传
    return payload
  },
  (error: AxiosError<ApiEnvelope<unknown>>) => {
    // HTTP 错误优先拿后端 message
    const message =
      error.response?.data?.message ||
      error.message ||
      '网络异常，请稍后重试'

    // 统一抛 Error，业务层只需要 try/catch 一种形式
    return Promise.reject(new Error(message))
  },
)

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, ...rest } = options

  const result = await http.request<T>({
    url: path,
    params: normalizeParams(params),
    data: body,
    ...rest,
  })

  // 注意：由于响应拦截器已 return data，这里 result 就是 data 本身
  return result as unknown as T
}
```

---

## API 层写法（推荐）

```ts
import { request } from '@/utils/request'

export function getProfile() {
  return request<{ id: string; name: string }>('/api/user/profile')
}

export function updateProfile(body: { name: string }) {
  return request<null>('/api/user/profile', {
    method: 'PUT',
    body,
  })
}
```

---

## 错误处理建议

前端统一分 3 层：
1. 网络层错误（超时、断网）
2. HTTP 层错误（401/403/404/500）
3. 业务层错误（`code !== 200`）

### 401 推荐策略
- access token 过期：尝试 refresh
- refresh 失败：清理登录态并跳转登录页

## 进阶：Refresh Token 并发队列（只刷新一次）

### 为什么需要
当 access token 过期时，多个接口可能同时返回 401。若每个请求都各自去调用 refresh，会出现：
- 重复刷新
- token 覆盖竞态
- 部分请求重试失败

### 目标
- 同一时刻只发起一次 refresh 请求
- 其他 401 请求进入等待队列
- refresh 成功后批量重放原请求
- refresh 失败后统一失败并跳登录

### 可直接参考的实现模板

```ts
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

interface ApiEnvelope<T> {
  code?: number
  data?: T
  message?: string | null
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim() || undefined,
  withCredentials: true,
  timeout: 15000,
})

const auth = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim() || undefined,
  withCredentials: true,
  timeout: 15000,
})

let isRefreshing = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function getAccessToken() {
  return localStorage.getItem('token') || ''
}

function setAccessToken(token: string) {
  localStorage.setItem('token', token)
}

function clearAuth() {
  localStorage.removeItem('token')
}

function redirectToLogin() {
  window.location.href = '/login'
}

function flushQueue(error: unknown, token?: string) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token || '')
  })
  pendingQueue = []
}

async function refreshAccessToken(): Promise<string> {
  // 按你的后端协议调整路径与字段
  const resp = await auth.post<ApiEnvelope<{ accessToken: string }>>('/api/auth/refresh')
  const payload = resp.data

  if (!payload || payload.code !== 200 || !payload.data?.accessToken) {
    throw new Error(payload?.message || '刷新登录态失败')
  }

  const newToken = payload.data.accessToken
  setAccessToken(newToken)
  return newToken
}

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiEnvelope<unknown>
    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code !== 200) {
        return Promise.reject(new Error(payload.message || 'Request failed'))
      }
      return payload.data
    }
    return response.data
  },
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = (error.config || {}) as RetryConfig
    const status = error.response?.status

    // 非 401 或已重试过，直接失败
    if (status !== 401 || original._retry) {
      const msg = error.response?.data?.message || error.message || '网络异常，请稍后重试'
      return Promise.reject(new Error(msg))
    }

    original._retry = true

    // 正在刷新：当前请求排队等待
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      })
        .then((newToken) => {
          original.headers = original.headers ?? {}
          ;(original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
          return http(original)
        })
        .catch((queueErr) => Promise.reject(queueErr))
    }

    // 首个 401：触发刷新
    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()
      flushQueue(null, newToken)

      original.headers = original.headers ?? {}
      ;(original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
      return http(original)
    } catch (refreshErr) {
      flushQueue(refreshErr)
      clearAuth()
      redirectToLogin()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)
```

### 使用注意
- `refresh` 请求必须使用独立实例（上例 `auth`），避免触发自身拦截循环
- 为原请求打 `_retry` 标记，避免死循环
- 刷新失败要清理登录态并统一跳转登录页
- 如果你使用 Cookie Session，可改成“401 后调用会话续期接口”，逻辑同样适用

---

## 团队规范建议

- 页面层禁止直接 `axios.get/post` 裸调用
- 所有请求统一走 `request()`
- 所有接口文件放在 `src/api/*`
- 错误文案优先后端 `message`，前端只做兜底

---

## 与 Fetch 方案关系

- Axios 方案：写得更短，拦截器体验好
- Fetch 方案：更轻依赖、可控度更高

二者都可以工程化，关键是：

**统一入口 + 统一协议 + 统一错误处理。**
