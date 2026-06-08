# VidCraft 服务器部署问题诊断报告

> 日期: 2026-06-08 | 目标服务器: 150.109.235.111 (vidcraft.icu)

---

## 问题总览

| # | 严重程度 | 类别 | 问题简述 |
|---|---------|------|---------|
| 1 | **致命** | 图片显示 | `MEDIA_PUBLIC_BASE` 未配置，图片 URL 使用 Docker 内部 hostname `minio` |
| 2 | **致命** | 视频播放 | `ViralReportDrawer` 硬编码 `http://localhost:3000` |
| 3 | **致命** | 数据持久化 | `/uploads/` 目录无 Docker 卷挂载，重启丢失所有视频/缩略图 |
| 4 | **高** | 数据库 | 启动时不自动执行 migration/init-db.sql |
| 5 | **高** | 安全 | CORS 完全开放 (`enableCors()` 无参数) |
| 6 | **高** | 功能 | Seedance 回调 URL 已配置但从未传给 API |
| 7 | **高** | 功能 | VideoGateway WebSocket 未在模块中注册 |
| 8 | **中** | 配置 | Nginx 监听 8080 但 EXPOSE 80，DEPLOY.md 也写端口 80 |
| 9 | **中** | 配置 | `.env.production` 缺少 VITE_/火山引擎端点等变量 |
| 10 | **中** | 健壮性 | 健康检查 `/api/health` 不验证 DB/Redis/MinIO 连接 |
| 11 | **中** | Bug | `viral-analyzer.service.ts` 创建缩略图前未 `mkdirSync` |
| 12 | **低** | 代码 | 3 个 TypeORM Entity 未注册到 DatabaseModule |
| 13 | **低** | 种子数据 | `seed-demo-data.sql` 中 bcrypt hash 为占位符 |

---

## 详细分析

### Bug 1 [致命] 图片无法显示 — `MEDIA_PUBLIC_BASE` 缺失

**文件:** `backend/src/common/minio-storage.service.ts:57`

**根因:**
```typescript
const publicBase = this.config.get<string>('MEDIA_PUBLIC_BASE');
if (publicBase) {
  return `${publicBase}/${this.bucketName}/${key}`;
}
// 回退：用 MINIO_ENDPOINT 拼 URL
return `http://${endpoint}:${port}/${this.bucketName}/${key}`;
```

- 生产环境 `.env.production` 配置 `MINIO_ENDPOINT=minio`（Docker 内部 hostname）
- `MEDIA_PUBLIC_BASE` 从未在任何 `.env` 文件中设置
- 因此回退逻辑生成 `http://minio:9000/vidcraft-media/...` 的 URL
- 浏览器无法解析 `minio` → **图片加载失败**
- 本地开发环境 `MINIO_ENDPOINT=localhost`，浏览器能直接访问 → 本地正常

**现有基础设施:** `docker/nginx.prod.conf:39-44` 已配置好了 `/vidcraft-media/` → `minio:9000` 的反向代理，只需让 URL 经过 nginx 即可。

**修复方案:** 在 `.env.production` 添加 `MEDIA_PUBLIC_BASE=https://api.vidcraft.icu`

**影响范围:**
- `MaterialService` — 物料封面/缩略图 (material.entity.ts)
- `ProductService` — 产品封面 (project.entity.ts)
- 所有前端 `<img>` 标签 (MaterialLibrary, ProjectCard, Projects, ProductParse, ShotEditor, VideoCreation)

---

### Bug 2 [致命] 前端硬编码 localhost:3000

**文件:** `frontend/src/components/ViralReportDrawer/index.tsx:89`

```tsx
<source src={`http://localhost:3000${card.video_url}`} type="video/mp4" />
```

**根因:** 视频播放源直接硬编码 `http://localhost:3000` 前缀。在服务器上，用户浏览器中的 `localhost` 指向用户自己的电脑，而非服务器。

