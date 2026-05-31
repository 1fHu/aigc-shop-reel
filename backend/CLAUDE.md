# VidCraft Backend — 开发指南 (CLAUDE.md)

VidCraft 是一个面向 TikTok 电商的 AIGC 带货视频生成系统。本目录是其后端服务，基于 **NestJS 10 + TypeScript** 构建。本文件约定了后端的工作流、代码规范与必须遵守的红线，**实现任何功能前请先完整读一遍相关章节**。

---

## ⚠️ 第一红线：数据层已部分迁移到 PostgreSQL，Mock 与真实库并存

项目**已接入真实 PostgreSQL**（`DatabaseModule` 用 `TypeOrmModule.forRootAsync` 连接，`synchronize: false`，已注册实体 `User / Project / Material / Script / Video / VideoTask`）。但迁移**只完成了一半**，目前是「真实库 + 内存 Mock」混合态：

| 模块 | 主存储 | 说明 |
| --- | --- | --- |
| **已迁移 → PostgreSQL** | TypeORM Repository | `auth`(User) / `project` / `product` / `material` / `script` / `video`。Service 注入 `@InjectRepository(...)`，数据真正落库、重启不丢。 |
| **未迁移 → Mock 内存** | `MockStoreService` | `analytics` / `dashboard` / `gene-bank` / `viral-library` / `user`。仍是 seed 出来的 demo 数据，**重启即丢**。 |
| **Mock 兜底的临时态** | `MockStoreService` | 即便已迁移的 `auth`，其 **Refresh Token 黑名单、邮箱验证码、找回密码验证码**仍存在 Mock（这些没有实体/表，是设计上的内存态）。 |

> ℹ️ **休眠队列**：`queue/material-analysis.processor.ts` 已对齐 Postgres（注入 `materialRepo`，`QueueModule` 加了 `forFeature([Material])`），但素材现由 `product.parseImage` **同步**解析并落库（status=ready），**无人向该队列入队** → 处于休眠状态，保留以备恢复「上传后异步解析」链路时直接复用。

**改动数据模型时仍要保持「实体 + SQL」同步，否则迁移/重建库会漂移：**
1. `src/database/entities/<name>.entity.ts` 实体定义（属性 camelCase + `@Column({ name: 'snake_case' })`）。
2. `scripts/init-db.sql`（表结构）与 `scripts/seed-demo-data.sql`（如涉及种子数据）。
3. 若该模块**仍在 Mock**（analytics/dashboard/gene-bank/viral-library/user）或涉及 Mock 兜底态，还要同步 `mock-store.service.ts` 的 `XxxRecord` 字段与 CRUD。

> 历史漂移已修复：`Material` 实体/`init-db.sql` 已补上 `thumbnail_url` / `status` / `duration` / `slices`（连同 `embedding`）列。提交前自检：实体字段集合 = SQL 列集合（仍在 Mock 的模块再加一份 mock 同步）。

---

## 第二红线：文档优先 —— 实现任何功能前先查相关文档

`docs/` 目录是需求与契约的权威来源。**动手写代码前，先定位并阅读对应文档**，按下表对号入座：

| 文档 | 用途 / 何时必读 |
| --- | --- |
| `docs/API接口规范文档.md` | **接口契约（最常用）**。每个端点的路径、请求/响应字段、错误码、鉴权要求、分页参数。实现/修改任何接口前必读对应模块小节（M0~M9）。响应字段名、枚举值以此为准。 |
| `docs/DDD数据库设计文档.md` | 数据库设计。改数据模型前读，确认表/字段/关系。 |
| `docs/MDD模块设计文档.md` | 模块划分与职责边界。新增模块或跨模块协作前读。 |
| `docs/PRD产品需求文档.md` | 产品需求与业务规则（配额、限流、状态流转等业务约束）。 |
| `docs/TDD技术设计文档.md` | 技术设计（队列、AI 调用、向量化、MinIO、SSE 等技术方案）。 |
| `docs/VidCraft_前端期望后端补充_v1.0.md` | 前端联调反馈，字段命名/结构对齐要求。 |
| `docs/官方指导文档.md` | 项目整体背景。 |

