# fetch 和 axios 的区别

这个项目原来用 `fetch` 发送普通接口请求，现在在 `development` 分支上把普通请求封装改成了 `axios`。

改动重点在 `src/utils/request.ts`。业务代码里的调用方式还是：

```ts
request<T>('/api/search/songs', {
  params: { keyword },
})
```

也就是说，大部分页面和 `src/api/*` 文件不用跟着改。因为它们没有直接写 `fetch`，而是通过统一的 `request` 函数请求后端。

## 这次项目里怎么改的

原来的请求链路大概是：

```ts
request() -> fetch() -> response.text() -> JSON.parse()
```

现在变成：

```ts
request() -> axios.request() -> response.data -> JSON.parse()
```

为了让业务层不用改，`request` 仍然保留了这些能力：

- `params`：拼到 URL 查询参数里，并过滤 `undefined`、`null`、空字符串。
- `body`：普通对象会按 JSON 请求体发送。
- `credentials: 'include'`：迁移成 axios 的 `withCredentials: true`。
- `code !== 200`：仍然会按业务错误抛出。
- 非 JSON 或 HTML 响应：仍然会给出更明确的错误提示。

## fetch 和 axios 的核心区别

### 1. 来源不同

`fetch` 是浏览器原生 API，不需要安装依赖：

```ts
const response = await fetch('/api/user')
```

`axios` 是第三方库，需要安装：

```ts
const response = await axios.get('/api/user')
```

这个项目现在已经在 `package.json` 里加入了 `axios`。

### 2. 返回值不同

`fetch` 返回的是 `Response` 对象，需要自己解析：

```ts
const response = await fetch('/api/user')
const data = await response.json()
```

`axios` 返回的是 axios 的响应对象，接口数据通常在 `response.data`：

```ts
const response = await axios.get('/api/user')
const data = response.data
```

所以如果项目里到处直接写 `fetch`，迁移会比较麻烦。你的项目好在普通请求已经集中到了 `src/utils/request.ts`。

### 3. HTTP 错误处理不同

`fetch` 遇到 `404`、`500` 不会自动进入 `catch`，只有网络断开这类错误才会抛异常：

```ts
const response = await fetch('/api/user')

if (!response.ok) {
  throw new Error('请求失败')
}
```

`axios` 默认遇到 `404`、`500` 会直接进入 `catch`：

```ts
try {
  await axios.get('/api/user')
} catch (error) {
  console.log('请求失败')
}
```

这次项目里为了保留原来的统一错误逻辑，在 axios 配置里用了：

```ts
validateStatus: () => true
```

这样 axios 不会自动把 `404`、`500` 丢进 `catch`，而是交给 `request` 函数自己判断状态码和业务 `code`。

### 4. 请求体写法不同

`fetch` 发送 JSON 时通常要手动 `JSON.stringify`：

```ts
await fetch('/api/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Ada' }),
})
```

`axios` 可以直接把对象放到 `data`：

```ts
await axios.post('/api/user', {
  name: 'Ada',
})
```

你的项目原来的业务代码用的是 `body`，所以这次在封装里做了兼容：

```ts
body -> axios 的 data
```

### 5. Cookie 配置不同

`fetch` 携带 Cookie 用：

```ts
credentials: 'include'
```

`axios` 对应的是：

```ts
withCredentials: true
```

你的项目里登录、二维码状态、用户态接口需要 Cookie，所以封装里默认保持携带 Cookie。

### 6. 参数处理不同

`fetch` 没有内置 `params`，一般要自己拼 URL：

```ts
const url = new URL('/api/search', location.origin)
url.searchParams.set('keyword', keyword)
```

`axios` 支持 `params`：

```ts
axios.get('/api/search', {
  params: { keyword },
})
```

不过你的项目原来有过滤空参数的逻辑，所以这次仍然保留 `buildUrl()`，避免请求里出现空参数。

### 7. 拦截器不同

`fetch` 没有内置拦截器。要统一加 token、统一处理错误，一般得自己封装。

`axios` 自带请求拦截器和响应拦截器，适合后续扩展：

```ts
axios.interceptors.request.use((config) => {
  return config
})
```

这个项目目前还没有必须使用拦截器的地方，所以这次没有额外加复杂逻辑。

### 8. 流式读取不同

`fetch` 更适合浏览器里的流式读取：

```ts
const reader = response.body?.getReader()
```

你的 `src/api/ai.ts` 里有 AI 流式回复接口：

```ts
streamAssistantReply()
```

这块需要读取 `response.body.getReader()`，所以这次没有把它改成 axios。普通 JSON 请求用 axios，流式接口继续用 fetch，是更稳的做法。

## 这个项目里的结论

这个项目不需要全局到处改，因为普通接口已经有统一封装。

适合改成 axios 的地方：

- `src/utils/request.ts`
- 通过 `request()` 发送的普通 JSON 接口

不建议强行改的地方：

- `src/api/ai.ts` 里的流式 AI 接口
- `src/server/services/*` 里的服务端上游请求

一句话记忆：

```text
fetch 更原生、更适合底层和流式读取；axios 封装更完整，更适合普通业务接口统一管理。
```