**修复方案:** 改用相对路径，card.video_url 已经是 `/api/videos/...` 格式，直接用即可：
```tsx
<source src={card.video_url} type="video/mp4" />
```

---

### Bug 3 [致命] Docker 无共享卷 — 容器重启丢失媒体文件

**影响文件:**
- `backend/src/modules/video/video.service.ts:18` — `VIDEO_DIR = join(cwd, '..', 'uploads', 'videos')`
- `backend/src/modules/video/video.controller.ts:42,93` — 同上
- `backend/src/modules/gene-bank/gene-bank.controller.ts:51,72` — reference-videos / thumbnails
- `backend/src/modules/viral-analyzer/viral-analyzer.service.ts:70,81,243,256` — temp-frames / analyzed-videos / genebank-*

**根因:** 所有 `uploads/` 路径在 Docker 容器内写到容器内部存储。`docker-compose.prod.yml` 中没有定义任何 volume 映射。容器重启/重新部署后所有生成的视频、缩略图、帧全部丢失。多个后端副本之间也没有共享存储。

**修复方案:** 在 `docker-compose.prod.yml` 的 backend 服务中添加:
```yaml
volumes:
  - uploads_data:/uploads
```

---

### Bug 4 [高] 数据库不自动迁移

**文件:** `docker/Dockerfile.backend`, `docker/docker-compose.prod.yml`

**根因:** 生产环境 Dockerfile 的 CMD 直接 `node dist/main`，没有任何 entrypoint 在启动前执行数据库迁移或 `init-db.sql`。全新部署时数据库表结构不存在。

**修复方案:** 添加 `docker/entrypoint.sh` 并在 Dockerfile 中使用，启动前检查并执行初始化。

---

### Bug 5 [高] CORS 完全开放

**文件:** `backend/src/main.ts:28`

```typescript
app.enableCors(); // 无参数 = 允许所有来源
```

**根因:** 零参数调用意味着允许所有 origin、所有 method、所有 header。配合 `frontend/src/services/api.ts:25` 的 `withCredentials: true`，浏览器要求 CORS 不能是通配符 `*`，存在兼容性风险。

**修复方案:**
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'https://vidcraft.icu',
  credentials: true,
});
```

---

### Bug 6 [高] Seedance 回调 URL 未使用

**文件:**
- `backend/src/config/configuration.ts:32` — 配置了 `callbackBaseUrl`
- `backend/src/modules/volcano/volcano-api.service.ts` — `generateVideo()` 未传 `callback_url`

**根因:** 火山引擎 Seedance API 支持 `callback_url` 参数在任务完成时主动通知，但代码从未在请求中传递此参数。目前完全依赖轮询，效率较低且有超时风险。

**修复方案:** 在 `generateVideo()` 请求体中添加 `callback_url: ${config.callbackBaseUrl}/api/volcano/seedance-callback`

---

### Bug 7 [高] WebSocket VideoGateway 未注册

**文件:** `backend/src/modules/video/video.module.ts:14`

```typescript
providers: [VideoService], // 缺少 VideoGateway
```

**根因:** `VideoGateway` 实现了 WebSocket 事件处理，但未添加到模块的 providers 数组。NestJS 不会实例化它，WebSocket 功能完全不工作。

**修复方案:** 在 providers 中添加 `VideoGateway`。

---

### Bug 8 [中] Nginx 端口不一致

- `docker/nginx.prod.conf:2` — `listen 8080`
- `docker/Dockerfile.frontend.prod:11` — `EXPOSE 80`
- `DEPLOY.md:69` — `curl http://localhost:80`

三个地方端口号不一致，造成混淆。

**修复方案:** 统一为 80 或明确文档说明映射关系。

---

### Bug 9 [中] `.env.production` 变量缺失

对比 `.env.example`，`.env.production` 缺少:
- `VITE_API_BASE_URL`
- `VITE_WS_URL`
- `VOLCANO_TTS_APP_ID` / `VOLCANO_TTS_ACCESS_KEY` / `VOLCANO_TTS_RESOURCE_ID`
- `VOLCANO_EMBEDDING_EP` / `VOLCANO_EMBEDDING_API_KEY` / `VOLCANO_EMBEDDING_DIM`

