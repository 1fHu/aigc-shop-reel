# VidCraft Backend — 开发指南 (CLAUDE.md)

VidCraft 是一个面向 TikTok 电商的 AIGC 带货视频生成系统。本目录是其后端服务，基于 **NestJS 10 + TypeScript** 构建。本文件约定了后端的工作流、代码规范与必须遵守的红线，**实现任何功能前请先完整读一遍相关章节**。

---

## ⚠️ 第一红线：当前是 Mock 数据库，两份数据存储格式必须同步更新

项目目前**没有连接真实数据库**，所有业务数据都存放在内存 Mock 存储中。但代码里**同时保留了未来要迁移到的真实数据库定义**。这意味着任何涉及数据结构的改动（新增字段、改字段名、改类型、新增实体等）**必须同时改两个地方，否则迁移时会出现 schema 漂移**：

| 数据形态 | 位置 | 说明 |
| --- | --- | --- |
| **当前生效：Mock 存储** | `src/common/mock-store.service.ts` | 内存 `Map` + `XxxRecord` 类型定义 + CRUD 方法。所有 Service 现在都依赖它。字段命名为 **snake_case**（与 API 对外字段一致）。 |
| **未来生效：真实数据库** | `src/database/entities/*.entity.ts` + `scripts/init-db.sql` + `scripts/seed-demo-data.sql` | TypeORM 实体（属性 camelCase、`@Column({ name: 'snake_case' })` 映射列名）+ Postgres 建表 SQL + 种子数据。 |

**规则：改动数据模型时，按以下三处同步修改并保持字段一致：**
1. `mock-store.service.ts` 里对应的 `XxxRecord` 类型 + 相关 CRUD 方法（含构造函数里的 seed 示例数据）。
2. `src/database/entities/<name>.entity.ts` 实体定义。
3. `scripts/init-db.sql`（表结构）与 `scripts/seed-demo-data.sql`（如涉及种子数据）。

