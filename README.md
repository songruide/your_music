# Your Music

Your Music 是一个基于 Vue 3、Vite、Pinia 和 Express 的网易云音乐客户端练习项目。前端负责音乐发现、搜索、播放、收藏、登录弹窗和 AI 助手交互，本地 Express 服务负责统一代理网易云相关接口、登录态 Cookie 管理、搜索建议、播放资源和 AI 请求。

## 功能特性

- 音乐首页、发现页、排行榜、歌单详情、专辑详情、歌手详情、MV 页面。
- 全局搜索入口，支持歌曲、歌单、MV、专辑、歌手、关键词和本地音乐建议。
- 播放器、迷你播放器、本地音乐、最近播放和下载资源处理。
- 网易云账号登录，支持二维码登录和手机号短信验证码登录。
- 登录态 Cookie 分片保存，支持受保护页面登录后重定向。
- AI 音乐助手，支持 DashScope 兼容接口配置。
- 本地 API 中间件集成到 Vite，开发时一个服务即可跑完整应用。

## 技术栈

- Vue 3 + TypeScript
- Vite
- Pinia
- Vue Router
- Express
- Axios
- Sass
- lucide-vue-next / Iconify
- api-enhanced 网易云接口子模块

## 环境要求

- Node.js 20 或更高版本
- npm
- 可访问网易云音乐相关接口的网络环境

## 安装与启动

首次克隆时请拉取子模块：

```bash
git clone --recurse-submodules https://github.com/songruide/your_music.git
cd your_music
npm install
```

如果已经克隆过仓库，但缺少 `api-enhanced` 目录内容：

```bash
git submodule update --init --recursive
```

启动开发环境：

```bash
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173/
```

Vite 会自动挂载 `src/server` 下的 Express API，中间层接口路径为 `/api/...`。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需填写：

```bash
cp .env.example .env.local
```

可用配置：

```env
DASHSCOPE_API_KEY=
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=deepseek-v4-pro
AI_ENABLE_THINKING=false
NCM_API_BASE_URL=http://127.0.0.1:3000
```

说明：

- `DASHSCOPE_API_KEY`：AI 助手使用的 API Key，留空时 AI 功能会走降级提示。
- `AI_BASE_URL` / `AI_MODEL`：兼容 OpenAI 接口格式的 AI 服务地址和模型名。
- `AI_ENABLE_THINKING`：是否开启模型思考参数。
- `NCM_API_BASE_URL`：部分服务请求的网易云 API 基础地址。

## 登录说明

登录弹窗提供两种方式：

- 手机号短信验证码登录：输入 11 位手机号，点击“获取验证码”，收到短信后输入验证码登录。前端和后端都会自动清洗 `+86`、`86`、`0086` 等区号前缀。
- 二维码登录：使用网易云音乐 App 扫码并在手机端确认。

登录成功后，后端会写入当前站点 Cookie，前端通过 `/api/auth/status` 同步用户昵称、头像和登录状态。

## 常用脚本

```bash
npm run dev        # 启动 Vite 开发服务，并挂载本地 API
npm run build      # TypeScript 检查并构建生产产物
npm run preview    # 预览 dist 产物
npm run test       # 构建后运行项目健康检查
npm run dev:server # 单独启动 Express API 服务
```

## 项目结构

```text
api-enhanced/        网易云接口实现，作为子模块维护
docs/                项目补充文档和图表
public/              静态资源
scripts/             测试与辅助脚本
src/api/             前端 API 封装
src/components/      通用组件、登录弹窗、搜索建议、播放器等
src/layout/          主布局
src/router/          路由与鉴权守卫
src/server/          Express 本地 API 服务
src/stores/          Pinia 状态管理
src/views/           页面视图
src/utils/           通用工具
```

## 构建与检查

提交前建议执行：

```bash
npm run build
npm run test
```

`npm run test` 会先执行构建，再运行 `scripts/project-health.test.mjs` 中的服务健康检查、统一错误响应、下载参数校验、分页参数和登录 Cookie 分片测试。
