# Skill: 前后端统一请求与响应封装（Fetch + Node BFF）

## 适用场景
当项目采用以下架构时使用本 Skill：

- 前端：统一 `request()` 方法（基于 `fetch`）
- Node.js 服务端：作为 BFF（Backend For Frontend）
- 后端返回统一协议：`{ code, data, message }`

本仓库对应实现参考：

- 前端统一请求：`src/utils/request.ts`
- 前端业务 API：`src/api/*.ts`
- 服务端统一响应：`src/server/utils/http.js`
- 服务端路由示例：`src/server/routes/*.js`

---

## 目标
1. 前端业务层只关心 `data`，不重复写错误处理样板代码。
2. 服务端路由统一格式输出，屏蔽上游接口差异。
3. 错误信息优先由服务端提供，前端只做兜底。

---

## 统一协议约定（必须先定）

### 成功响应

```json
{
  "code": 200,
  "data": {},
  "message": "ok"
}
```

### 失败响应

```json
{
  "code": 4001,
  "data": null,
  "message": "参数错误"
}
```

### 约定说明
- `code`：业务码（建议 200 表示成功）
- `data`：真实业务数据
- `message`：可读错误信息（优先给用户可理解文案）

---

## 前端实现规范（Fetch 二次封装）

在统一 `request()` 中处理这些关键点：

1. URL 组装：`baseURL + path + params`
2. Body 处理：对象自动 JSON 化
3. Header 处理：自动补 `Content-Type: application/json`
4. Cookie 会话：`credentials: 'include'`
5. 响应解析：优先按 JSON 解析，非 JSON 给出可读报错
6. HTTP 错误：`!response.ok` 时抛错（优先后端 `message`）
7. 业务错误：`code !== 200` 时抛错（优先 `message`）
8. 成功返回：仅返回 `data`

### 推荐调用方式
- API 文件只写“接口映射”，不写重复错误处理逻辑
- 组件/页面调用 API 后只处理业务分支

---

## 服务端实现规范（Node BFF）

1. 每个路由只做：参数校验 + 调上游 + 数据映射
2. 成功统一 `sendOk(res, data)`
3. 失败统一 `sendError(res, code, message, detail?)`
4. 避免将上游原始错误直接暴露给前端
5. 对上游多种返回格式在 BFF 内部做“抹平”

---

## 错误处理分层模型

- 第 1 层：网络错误（超时、断网、DNS）
- 第 2 层：HTTP 错误（401/403/404/500）
- 第 3 层：业务错误（`code !== 200`）
- 第 4 层：解析错误（非 JSON、JSON 格式异常）

前端 `request()` 必须统一覆盖这 4 层。

---

## 推荐错误码策略

- `200`：成功
- `401`：未登录/登录失效
- `403`：无权限
- `404`：资源不存在
- `429`：限流
- `500`：服务端异常
- `4001+`：业务自定义错误

---

## 鉴权建议（Token / Cookie 二选一或混合）

### Cookie Session（本仓库当前更接近）
- 前端使用 `credentials: 'include'`
- 鉴权由 Cookie 自动携带
- 通常不需要每次请求手动拼 `Authorization`

### Bearer Token
- 在 `request()` 中统一读取 token 并注入 header
- 401 时走刷新流程（refresh token）
- 刷新失败统一跳登录

> 不建议“每次业务请求前先调用一次获取 token 接口”，会增加时延和系统压力。

---

## 可复用模板清单（新项目启动时）

1. 建立 `src/utils/request.ts`
2. 统一响应协议文档（后端/前端对齐）
3. 建立服务端 `sendOk/sendError` 工具
4. 约定业务错误码表
5. 在 API 层只返回强类型 `Promise<T>`
6. 页面层禁止直接 `fetch/axios` 裸调用

---

## 质量检查清单（PR 自检）

- [ ] 业务代码是否都走统一 `request()`
- [ ] 是否存在页面层重复 try/catch 样板
- [ ] BFF 是否统一输出 `{ code, data, message }`
- [ ] 错误文案是否可读
- [ ] 非 JSON 响应是否有可诊断报错
- [ ] 是否区分 HTTP 错误与业务错误

---

## 一句话原则

**前端统一入口收敛复杂度，BFF 统一协议抹平差异，页面只消费 `data`。**