**修复方案:** 补全变量（标记为需要填写真实值）。

---

### Bug 10 [中] 健康检查不验证依赖

**文件:** `backend/src/app.controller.ts:6-9`

```typescript
@Get('health')
health() {
  return ok({ status: 'ok', service: 'vidcraft-backend' });
}
```

**根因:** 仅返回静态 `{ status: 'ok' }`，不检查 PostgreSQL、Redis、MinIO 连接。如果数据库挂了，健康检查仍然返回 OK。

**修复方案:** 在 health 端点中 ping DB/Redis/MinIO，返回各依赖状态。

---

### Bug 11 [中] 缩略图目录不自动创建

**文件:** `backend/src/modules/viral-analyzer/viral-analyzer.service.ts:81-82`

**根因:** `thumbnailDir` 拼接了路径但未调用 `mkdirSync`，首次运行 extractThumbnail 时会因目录不存在而失败。

**修复方案:** 添加 `fs.mkdirSync(thumbnailDir, { recursive: true })`。

---

### Bug 12 [低] TypeORM Entity 未注册

`VideoMetric`、`FactorDefinition`、`DiagnosisReport` 三个实体文件存在但未在 `DatabaseModule` 中注册。目前对应模块使用 MockStore 所以不受影响，但迁移到 TypeORM 时会报 Entity not found 错误。

---

### Bug 13 [低] Demo 种子数据 bcrypt 占位符

**文件:** `scripts/seed-demo-data.sql:11`

```sql
'$2b$10$placeholder_demo_hash_replace_with_real_bcrypt'
```

无法通过密码登录 demo 用户。运行时由 `ensureGuestUser()` 补偿创建。

---

## 第二轮排查新发现 (2026-06-08)

| # | 严重程度 | 类别 | 问题简述 |
|---|---------|------|---------|
| 14 | **致命** | CORS | `CORS_ORIGIN` 逗号分隔字符串未 split，整个当单一 origin → 全不匹配 |
| 15 | **致命** | 构建 | 无 `.dockerignore`，构建上下文含 node_modules/.git |
| 16 | **致命** | 上传 | Nginx 无 `client_max_body_size`，默认 1MB 阻塞所有视频上传 |
| 17 | **致命** | 日志 | Docker 无 log rotation，日志无限增长填满磁盘 |
| 18 | **致命** | 监控 | MinIO/backend/worker/jaeger 无 health check |
| 19 | **高** | 配置 | `env_file` 指向 `../.env` 而非 `../.env.production` |
| 20 | **高** | 安全 | 多处 insecure 默认值 (JWT dev-secret, minioadmin 等)，若 env var 缺失则静默使用 |
| 21 | **高** | 资源 | 无 Docker memory/CPU limits，任一容器可占满服务器 |
| 22 | **高** | 安全 | 无 SSL/HTTPS 配置 (nginx 仅 HTTP 80) |
| 23 | **高** | 安全 | 无 rate limiting (登录爆破、API 滥用) |
| 24 | **高** | 备份 | 无数据库/MinIO 自动备份机制 |
| 25 | **中** | 超时 | axios timeout 30s 对视频上传太短 |
| 26 | **中** | 构建 | Dockerfile.frontend.prod 构建时未传入 VITE_* 变量 |

### Bug 14 [致命] CORS_ORIGIN 逗号分隔不生效

`.env.production` 设置 `CORS_ORIGIN=https://vidcraft.icu,https://www.vidcraft.icu`，但 `main.ts` 直接传给 cors 包。cors 包把整个字符串当作单一 origin 去精确匹配，永远匹配不上 → **所有跨域请求被拦截**。

**修复:** `process.env.CORS_ORIGIN.split(',').map(s => s.trim())` 转为数组。

### Bug 15 [致命] 无 .dockerignore