> 注意：当前两份定义**已经存在漂移**（例如 `Material` 实体缺少 mock 里有的 `thumbnail_url`/`status`/`duration`/`slices` 字段）。新增字段时优先把缺的补齐，不要扩大漂移。提交前自检：mock 的 `XxxRecord` 字段集合 ⊆/= 实体+SQL 的列集合。

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
- **持久层（未来）**：TypeORM 0.3 + `pg`（PostgreSQL，含 pgvector）
- **队列（已配置，尚未接入业务）**：`@nestjs/bull` + `bullmq` + Redis
- **对象存储（已配置，尚未接入业务）**：MinIO（`src/config/minio.config.ts`，未注册为 provider）
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
│   ├── mock-store.service.ts   # ★当前数据库（内存 Map）★
│   ├── mock-store.module.ts    # @Global，全局注入 MockStoreService
│   ├── decorators/             # @CurrentUser / @AllowGuest / @Roles / @TraceId
│   ├── guards/                 # jwt-auth / guest / roles
│   ├── filters/                # http-exception.filter.ts（统一错误响应）
│   └── interceptors/           # transform（统一成功响应）/ logging
├── config/                     # configuration / database / jwt / minio / redis / volcano 配置
├── database/
│   ├── database.module.ts      # 目前为空壳（未接入真实 TypeORM 连接）
│   ├── entities/*.entity.ts    # ★未来数据库实体★
│   └── migrations/             # TypeORM 迁移
├── modules/<feature>/          # 业务模块：controller + service + module (+ dto/)
│   └── auth/jwt.strategy.ts    # AuthenticatedUser 类型来源
├── queue/                      # BullMQ 队列与 processor（material-analysis / video-generation，均为 TODO 桩）
├── redis/                      # Redis 客户端（@Global）
└── tracing/                    # OpenTelemetry 初始化

scripts/init-db.sql             # ★未来数据库建表 SQL★
scripts/seed-demo-data.sql      # ★未来数据库种子数据★
docs/                           # ★需求与接口契约文档★
```

每个业务模块的标准构成（参考 `modules/project/`、`modules/material/`）：
```
modules/<feature>/
├── <feature>.controller.ts   # 路由 + 鉴权 + 调 service，薄层
├── <feature>.service.ts      # 业务逻辑 + 校验，依赖 MockStoreService
├── <feature>.module.ts       # 装配 controller/service
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

## 当前数据层：Mock Store（`common/mock-store.service.ts`）

- 是一个 `@Global` 单例，用多个 `Map<id, XxxRecord>` 存数据；构造函数里 seed 了一套 demo 数据（demo 用户 `00000000-0000-0000-0000-000000000001`、demo 项目/素材/剧本/视频等）。
- **数据进程内存活，重启即丢失**（Refresh Token、上传记录等都是内存态）。
- 所有 Service 通过它读写数据；新增数据操作时在这里加 `XxxRecord` 字段 + CRUD 方法，**并记得同步实体与 SQL（见第一红线）**。
- 返回值习惯做浅拷贝（`{ ...record }`）避免外部改到内部状态。

---

## 未来数据层：TypeORM + PostgreSQL

- 实体在 `src/database/entities/`，建表在 `scripts/init-db.sql`，种子在 `scripts/seed-demo-data.sql`。
- `DatabaseModule` 目前是空壳，**尚未建立真实连接**——所以现在改实体只是“为迁移做准备”，不影响运行时（运行时只认 Mock Store）。
- 迁移到真实库时：在 `DatabaseModule` 接入 `TypeOrmModule.forRootAsync`（配置见 `config/database.config.ts`），各模块注册 `TypeOrmModule.forFeature([...])`，把 Service 从 `MockStoreService` 切到 Repository。
- 初始化/种子命令（在仓库根目录）：`npm run db:init` / `npm run db:seed`。

---

## 实现一个新接口的标准流程（务必按此顺序）

1. **读文档**：在 `docs/API接口规范文档.md` 找到对应端点，确认路径、方法、鉴权、请求字段、响应字段、分页、错误码、枚举值。涉及数据结构再读 `DDD数据库设计文档.md`。
2. **DTO**：在 `modules/<feature>/dto/` 写请求 DTO，字段名/校验规则按文档（snake_case、必填/可选、长度/枚举）。
3. **数据层**：若需要新数据操作——
   - 在 `mock-store.service.ts` 加/改 `XxxRecord` 字段与 CRUD 方法；
   - **同步**更新 `entities/<name>.entity.ts`、`scripts/init-db.sql`（必要时 `seed-demo-data.sql`）。
4. **Service**：写业务逻辑——归属校验（NotFound/Forbidden）、业务校验（BadRequest）、调用 store、把内部记录映射成**文档规定的响应字段形状**；列表返回 `{ items, total }`。
5. **Controller**：加 `@UseGuards(AuthGuard('jwt'))`、`@CurrentUser()`、`@Body()/@Query()/@Param()` + DTO，调用 service，`ok(...)` 输出。文件上传见下节。
6. **Module**：确保 controller/service 已在模块里装配（MockStoreService 因 `@Global` 无需 import）。
7. **校验质量**：`npm run type-check` + `npm run lint`（见命令）。
8. **测试**：在 `backend/test/app.e2e-spec.ts` 加端到端流程（含正常路径 + 关键错误路径），按下节方式跑。
9. **自检红线**：① mock 与实体/SQL 字段是否同步；② 响应字段是否与文档逐字一致；③ 错误码是否正确。

---

## 文件上传（multipart/form-data）

- 用 `@UseInterceptors(FilesInterceptor('files'))`（多文件）或 `FileInterceptor('field')`（单文件），配 `@UploadedFiles()` / `@UploadedFile()`，类型 `Express.Multer.File`。
- 非文件字段（如 `project_id`）仍走 `@Body() dto`，全局 ValidationPipe 会校验。
- **大小/类型/数量限制在 Service 层校验并抛 `BadRequestException`**（给出含文件名的中文提示），不要只依赖 multer 的 limits（multer 抛的错不是 HttpException，会变 500）。素材上传限制示例见 `material.service.ts`（≤20 个文件，图片 JPG/PNG/WEBP ≤20MB，视频 MP4/MOV/AVI ≤500MB）。
- 真实存储（MinIO）与异步 AI 解析（BullMQ `material-analysis` 队列）目前是**桩**：上传后 `status` 置 `parsing`，文件 URL 用占位，队列 processor 是 TODO。接入真实存储时再按 `TDD技术设计文档.md` 落地。

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
- e2e 启动会加载整个 `AppModule`：需要 Redis 在线（`npm run dev:infra`）。`DatabaseModule` 是空壳，所以**不需要 Postgres 也能跑通**业务逻辑（数据走 Mock Store）。
- UI/前端联调类改动：本目录只负责后端；按 `docs/VidCraft_前端期望后端补充_v1.0.md` 对齐字段后，由前端联调验证。

---

## 易错点速查

- ❌ 改了 mock 字段忘了改实体/SQL（或反之）→ 违反第一红线。
- ❌ 没读 API 文档就臆测响应字段名/结构 → 前端解包失败。
- ❌ 手动拼错误响应 → 应抛 Nest 异常交给 filter。
- ❌ Query 数字参数没加 `@Type(() => Number)` → 校验或分页异常。
- ❌ 漏做资源归属校验（user_id）→ 越权读写。
- ❌ 直接依赖 multer limits 当作校验 → 触发 500 而非 400。
- ❌ 跑 e2e 不加 `--forceExit` → 进程挂起，误以为卡死。
