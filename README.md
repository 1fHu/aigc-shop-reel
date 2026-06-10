# VidCraft

AIGC 带货视频生成系统 — 面向 TikTok 电商商家的智能视频工作站。

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 8 + Ant Design 5 + Zustand |
| 后端 | NestJS 10 + TypeScript |
| 异步队列 | Bull (Redis) — 素材 AI 解析异步任务 |
| 视频合成 | NestJS 内联调用 FFmpeg |
| 数据库 | PostgreSQL 16 + pgvector (向量检索) |
| 缓存/队列 | Redis 7 |
| 对象存储 | MinIO |
| AI 能力 | 火山引擎 OpenAPI (Doubao / Seedance / TTS / Embedding) |
| 链路追踪 | OpenTelemetry + Jaeger |
| 容器化 | Docker + Docker Compose |

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### 1. 克隆与配置

```bash
git clone <repo-url>
cd vidcraft
cp .env.example .env
# 编辑 .env 填入火山引擎 API Key 等配置
```

### 2. 启动基础设施

```bash
npm run docker:up
# 启动 PostgreSQL + Redis + MinIO + Jaeger
```

### 3. 安装依赖

```bash
npm install
```

### 4. 初始化数据库

```bash
npm run db:init
npm run db:seed
```

### 5. 启动开发服务

```bash
npm run dev          # 全栈启动
# 或单独启动
npm run dev:frontend # http://localhost:5173
npm run dev:backend  # http://localhost:3000
```

### 6. 访问

- 前端: http://localhost:5173
- API 文档 (Swagger): http://localhost:3000/api
- Bull Board (队列): http://localhost:3000/admin/queues
- Jaeger (链路追踪): http://localhost:16686
- MinIO Console: http://localhost:9001

## 游客体验

演示环境提供游客模式，无需注册即可体验核心功能：
- 首页点击「游客体验」一键进入
- 预置示例项目、剧本、视频
- 游客配额：2 条视频 / 会话

## 项目结构

```
vidcraft/
├── frontend/          # React 前端
│   └── src/
│       ├── components/   # 通用组件
│       ├── pages/        # 页面模块
│       ├── hooks/        # 自定义 Hooks
│       ├── services/     # API 调用
│       ├── stores/       # Zustand 状态
│       └── types/        # TypeScript 类型
├── backend/           # NestJS 后端
│   └── src/
│       ├── modules/      # 业务模块
│       ├── common/       # 过滤器/拦截器/守卫
│       ├── database/     # 实体与迁移
│       └── queue/        # Bull 异步任务（素材 AI 解析）
├── worker/            # Python FFmpeg 服务（预留脚手架，未集成进真实链路）
├── docker/            # Docker 配置
├── scripts/           # SQL 初始化 + 辅助脚本
└── docs/              # 技术文档
```

## 文档

- [需求分析文档 v2](./docs/VidCraft_需求分析文档_v2.docx)
- [技术方案文档 v2](./docs/VidCraft_技术方案文档_v2.docx)
- [模块划分与用户故事 v2](./docs/VidCraft_模块划分与用户故事_v2.docx)