约定：API 文档与代码冲突时，**以 API 文档为契约基准**；若文档确有错漏，先与用户确认再改文档。

---

## 技术栈

- **框架**：NestJS 10（`@nestjs/common|core|platform-express`）
- **语言**：TypeScript 5.4（`tsc --noEmit` 做类型检查）
- **鉴权**：JWT（`@nestjs/jwt` + `passport-jwt`），`AuthGuard('jwt')`
- **校验**：`class-validator` + `class-transformer`，全局 `ValidationPipe({ transform: true, whitelist: true })`
- **持久层（已接入）**：TypeORM 0.3 + `pg`（PostgreSQL，含 pgvector）。`DatabaseModule` 已建立真实连接，已迁移模块走 Repository（见第一红线）。
- **队列**：`@nestjs/bull`（底层 `bull` v4，**不是** bullmq）+ Redis。`material-analysis` 队列已注册、processor 已对齐 Postgres，但当前无人入队（休眠，见第一红线）；`video-generation` processor 仍是空 TODO，视频生成实际在 Service 内同步跑。
- **对象存储（已接入）**：MinIO，`common/minio-storage.service.ts`（`@Global`，自动建桶 + public-read 策略）。由 `product.service`（parse-image 落图）与 `material-analysis.processor`（下载文件）使用。
- **文件上传**：`multer`（`FilesInterceptor` / `FileInterceptor`，依赖已就绪）
- **可观测性**：OpenTelemetry（`src/tracing/tracing.ts`，启动时 `initTracing()`）
- **API 文档**：Swagger（`/api`）

---

## 目录结构

```
backend/src/
├── main.ts                     # 启动：全局 Pipe/Interceptor/Filter、CORS、Swagger、UTF-8 头
├── app.module.ts               # 根模块，聚合所有业务模块
├── common/
│   ├── api-response.ts         # ok() 响应包装器 + ApiResponse 类型
│   ├── mock-store.service.ts   # 未迁移模块的内存存储 + auth 临时态（详见第一红线）
│   ├── mock-store.module.ts    # @Global，全局注入 MockStoreService
│   ├── minio-storage.service.ts# ★对象存储（MinIO，@Global，自动建桶+public-read）★
│   ├── minio-storage.module.ts # @Global，全局注入 MinioStorageService
│   ├── decorators/             # @CurrentUser / @AllowGuest / @Roles / @TraceId
│   ├── guards/                 # jwt-auth / guest / roles
│   ├── filters/                # http-exception.filter.ts（统一错误响应）
│   └── interceptors/           # transform（统一成功响应）/ logging
├── config/                     # configuration / database / jwt / minio / redis / volcano 配置
├── database/
│   ├── database.module.ts      # ★已接入真实 Postgres（forRootAsync + forFeature）★
│   ├── entities/*.entity.ts    # ★TypeORM 实体（已迁移模块的主存储）★
│   └── migrations/             # TypeORM 迁移
├── modules/<feature>/          # 业务模块：controller + service + module (+ dto/)
│   └── auth/jwt.strategy.ts    # AuthenticatedUser 类型来源
├── queue/                      # material-analysis（休眠）/ video-generation（空 TODO）
├── redis/                      # Redis 客户端（@Global）
└── tracing/                    # OpenTelemetry 初始化

scripts/init-db.sql             # ★Postgres 建表 SQL★
scripts/seed-demo-data.sql      # ★Postgres 种子数据★
docs/                           # ★需求与接口契约文档★
```

每个业务模块的标准构成（参考 `modules/project/`、`modules/material/`）：
```
modules/<feature>/
├── <feature>.controller.ts   # 路由 + 鉴权 + 调 service，薄层
├── <feature>.service.ts      # 业务逻辑 + 校验；已迁移模块注入 Repository，未迁移模块注入 MockStoreService
├── <feature>.module.ts       # 装配 controller/service（迁移后需 TypeOrmModule.forFeature([...])）
└── dto/                      # 请求参数 DTO（class-validator）
```