Docker 构建上下文包含 `node_modules/`, `.git/`, `docs/` 等大量无关文件。拖慢构建且浪费带宽。

**修复:** 创建 `.dockerignore` 排除 node_modules、.git、dist、docs 等。

### Bug 16 [致命] Nginx 无 client_max_body_size

Nginx 默认 `client_max_body_size 1m`。素材上传允许 200MB 视频，但 nginx 会在 1MB 就返回 413。

**修复:** `nginx.prod.conf` 添加 `client_max_body_size 500M`。

### Bug 17 [致命] Docker 无 log rotation

所有容器默认 `json-file` driver 无上限，AI API 调用日志极详细，数天可填满磁盘。

**修复:** `docker-compose.prod.yml` 每个 service 加 `logging: { options: { max-size, max-file } }`。

### Bug 18 [致命] 多服务无 health check

MinIO、backend、worker、jaeger 均无 health check。MinIO 未就绪时 backend 可能写失败，backend 挂了 nginx 还继续转发。

**修复:** 为所有 service 添加 health check，depends_on 用 `condition: service_healthy`。

### Bug 19-20 [高] env_file 指向错误 + 不安全默认值

`docker-compose.prod.yml` 的 `env_file: ../.env`，但服务器上应是 `.env.production`。

多处配置有硬编码的 insecure 默认值 (`dev-secret`、`minioadmin` 等) — 若 env var 缺失，系统静默使用不安全默认而非报错退出。

**修复:** `env_file` 改为 `../.env.production`。

### Bug 21-24 [高] 资源/安全/备份缺失

- 无 Docker memory/CPU limits → 任一容器可占满服务器
- 无 SSL → 明文传输 (可能由 Cloudflare 处理但未记录)
- 无 rate limiting → 登录可被暴力破解
- 无自动备份 → 数据可永久丢失

### Bug 25-26 [中] axios 超时 + VITE 构建变量

- `api.ts` axios timeout 30s 对 200MB 上传太短
- `Dockerfile.frontend.prod` 构建时未传 `ARG VITE_*`，不过 nginx 同源代理 `/api` 回退正确

---

## 修复状态

### 已修复 (本轮)
| Bug | 修复 |
|-----|------|
| 1 | `.env.production` + `MEDIA_PUBLIC_BASE` |
| 2 | `ViralReportDrawer` 移除 localhost:3000 |
| 3 | `docker-compose.prod.yml` + uploads 卷 |
| 4 | `Dockerfile.backend` + entrypoint.sh |
| 5 | `main.ts` CORS 限制 origin + split 逗号 |
| 6 | `volcano-api.service.ts` + callback_url |
| 7 | `video.module.ts` + VideoGateway |
| 8 | 端口统一为 80 |
| 9 | `.env.production` 补全变量 |
| 10 | `app.controller.ts` + DB ping |
| 11 | `viral-analyzer.service.ts` + mkdirSync |
| 14 | `main.ts` CORS comma split |
| 15 | 新建 `.dockerignore` |
| 16 | `nginx.prod.conf` + client_max_body_size |
| 17 | `docker-compose.prod.yml` + logging rotation |
| 18 | `docker-compose.prod.yml` + 全服务 health check |
| 19 | `docker-compose.prod.yml` env_file → .env.production |
| 21 | `docker-compose.prod.yml` + deploy.resources.limits |

### 待处理 (需运维配合)
| Bug | 说明 |
|-----|------|
| 20 | 安全默认值 — 建议在 entrypoint.sh 中验证关键 env var 非空 |
| 22 | SSL — 建议 Cloudflare Origin CA 或在 nginx 前加 certbot |
| 23 | Rate limiting — 建议 nginx `limit_req` 或 `@nestjs/throttler` |
| 24 | 备份 — 建议 cron + pg_dump 到 MinIO/S3 |
| 25 | axios timeout — 上传建议用单独 axios 实例设更长 timeout |
| 26 | VITE build args — 如前后端分离再处理
