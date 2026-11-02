# VidCraft

English | [简体中文](./README.zh-CN.md)

An AI video creation workstation for TikTok commerce. Turn product information and creative assets into promotional videos with AI-assisted scripting, storyboard editing, and video composition.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Ant Design 5, Zustand |
| Backend | NestJS 10, TypeScript |
| Background jobs | Bull with Redis for AI asset analysis |
| Video composition | FFmpeg invoked by NestJS |
| Database | PostgreSQL 16 with pgvector |
| Cache and queues | Redis 7 |
| Object storage | MinIO |
| AI services | Volcengine OpenAPI: Doubao, Seedance, TTS, embeddings |
| Tracing | OpenTelemetry and Jaeger |
| Containers | Docker and Docker Compose |

## Quick start

### Requirements

- Node.js 20 or later, with npm
- Docker and Docker Compose
- PostgreSQL command-line client for database initialization
- Credentials for the AI services used by your environment

### 1. Clone and configure

```bash
git clone https://github.com/1fHu/aigc-shop-reel.git
cd aigc-shop-reel
cp .env.example .env
# Set your Volcengine API key and other environment settings in .env.
```

### 2. Start infrastructure

```bash
npm run docker:up
# Starts the services configured in docker/docker-compose.yml.
```

### 3. Install dependencies

```bash
npm install
```

The root installation also installs frontend and backend dependencies.

### 4. Initialize the database

```bash
npm run db:init
npm run db:seed
```

Run these commands against your development database. Review the SQL scripts before applying them to an existing database.

### 5. Start development services

```bash
npm run dev
# Or start each app separately:
npm run dev:frontend # http://localhost:5173
npm run dev:backend  # http://localhost:3000
```

### 6. Open the application

| Service | Address |
| --- | --- |
| Web application | http://localhost:5173 |
| Swagger API documentation | http://localhost:3000/api |
| Bull Board | http://localhost:3000/admin/queues |
| Jaeger | http://localhost:16686 |
| MinIO Console | http://localhost:9001 |

## Try as a guest

Use the guest entry on the sign-in page to explore the core workflow without registering. The demo includes sample projects, scripts, and videos. The guest video quota is two videos per session.

To try the frontend with mock responses, start it from `frontend/` with `VITE_USE_MOCK=true npm run dev`. This mode does not call live AI services.

## Interface languages

The interface defaults to English on your first visit. Use the `中文 / EN` control on authentication pages or in the workstation header to switch between English and Simplified Chinese. Your browser remembers the selection; switching preserves form inputs and ongoing edits.

Interface language does not translate user content or change the language of generated voiceovers and subtitles.

## Project structure

```text
aigc-shop-reel/
├── frontend/          # React application
│   └── src/
│       ├── components/   # Shared UI
│       ├── pages/        # Application pages
│       ├── hooks/        # Custom hooks
│       ├── services/     # API clients
│       ├── stores/       # Zustand state
│       └── types/        # TypeScript types
├── backend/           # NestJS application
│   └── src/
│       ├── modules/      # Business modules
│       ├── common/       # Shared services, filters, interceptors, guards
│       ├── database/     # Entities and migrations
│       └── queue/        # Background asset analysis
├── worker/            # Reserved Python FFmpeg scaffold; not in the live pipeline
├── docker/            # Container configuration
├── scripts/           # Database initialization and utilities
└── docs/              # Technical documentation
```

## Documentation

The detailed project documents are currently in Chinese:

- [Product requirements](./docs/PRD产品需求文档.md)
- [Technical design](./docs/TDD技术设计文档.md)
- [Module design](./docs/MDD模块设计文档.md)
- [API specification](./docs/API接口规范文档.md)
- [Database design](./docs/DDD数据库设计文档.md)