---

## 统一响应与错误处理

**成功响应**：Controller 调 `ok(data, total?)`（来自 `common/api-response.ts`）返回统一信封：
```ts
return ok(items, total);   // 列表：total 传总数
return ok(detail);         // 非列表：total 默认 0
```
信封结构：`{ code: 200, msg: null, total, data, traceId }`。`TransformInterceptor` 会放行已是信封的返回值，也能把裸返回值兜底包装。SSE/流式接口用 `@RawResponse()` 装饰器跳过包装。

**错误响应**：**不要手动构造错误信封**，直接抛 Nest 内置异常，由 `HttpExceptionFilter` 统一转成 `{ code, msg, total:0, data:null, traceId }`：
```ts
throw new NotFoundException('项目不存在');     // -> code 404
throw new ForbiddenException('无权操作该项目'); // -> code 403
throw new BadRequestException('参数错误...');   // -> code 400
```
错误码语义见 `docs/API接口规范文档.md` 0.4 节（200/400/401/403/404/409/429/500/503）。

---

## 鉴权与当前用户

- 受保护接口加 `@UseGuards(AuthGuard('jwt'))`。
- 取当前用户用 `@CurrentUser() user: AuthenticatedUser`（`user.id` 即 JWT `sub`）。`AuthenticatedUser` 定义在 `modules/auth/jwt.strategy.ts`。
- **所有按用户隔离的资源都要做归属校验**：先取资源 → 不存在抛 `NotFoundException` → `resource.user_id !== user.id` 抛 `ForbiddenException`（参考 `project.service.ts` / `material.service.ts`）。

---

## 参数校验（DTO）

- 请求参数用 DTO + `class-validator` 装饰器，放在模块的 `dto/` 下。全局 `ValidationPipe` 已开启 `transform`（自动类型转换）和 `whitelist`（剥离未声明字段）。
- Query 数字参数需 `@Type(() => Number)` 才能从字符串转成 number（见 `ListProjectsDto` / `ListMaterialsDto`）。
- 字段命名与 API 文档保持一致（**snake_case**，如 `project_id`）。
- 校验失败消息用中文，给出可读原因（参考 `dto/update-product.dto.ts`）。

---

## 命名约定

- **对外 API 字段 / Mock Record 字段 / SQL 列名**：`snake_case`（如 `file_type`、`created_at`、`project_id`）。
- **TypeORM 实体属性**：`camelCase`，并用 `@Column({ name: 'snake_case' })` 映射到列。
- **类**：`PascalCase`；**文件名**：`kebab-case`（`material-analysis.processor.ts`）。
- 枚举值（如 `status`、`type`、因子 key）严格对齐 API 文档的英文 snake_case。

---

## 分页约定

列表接口在 **Service 层**完成分页，返回 `{ items, total }`，Controller 用 `ok(items, total)` 输出：
```ts
const total = all.length;
const offset = (page - 1) * limit;
const items = all.slice(offset, offset + limit).map(toApiShape);
return { items, total };
```
`total` 是过滤后的**总数**（不是当前页条数）。各接口默认 `page=1`，`limit` 见 API 文档（项目 20、素材 24）。

---

## 主数据层：TypeORM + PostgreSQL（已迁移模块）

- 实体在 `src/database/entities/`，建表在 `scripts/init-db.sql`，种子在 `scripts/seed-demo-data.sql`。
- `DatabaseModule` 已用 `TypeOrmModule.forRootAsync`（配置见 `config/database.config.ts` / `DATABASE_URL`）建立真实连接，`synchronize: false`（不自动改表，靠 `init-db.sql`/迁移）。已注册实体：`User / Project / Material / Script / Video / VideoTask`。
- 已迁移模块（auth/project/product/material/script/video）的 Service 注入 `@InjectRepository(Entity)`，模块里 `TypeOrmModule.forFeature([...])`。
- 内部实体属性是 camelCase，**映射 / 返回给前端时仍要转回 snake_case**（见各 service 的 `toApiShape`/map 写法），对外字段以 API 文档为准。
- 初始化/种子命令（在仓库根目录）：`npm run db:init` / `npm run db:seed`。跑业务需 Postgres 在线（`npm run dev:infra`）。

---

## 残留数据层：Mock Store（`common/mock-store.service.ts`）

- `@Global` 单例，多个 `Map<id, XxxRecord>` + 构造函数 seed 的 demo 数据（demo 用户 `00000000-0000-0000-0000-000000000001` 等）。**数据进程内存活，重启即丢失。**
- 仍在用它的地方：**未迁移模块** `analytics` / `dashboard` / `gene-bank` / `viral-library` / `user`；以及 `auth` 的**临时态**（Refresh Token 黑名单、邮箱验证码、找回密码验证码——这些无实体/表）。
- 这些模块的 Service 通过它读写；新增数据操作时在这里加 `XxxRecord` 字段 + CRUD 方法。**把某个 Mock 模块迁到 Postgres 时**：补/改实体 + `init-db.sql`，模块加 `forFeature`，Service 从 `store.*` 改成 Repository，再从 mock 里清掉对应 seed。
- 返回值习惯做浅拷贝（`{ ...record }`）避免外部改到内部状态。

---

## 实现一个新接口的标准流程（务必按此顺序）

1. **读文档**：在 `docs/API接口规范文档.md` 找到对应端点，确认路径、方法、鉴权、请求字段、响应字段、分页、错误码、枚举值。涉及数据结构再读 `DDD数据库设计文档.md`。
2. **DTO**：在 `modules/<feature>/dto/` 写请求 DTO，字段名/校验规则按文档（snake_case、必填/可选、长度/枚举）。
3. **数据层**：若需要新数据操作——
   - **已迁移模块**：改 `entities/<name>.entity.ts` + `scripts/init-db.sql`（必要时 `seed-demo-data.sql`），Service 用 `materialRepo`/`projectRepo` 等 Repository。
   - **未迁移模块（analytics/dashboard/gene-bank/viral-library/user）或 auth 临时态**：在 `mock-store.service.ts` 加/改 `XxxRecord` 字段与 CRUD，并同步实体 + SQL（为后续迁移留好对应）。
4. **Service**：写业务逻辑——归属校验（NotFound/Forbidden）、业务校验（BadRequest）、调用 Repository 或 store、把内部记录映射成**文档规定的响应字段形状**（camelCase→snake_case）；列表返回 `{ items, total }`。
5. **Controller**：加 `@UseGuards(AuthGuard('jwt'))`、`@CurrentUser()`、`@Body()/@Query()/@Param()` + DTO，调用 service，`ok(...)` 输出。文件上传见下节。
6. **Module**：确保 controller/service 已在模块里装配；用 Repository 的模块需 `TypeOrmModule.forFeature([Entity, ...])`（MockStoreService / MinioStorageService 因 `@Global` 无需 import）。
7. **校验质量**：`npm run type-check` + `npm run lint`（见命令）。
8. **测试**：在 `backend/test/app.e2e-spec.ts` 加端到端流程（含正常路径 + 关键错误路径），按下节方式跑。
9. **自检红线**：① mock 与实体/SQL 字段是否同步；② 响应字段是否与文档逐字一致；③ 错误码是否正确。

---

## 文件上传（multipart/form-data）

- 用 `@UseInterceptors(FilesInterceptor('files'))`（多文件）或 `FileInterceptor('field')`（单文件），配 `@UploadedFiles()` / `@UploadedFile()`，类型 `Express.Multer.File`。
- 非文件字段（如 `project_id`）仍走 `@Body() dto`，全局 ValidationPipe 会校验。
- **大小/类型/数量限制在 Service 层校验并抛 `BadRequestException`**（给出含文件名的中文提示），不要只依赖 multer 的 limits（multer 抛的错不是 HttpException，会变 500）。
- **真实存储（MinIO）已接入**：`MinioStorageService`（`@Global`，自动建桶 + public-read）。`product.service.parseImage()` 会把商品图 `putObject` 落盘并返回真实 URL；processor 用 `minio.downloadFile()` 取回 buffer。新增上传落盘时注入 `MinioStorageService` 即可。
- **底层 Doubao 调用已接入真实 API**（`volcano-api.service.ts`）：Vision 打标、Embedding 向量、Seedance 视频生成都已是真实 HTTP 调用，仅在 API Key / endpoint 缺失时降级到桩/模板。
- ⚠️ **素材已无独立上传端点**：`material.controller` 只剩 list/search/get/tags/delete，**没有 `POST /api/materials/upload`**。素材现由商品图解析流程（`POST /api/products/:project_id/parse-image` → `product.service` 同步调 Doubao Vision + 落 MinIO + `materialRepo.save`）创建。下节「异步 AI 解析」描述的旧上传链路已废弃。

---

## 常用命令

在 `backend/` 下：
```bash
npm run start:dev     # 开发热重载（nest build + nodemon）
npm run build         # nest build
npm run type-check    # tsc --noEmit（提交前必跑）
npm run lint          # eslint（提交前必跑）
npm run test          # 单元测试
npm run test:e2e      # 端到端测试（注意下方 --forceExit 提示）
```
在仓库根目录：
```bash
npm run dev:infra     # 启动 postgres/redis/minio/jaeger（docker compose）
npm run dev:backend   # 等价于 backend 的 start:dev
npm run db:init       # 初始化真实库表结构（scripts/init-db.sql）
npm run db:seed       # 灌入种子数据（scripts/seed-demo-data.sql）
```

---

## 测试与验证

- e2e 测试在 `backend/test/app.e2e-spec.ts`，用 supertest 打真实 HTTP；文件上传用 `.field(...)` + `.attach('files', Buffer, { filename, contentType })`。
- **已知坑：e2e 测试结束后 jest 不会自动退出**——因为 Redis/BullMQ/OpenTelemetry 等句柄未关闭（测试也没调 `app.close()`）。跑的时候用 `npx jest --config ./test/jest-e2e.json --forceExit`（必要时加 `--runInBand`），否则进程会挂住。
- e2e 启动会加载整个 `AppModule`：现在 `DatabaseModule` 已连真实 Postgres，所以**需要 Postgres + Redis 同时在线**（`npm run dev:infra` 一并起好），否则已迁移模块（auth/project/material/...）会因连不上库而失败；未迁移模块仍走 Mock Store。库表/种子用 `npm run db:init` / `npm run db:seed` 准备。
- UI/前端联调类改动：本目录只负责后端；按 `docs/VidCraft_前端期望后端补充_v1.0.md` 对齐字段后，由前端联调验证。

---

## AI 调用（Doubao / Seedance）—— 已接入真实 API

所有 AI 能力集中在 `modules/volcano/volcano-api.service.ts`，均为真实 HTTP 调用（`https://ark.cn-beijing.volces.com/api/v3/...`），**仅在 `VOLCANO_ACCESS_KEY` / endpoint 环境变量缺失时降级**：

| 方法 | 用途 | 降级行为 |
| --- | --- | --- |
| `analyzeProductImage()` / `callDoubaoVision()` | 商品图 → 结构化商品信息 | 无 Key 时返回桩结果 |
| `analyzeMaterial()` | 素材 → Vision 打标 + Embedding(1024 维) 向量 | 无 Key 时返回桩 |
| `generateScript()` | 商品 → 分镜脚本（配合 `script/director-agent.service.ts`，无 Key 时走「商品感知模板」降级） | 见 director-agent |
| `generateVideo()`（Seedance 1.5 Pro，支持多参考图）+ `getVideoTaskStatus()` | 分镜 prompt + 参考图 → 视频任务，轮询取片 | 无 Key 时 mock |

**素材的实际创建路径（注意：旧的 `/api/materials/upload` 异步链路已废弃）：**
```
POST /api/products/:project_id/parse-image  （multipart 商品图）
  └─ ProductService.parseImage(): minio.putObject 落盘
        ├─ volcano.analyzeProductImage()      ← 真实 Doubao Vision（同步）
        └─ materialRepo.save()                ← 素材直接落 Postgres（status=ready）
```
即素材解析现在是**同步**在 parse-image 里完成并落库，不再经队列。

**视频生成链路（同步，不走队列）：**
```
POST /api/videos/generate
  └─ VideoService.generate(): 取 ready 素材 → 建 Video + 每镜 VideoTask(queued)
        └─（service 内逐镜顺序执行，非 BullMQ）
              ├─ volcano.generateVideo() 提交 Seedance → 轮询 getVideoTaskStatus()（MAX_SHOT_POLLS=120）
              ├─ downloadShot() 下载片段 → 每镜 status=completed + previewUrl
              └─ composite(): ffmpeg concat 拼接所有片段 → 成片 videoUrl，Video.status=completed
前端轮询 GET /api/videos/:id/status 观察逐镜进度（暂无 WebSocket 推送，video.gateway.ts 仍是 TODO）。
```

**休眠 / 空置队列**（不在主链路）：
- `queue/material-analysis.processor.ts`：`@nestjs/bull`（底层 `bull` v4，**非 bullmq**），`@Process()` 里 `materialRepo.findOne` + `minio.downloadFile` + `volcano.analyzeMaterial` + `materialRepo.update`。已对齐 Postgres，但**无端点入队** → 休眠；恢复异步解析时重新接入入队点即可。
- `queue/video-generation.processor.ts`：空 `TODO`，视频生成实为 Service 内同步执行。

## 待办 / 已知未实现（Roadmap）

**✅ 已完成（原 Roadmap 项）**：真实 Doubao Vision/Embedding/Seedance 调用、MinIO 真实存储、`Material` 实体/SQL 补齐 `status`/`thumbnail_url`/`duration`/`slices` 列（漂移已修）。

**仍未完成 / 已知缺口：**
- **未迁移到 Postgres 的模块**：`analytics` / `dashboard` / `gene-bank` / `viral-library` / `user` 仍走 Mock Store，重启丢数据，需逐个迁到 Repository。
- **休眠/空置队列**：`material-analysis.processor` 已对齐 Postgres 但无人入队（休眠）；`video-generation.processor` 为空 TODO。
- **AI 诊断未实现**：`analytics/analyst-agent.service.ts` 整段 TODO，视频效果诊断目前返回 Mock 数据。
- **实时进度推送**：`video.gateway.ts` WebSocket 推送是 TODO，前端仍靠轮询 `GET /api/videos/:id/status`。
- **Python worker 未集成**：`worker/`（FFmpeg 合成/场景切片的独立 Python 服务）存在，但 backend 自己 inline 调 ffmpeg，worker 当前未被调用；`material_slices` 场景切片也未生成。
- **素材向量检索未接入**：`material.service.search()` 已实现 keyword + tag 过滤（score 返回 null），但 `vector`/`hybrid` 模式与 `slice` 粒度仍待补（依赖 pgvector 与 `material_slices`）。
- **文本素材**（产品已决定「先记入待办，暂不做」）：允许上传纯文本（卖点/评价/话术）。建议新增 `file_type: 'text'`、文本存 `content` 列、跳过 Vision 直接走 Embedding。落地前先扩展 `docs/API接口规范文档.md` 契约，并同步 entity/SQL 与前端 UI。

---

## 易错点速查

- ❌ 改了 mock 字段忘了改实体/SQL（或反之）→ 违反第一红线。
- ❌ 没读 API 文档就臆测响应字段名/结构 → 前端解包失败。
- ❌ 手动拼错误响应 → 应抛 Nest 异常交给 filter。
- ❌ Query 数字参数没加 `@Type(() => Number)` → 校验或分页异常。
- ❌ 漏做资源归属校验（user_id）→ 越权读写。
- ❌ 直接依赖 multer limits 当作校验 → 触发 500 而非 400。
- ❌ 跑 e2e 不加 `--forceExit` → 进程挂起，误以为卡死。
