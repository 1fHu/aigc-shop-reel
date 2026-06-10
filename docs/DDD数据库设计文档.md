**VidCraft**

AIGC 带货视频生成系统

**数据库设计文档**

| 项目        | 内容 |
| --- | --- |
| **文档版本** | v1.2 |
| **状态**     | 正式版（v1.2：基于前端联调反馈同步更新因子 Key 编码、scripts/videos 表结构、JSONB 子模式） |
| **数据库**   | PostgreSQL 16 |
| **必备扩展** | `vector`（pgvector ≥ 0.7）、`uuid-ossp` |
| **字符集**   | UTF-8（`LC_COLLATE=en_US.UTF-8`） |
| **时区**     | `TIMESTAMPTZ`（UTC 存储） |
| **配套文档** | 《VidCraft 技术方案文档 v2.0》《VidCraft API 接口规范文档 v1.0》《VidCraft 需求分析文档 v2.0》 |

---

# 0. 全局约定

## 0.1 数据库与扩展

VidCraft 选择 PostgreSQL 16 作为唯一持久层。除内置能力外，强制启用以下扩展：

| 扩展 | 版本 | 用途 |
| --- | --- | --- |
| **`uuid-ossp`** | 内置 | 通过 `uuid_generate_v4()` 生成主键，避免业务侧维护 ID 序列 |
| **`vector`（pgvector）** | ≥ 0.7 | 提供 `vector` 数据类型与 HNSW 索引，承载 1024 维 Doubao Embedding 检索 |

> ⚠️ **pgvector 维度一旦写入索引便不可修改**（变更需 `DROP INDEX` 后重建）。所有 embedding 列严格采用 `vector(1024)`，与 Doubao Embedding 实际输出对齐（v1.0 已修正 v0.x 的 1536 维错误）。

## 0.2 命名规范

| 对象 | 规范 | 示例 |
| --- | --- | --- |
| 表名 | 小写复数 + 下划线 | `users` / `material_slices` |
| 列名 | 小写 + 下划线（`snake_case`） | `created_at` / `password_hash` |
| 主键 | 一律 `id`，类型 `UUID`，默认 `uuid_generate_v4()` | `id UUID PRIMARY KEY` |
| 外键 | `<目标表单数>_id` | `project_id`、`script_id` |
| 索引 | `idx_<表名>_<列名>[_<列名>]` | `idx_videos_project_id` |
| HNSW 索引 | `idx_<表名>_embedding` | `idx_materials_embedding` |
| 唯一约束 | `uq_<表名>_<列名>` | （目前仅使用列级 `UNIQUE`） |
| 时间戳 | 创建 `created_at`、更新 `updated_at`，类型 `TIMESTAMPTZ` | 自动维护，见 0.3 |

## 0.3 通用列约定

VidCraft 全部业务表统一保留以下设计：

| 列 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| **`id`** | `UUID` | `uuid_generate_v4()` | 主键。所有跨服务/外部引用均使用 UUID，避免暴露自增 ID |
| **`created_at`** | `TIMESTAMPTZ` | `NOW()` | 记录创建时间。TypeORM `@CreateDateColumn` 自动注入 |
| **`updated_at`** | `TIMESTAMPTZ` | `NOW()` | 仅"可更新"的表保留。TypeORM `@UpdateDateColumn` 自动维护 |

> 仅一次性写入、不再修改的表（`material_slices` / `video_metrics` / `viral_genes` / `factor_definitions` / `diagnosis_reports`）不保留 `updated_at`。

## 0.4 字段类型规约

| 业务语义 | PostgreSQL 类型 | 备注 |
| --- | --- | --- |
| 主键 / 外键 | `UUID` | 始终使用 UUID v4，禁用 `BIGSERIAL` |
| 短文本（名称 / URL / 状态） | `VARCHAR(255)` 或更短 | `name VARCHAR(100)`、`status VARCHAR(20)` 等 |
| 长文本 | `TEXT` | 描述、剧本正文、错误堆栈 |
| 半结构化 | `JSONB` | 详见第 3 章；统一以 `JSONB` 存储以获得索引能力 |
| 标签数组 | `TEXT[]` | 仅 `materials.tags` 一处使用原生数组（避免再起子表） |
| 数值（评分 / 时长 / 概率） | `FLOAT` | 完播率 / 转化率 / 性能分等，取值范围 0–1 或秒 |
| 计数 | `INTEGER` | 配额、播放量、重试次数 |
| 时间戳 | `TIMESTAMPTZ` | 全部 UTC，前端转换本地时区 |
| 向量 | `vector(1024)` | pgvector 类型，参见第 5 章 |

## 0.5 主键、唯一与外键策略

* **主键**：所有业务表 `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`。
* **业务唯一**：`users.email` 全局唯一；`video_metrics.video_id` 唯一（1:1 关系，详见 2.9）。
* **外键级联规则**：

  | 父表 → 子表 | 删除行为 | 设计原因 |
  | --- | --- | --- |
  | `users` → `projects` | `ON DELETE CASCADE` | 用户注销时连带删除其全部项目数据，符合 GDPR/最小化保留原则 |
  | `projects` → `materials` / `scripts` / `videos` | `ON DELETE CASCADE` | 项目是工作空间根节点，删项目即清场 |
  | `materials` → `material_slices` | `ON DELETE CASCADE` | 切片不脱离母片独立存在 |
  | `videos` → `video_tasks` / `video_metrics` / `diagnosis_reports` | `ON DELETE CASCADE` | 视频的衍生记录随视频删除 |
  | `scripts` → `videos` | `ON DELETE SET NULL` | 视频已生成后允许独立保留，剧本被删则保留视频但解除引用，避免误删剧本带走成片 |

* **软删除**：当前版本**不引入**全表软删除字段。`materials` 的用户故事中提到的"软删除"由业务侧通过状态字段实现（后续 v1.1 可能新增 `deleted_at TIMESTAMPTZ NULL` 全表通用列）。

## 0.6 与业务模块的对应

| 模块代号 | 业务名称 | 主导表 | 附属表 |
| --- | --- | --- | --- |
| **M0** | 游客 / 演示模式 | `users`（预置 demo 行） | 全部预置 seed 数据 |
| **M1** | 用户认证与账户 | `users` | — |
| **M2** | 项目管理 | `projects` | — |
| **M3** | 商品解析 | `projects`（`product_info` JSONB） | — |
| **M4** | 素材库 | `materials` | `material_slices` |
| **M5** | 剧本生成 | `scripts` | `factor_definitions` |
| **M6** | 视频创作 | `videos` | `video_tasks` |
| **M7** | 数据看板与诊断 | `video_metrics` | `diagnosis_reports` |
| **M8** | 爆款基因库 | `viral_genes` | — |
| **M9** | 优质视频库 | `viral_library` | — |

---

# 1. 数据库总览

## 1.1 ER 关系图（Mermaid）

```mermaid
erDiagram
    users ||--o{ projects : "owns"
    projects ||--o{ materials : "contains"
    projects ||--o{ scripts : "produces"
    projects ||--o{ videos : "renders"
    materials ||--o{ material_slices : "split into"
    scripts ||--o{ videos : "referenced by"
    videos ||--o{ video_tasks : "fan-out shots"
    videos ||--|| video_metrics : "1:1 metrics"
    videos ||--o{ diagnosis_reports : "diagnoses"
    factor_definitions ||..o{ scripts : "drives factor replacement"
    viral_library ||..o{ viral_genes : "clustered into"
    viral_genes ||..o{ scripts : "referenced by Director Agent"
```

> 实线为强外键引用，虚线为业务侧逻辑引用（无数据库外键）。

## 1.2 表索引

| # | 表名 | 行级粒度 | 主要外键 | 包含向量 | 业务模块 |
| --- | --- | --- | --- | --- | --- |
| 1 | `users` | 用户 | — | 否 | M0 / M1 |
| 2 | `projects` | 项目 | `user_id → users.id` | 否 | M2 / M3 |
| 3 | `materials` | 素材（图片/视频文件） | `project_id → projects.id` | ✅ `vector(1024)` | M4 |
| 4 | `material_slices` | 视频切片 | `material_id → materials.id` | ✅ `vector(1024)` | M4 |
| 5 | `scripts` | 剧本 | `project_id → projects.id` | 否 | M5 |
| 6 | `videos` | 生成视频 | `project_id`、`script_id` | 否 | M6 |
| 7 | `video_tasks` | 分镜级生成任务 | `video_id → videos.id` | 否 | M6 |
| 8 | `video_metrics` | 视频效果指标（1:1） | `video_id → videos.id` | 否 | M7 |
| 9 | `viral_genes` | 爆款基因（聚类层） | — | ✅ `vector(1024)` | M8 |
| 10 | `viral_library` | 优质视频拆解条目 | — | ✅ `vector(1024)` | M9 |
| 11 | `factor_definitions` | 创作因子维度字典 | — | 否 | M5 |
| 12 | `diagnosis_reports` | AI 诊断报告 | `video_id → videos.id` | 否 | M7 |

---

# 2. 表详述

每一节包含：① 业务定位 ② 字段定义表 ③ 索引清单 ④ 约束与级联 ⑤ 与 API 的映射 ⑥ 示例行 ⑦ 典型 SQL。

## 2.1 `users`（M1）

> **业务定位**：账户与配额的唯一来源；M0 游客模式同样以一行预置记录（`a0000000-0000-0000-0000-000000000001`）落地，不引入独立游客表，方便复用既有鉴权链路。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | 全局账户标识，对外暴露 |
| `email` | `VARCHAR(255)` | ❌ | — | **UNIQUE** | 登录名；游客账号统一使用 `demo@vidcraft.icu` |
| `password_hash` | `VARCHAR(255)` | ❌ | — | — | **bcrypt cost = 10**，禁止明文/可逆加密 |
| `nickname` | `VARCHAR(100)` | ✅ | NULL | — | 显示名；游客默认为「演示商家」 |
| `avatar_url` | `VARCHAR(500)` | ✅ | NULL | — | 指向 MinIO/`vidcraft-media` 桶内对象 |
| `plan_type` | `VARCHAR(20)` | ❌ | `'free'` | 枚举：`free` / `pro`（详见 6.1） | 套餐类型 |
| `video_quota` | `INTEGER` | ❌ | `3` | `>= 0` | 当月剩余生成配额；游客固定 `2/会话` 由业务层兜底，不写库 |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |
| `updated_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `users_pkey` | B-tree | `id` | 主键 |
| `users_email_key` | B-tree（唯一） | `email` | 列级 `UNIQUE` 自动创建 |

**API 映射**：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/profile`、`POST /api/auth/guest-login`。

**示例行**

```sql
INSERT INTO users (id, email, password_hash, nickname, plan_type, video_quota)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'demo@vidcraft.icu',
  '$2b$10$....',  -- bcrypt hash of 'demo1234'
  '演示商家',
  'free',
  3
);
```

**典型 SQL**

```sql
-- 登录鉴权
SELECT id, password_hash, plan_type, video_quota
FROM users
WHERE email = $1;

-- 扣减配额（生成视频成功后）
UPDATE users
SET video_quota = video_quota - 1, updated_at = NOW()
WHERE id = $1 AND video_quota > 0
RETURNING video_quota;
```

---

## 2.2 `projects`（M2 / M3）

> **业务定位**：用户的工作空间。承载 M3 商品解析结果（`product_info` JSONB），所有素材、剧本、视频均挂在某个 project 下。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `user_id` | `UUID` | ❌ | — | **FK → `users.id`** `ON DELETE CASCADE` | 项目归属 |
| `name` | `VARCHAR(100)` | ❌ | — | 长度 2–50（应用层校验） | 项目名 |
| `description` | `TEXT` | ✅ | NULL | ≤ 200 字符 | 项目说明 |
| `product_url` | `VARCHAR(500)` | ✅ | NULL | — | 商品页 URL，M3 解析来源 |
| `product_info` | `JSONB` | ✅ | NULL | 见 3.1 | 解析或手填的结构化商品信息 |
| `status` | `VARCHAR(20)` | ❌ | `'draft'` | 枚举：见 6.2 | 工作流状态 |
| `views` | `INTEGER` | ❌ | `0` | — | 该项目下视频累计播放量 |
| `render_progress` | `INTEGER` | ❌ | `0` | 0–100 | 渲染进度百分比，状态为 in\_progress 时进度条用 |
| `tiktok_ready` | `BOOLEAN` | ❌ | `FALSE` | — | 是否达到 TikTok 发布标准 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `projects_pkey` | B-tree | `id` | 主键 |
| `idx_projects_user_id` | B-tree | `user_id` | 列项目列表的核心查询路径 |

**Product Info**
  {
    "name": "商品名",
    "category": "品类(fashion/beauty/home/electronics/food/sports/other)",
    "selling_points": ["卖点1", "卖点2"],
    "target_audience": "目标人群",
    "usage_scene": "使用场景",
    "price_anchor": "价格",
    "cover_url": "https://.../xxx.jpg"   // 额外塞进来一份
  }



> 后续若加入「按状态筛选 / 全文搜索项目名」热点，可补充 `idx_projects_status` 或 `GIN(to_tsvector('simple', name))`。

**约束与级联**：父级 `users` 删除时级联删除项目，并由 `materials` / `scripts` / `videos` 进一步级联清理。

**API 映射**：`POST /api/projects`、`GET /api/projects[/:id]`、`PUT /api/projects/:id`、`DELETE /api/projects/:id`、`PUT /api/products/:project_id`、`POST /api/products/:project_id/confirm`。

**典型 SQL**

```sql
-- 项目列表 + 视频计数（卡片展示）
SELECT p.id, p.name, p.status, p.views, p.tiktok_ready, p.updated_at,
       (SELECT COUNT(*) FROM videos v WHERE v.project_id = p.id) AS video_count
FROM projects p
WHERE p.user_id = $1
ORDER BY p.updated_at DESC
LIMIT 20 OFFSET $2;

-- 更新解析后的商品信息（JSONB 局部更新）
UPDATE projects
SET product_info = product_info || $2::jsonb,
    status = 'confirmed',
    updated_at = NOW()
WHERE id = $1;
```

---

## 2.3 `materials`（M4）

> **业务定位**：用户上传的原始素材（图 / 视频）。整段素材保留一份多模态分析摘要 + 向量；按场景切割后的细粒度数据存入 `material_slices`。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `project_id` | `UUID` | ❌ | — | **FK → `projects.id`** `ON DELETE CASCADE` | 所属项目 |
| `file_url` | `VARCHAR(500)` | ❌ | — | — | MinIO 对象 URL（`vidcraft-media/<user>/<project>/...`） |
| `file_type` | `VARCHAR(20)` | ❌ | — | 枚举：`image` / `video` | 详见 6.7 |
| `file_name` | `VARCHAR(255)` | ✅ | NULL | — | 原始文件名 |
| `file_size` | `INTEGER` | ✅ | NULL | 单位 Byte | 图 ≤ 20 MB、视频 ≤ 500 MB（应用层） |
| `analysis` | `JSONB` | ✅ | NULL | 见 3.9 | Doubao Vision 多模态理解摘要 |
| `embedding` | `vector(1024)` | ✅ | NULL | — | 整段素材的 Doubao Embedding |
| `tags` | `TEXT[]` | ✅ | NULL | — | AI 提取 + 人工补充的标签 |
| `thumbnail_url` | `VARCHAR(500)` | ✅ | NULL | — | 缩略图 URL（图片取自身，视频取首帧）；列表/卡片展示用 |
| `status` | `VARCHAR(20)` | ❌ | `'parsing'` | 枚举：`parsing` / `ready` / `failed` | AI 解析状态：上传即 `parsing`，`material-analysis` processor 完成置 `ready`，异常置 `failed` |
| `duration` | `FLOAT` | ✅ | NULL | — | 视频时长（秒），图片为 NULL |
| `slices` | `JSONB` | ✅ | `'[]'` | — | ⚠️ **实现态的内联切片快照**（见下方说明）；语义上的切片权威表是 `material_slices` |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

> **v1.2 实现对齐（与 `entities/material.entity.ts` + `scripts/init-db.sql` 一致）**：
> 1. 实体/SQL 额外含 `thumbnail_url` / `status` / `duration` / `slices` 四列（API 文档 M4 的 list/detail 依赖），已补入上表。提交前自检：实体字段集合 = SQL 列集合 = 本表。
> 2. `embedding`：DB/SQL 为 `vector(1024)`；TypeORM 无原生 pgvector 类型，实体里**声明为 `varchar`**（务实折衷）。写入时 `analyzeMaterial` 产出 `JSON.stringify(vec)`（`[0.1,...]` 文本，恰为 pgvector 接受的输入格式），HNSW 索引与 `<=>` 检索在 DB 层不受影响。
> 3. `slices` 列与独立表 `material_slices`（§2.4）当前**并存**：实体只映射了内联 `slices` JSONB，`material_slices` 表已建但暂无实体、未写入。视频切片正式落地后应以 `material_slices` 为权威（见 §2.4 与 Roadmap）。

**索引**

| 索引名 | 类型 | 列 / 参数 | 说明 |
| --- | --- | --- | --- |
| `materials_pkey` | B-tree | `id` | 主键 |
| `idx_materials_project_id` | B-tree | `project_id` | 项目内素材列表 |
| `idx_materials_embedding` | **HNSW** | `embedding vector_cosine_ops` `WITH (m=16, ef_construction=200)` | 跨素材语义检索（见第 4 / 5 章） |

> 标签检索（关键词 / 标签筛选）目前依赖应用层 `unnest(tags)` 配合 `LIKE` 完成；若数据量超过 5 万条，建议补建 `GIN(tags)` 索引。

**API 映射**：`POST /api/materials/upload`、`GET /api/materials`、`GET /api/materials/:id`、`GET /api/materials/search`、`PUT /api/materials/:id/tags`、`DELETE /api/materials/:id`。

**典型 SQL**

```sql
-- 1. 项目内素材列表（按创建时间倒序）
SELECT id, file_url, file_type, file_name, tags, created_at
FROM materials
WHERE project_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- 2. 向量相似度检索（Top-10 相似切片，cosine distance < 0.35 为强相似）
SELECT id, file_url, 1 - (embedding <=> $1::vector) AS similarity
FROM materials
WHERE project_id = $2 AND embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

---

## 2.4 `material_slices`（M4）

> **业务定位**：视频素材按场景切割后的子段。每个切片独立保留时间区间、缩略图、AI 标签与向量，使剧本/创作模块可在分镜级别精准检索。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `material_id` | `UUID` | ❌ | — | **FK → `materials.id`** `ON DELETE CASCADE` | 所属素材 |
| `start_sec` | `FLOAT` | ❌ | — | `start_sec >= 0` | 起始秒，FFmpeg 场景检测输出 |
| `end_sec` | `FLOAT` | ❌ | — | `end_sec > start_sec` | 终止秒 |
| `thumbnail_url` | `VARCHAR(500)` | ✅ | NULL | — | 切片首帧截图 |
| `tags` | `JSONB` | ✅ | NULL | 见 3.10 | 细粒度标签（主体 / 动作 / 场景） |
| `embedding` | `vector(1024)` | ✅ | NULL | — | 切片视觉 Embedding |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 / 参数 | 说明 |
| --- | --- | --- | --- |
| `material_slices_pkey` | B-tree | `id` | 主键 |
| `idx_material_slices_material_id` | B-tree | `material_id` | 一对多回查 |
| `idx_material_slices_embedding` | **HNSW** | `embedding vector_cosine_ops` `WITH (m=16, ef_construction=200)` | 分镜级语义召回 |

**典型 SQL**

```sql
-- 给定剧本分镜描述向量，召回最相似的切片
SELECT s.id, s.thumbnail_url, s.start_sec, s.end_sec,
       1 - (s.embedding <=> $1::vector) AS score
FROM material_slices s
JOIN materials m ON m.id = s.material_id
WHERE m.project_id = $2
ORDER BY s.embedding <=> $1::vector
LIMIT 5;
```

---

## 2.5 `scripts`（M5）

> **业务定位**：剧本及其分镜数据。一个项目可有多套不同 `strategy_type` 的剧本（痛点 / 测评 / 故事 / 促销）；剧本可被 0..N 个视频引用。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `project_id` | `UUID` | ❌ | — | **FK → `projects.id`** `ON DELETE CASCADE` | 所属项目 |
| `mode` | `VARCHAR(20)` | ❌ | `'auto'` | 枚举：`reference` / `template` / `auto` | 生成模式（v1.2 新增） |
| `strategy_type` | `VARCHAR(50)` | ❌ | — | 枚举：见 6.3 | 痛点共鸣型 / 产品测评型 / 情感故事型 / 限时促销型 / 爆款仿写 / 模板融合 |
| `content` | `TEXT` | ✅ | NULL | — | 剧本概述（首屏一句话/旁白叙事） |
| `storyboard` | `JSONB` | ✅ | NULL | 见 3.2 | 分镜数组 + 因子快照 |
| `factor_history` | `JSONB` | ✅ | `'[]'::jsonb` | 见 3.3 | 因子替换历史（SCRP-010 撤销/重做依赖此字段） |
| `version` | `INTEGER` | ❌ | `1` | — | 剧本版本号，因子替换或重生成时自增（v1.2 新增） |
| `status` | `VARCHAR(20)` | ❌ | `'draft'` | 枚举：见 6.3 | `draft` / `generating` / `completed` / `archived` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `scripts_pkey` | B-tree | `id` | 主键 |
| `idx_scripts_project_id` | B-tree | `project_id` | 列项目内剧本 |

> 当因子检索成为热点时可补 `GIN((storyboard -> 'factors'))`；当前以应用层处理为主，避免过度索引。

**API 映射**：`POST /api/scripts/generate`、`GET /api/scripts/:id`、`PUT /api/scripts/:id/storyboard`、`POST /api/scripts/:id/regenerate-shot`、`POST /api/scripts/:id/replace-factor`。

**典型 SQL**

```sql
-- 因子替换：追加历史 + 更新 storyboard 中的因子快照 + 版本自增
-- v1.2：因子 Key 统一为英文 snake_case（如 visual_style、opener 等）
UPDATE scripts
SET storyboard = jsonb_set(
        storyboard,
        '{factors,visual_style}',
        to_jsonb($2::text)
    ),
    factor_history = factor_history || jsonb_build_object(
        'id', uuid_generate_v4(),
        'dimension', 'visual_style',
        'old_value', storyboard #>> '{factors,visual_style}',
        'new_value', $2,
        'affected_scene_ids', $3::jsonb,
        'timestamp', NOW()
    ),
    version = version + 1,
    updated_at = NOW()
WHERE id = $1
RETURNING storyboard, factor_history, version;
```

---

## 2.6 `factor_definitions`（M5）

> **业务定位**：因子库字典表，为 `POST /api/scripts/:id/replace-factor` 与 `GET /api/factors` 提供候选值清单。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `dimension` | `VARCHAR(100)` | ❌ | — | — | 维度名（英文 snake\_case）：`visual_style` / `opener` / `narration` / `pacing` / `cta`（v1.2 从中文改为英文） |
| `values` | `JSONB` | ✅ | NULL | 见 3.4 | 该维度的可选值数组 |
| `description` | `TEXT` | ✅ | NULL | — | 维度释义（前端 tooltip） |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `factor_definitions_pkey` | B-tree | `id` | 主键 |

> 数据量极小（< 20 行），无需二级索引。建议在 `dimension` 上额外加 `UNIQUE` 约束以避免业务侧重复维度（v1.1 计划）。

**API 映射**：`GET /api/factors`。

---

## 2.7 `videos`（M6）

> **业务定位**：一次端到端视频生成的成片记录。一个剧本可被多次重生成 → 1 个 script ↔ N 个 video；删除剧本不删视频（`ON DELETE SET NULL`）。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `project_id` | `UUID` | ❌ | — | **FK → `projects.id`** `ON DELETE CASCADE` | — |
| `script_id` | `UUID` | ✅ | NULL | **FK → `scripts.id`** `ON DELETE SET NULL` | 允许剧本删除后保留视频 |
| `render_id` | `VARCHAR(20)` | ✅ | NULL | — | 渲染任务编号，格式 `VC-XXXXX-AIGC`（v1.2 新增，前端展示用） |
| `video_url` | `VARCHAR(500)` | ✅ | NULL | — | 成片在 MinIO 中的对象 URL |
| `cover_url` | `VARCHAR(500)` | ✅ | NULL | — | 视频封面图 URL，completed 时生成（v1.2 新增） |
| `duration` | `FLOAT` | ✅ | NULL | ≤ 15s | 实际时长 |
| `resolution` | `VARCHAR(50)` | ✅ | NULL | — | 分辨率描述字符串，如 `"1080×1920 (9:16)"`（v1.2：从枚举改为描述字符串） |
| `status` | `VARCHAR(20)` | ❌ | `'queued'` | 枚举：见 6.4 | `queued`/`rendering`/`completed`/`failed`（v1.2 简化） |
| `error_message` | `TEXT` | ✅ | NULL | — | 失败原因描述，status=failed 时有值（v1.2 新增） |
| `trace_id` | `VARCHAR(36)` | ✅ | NULL | — | 全局 OpenTelemetry traceId（UUID v4 字符串），打穿 NestJS → Seedance 回调 |
| `generation_cost` | `FLOAT` | ✅ | NULL | 单位 元（CNY）或美元 | 火山引擎 API 用量结算 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `videos_pkey` | B-tree | `id` | 主键 |
| `idx_videos_project_id` | B-tree | `project_id` | 项目内视频列表 |
| `idx_videos_script_id` | B-tree | `script_id` | 反向查询某剧本所有重生成版本 |

> 建议在 v1.1 补 `idx_videos_trace_id`（部分索引：`WHERE trace_id IS NOT NULL`）以加速链路追踪场景下的日志关联。

**API 映射**：`POST /api/videos/generate`、`GET /api/videos/:id/status`、`POST /api/videos/:id/shots/:index/regenerate`、`GET /api/videos/:id/download`、`POST /api/videos/:id/export`。

**典型 SQL**

```sql
-- 列项目下所有视频 + 完播率（卡片展示）
SELECT v.id, v.video_url, v.status, v.duration, vm.completion_rate, vm.conversion_rate
FROM videos v
LEFT JOIN video_metrics vm ON vm.video_id = v.id
WHERE v.project_id = $1
ORDER BY v.created_at DESC;

-- 通过 traceId 反查视频（运维定位）
SELECT id, status, video_url FROM videos WHERE trace_id = $1;
```

---

## 2.8 `video_tasks`（M6）

> **业务定位**：单个视频拆出的分镜级 Seedance 任务，是 NestJS VideoService ↔ Seedance API ↔ 回调端点之间的数据载体。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `video_id` | `UUID` | ❌ | — | **FK → `videos.id`** `ON DELETE CASCADE` | 父视频 |
| `shot_index` | `INTEGER` | ❌ | — | `>= 0`，应用层强制 (video_id, shot_index) 唯一 | 分镜序号，与 `scripts.storyboard[].shot_index` 对齐 |
| `seedance_task_id` | `VARCHAR(100)` | ✅ | NULL | — | 火山引擎返回的任务 ID |
| `status` | `VARCHAR(20)` | ❌ | `'queued'` | 枚举：见 6.5 | `queued`/`processing`/`completed`/`failed`/`retrying` |
| `retry_count` | `INTEGER` | ❌ | `0` | `0..3` | 最多重试 3 次，指数退避 30/60/120s |
| `error_msg` | `TEXT` | ✅ | NULL | — | 最近一次失败原因（含火山引擎 code） |
| `trace_id` | `VARCHAR(36)` | ✅ | NULL | — | 从父 video 继承 |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `video_tasks_pkey` | B-tree | `id` | 主键 |
| `idx_video_tasks_video_id` | B-tree | `video_id` | 拉取某视频的全部分镜任务 |

> v1.1 计划补 `UNIQUE (video_id, shot_index)` 与 `idx_video_tasks_seedance_task_id`（HMAC 回调时根据 `task_id` 查找）。

**典型 SQL**

```sql
-- 回调写入：HMAC 验证通过后更新任务状态
UPDATE video_tasks
SET status = $2,
    error_msg = $3,
    updated_at = NOW()
WHERE seedance_task_id = $1;

-- 失败重试入队前
UPDATE video_tasks
SET status = 'retrying',
    retry_count = retry_count + 1,
    updated_at = NOW()
WHERE id = $1 AND retry_count < 3;
```

---

## 2.9 `video_metrics`（M7）

> **业务定位**：视频效果指标。一个 video 对应**一行**指标记录（`UNIQUE(video_id)`），便于 `LEFT JOIN`。演示环境内为 Mock 数据，数据结构与真实场景对齐。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `video_id` | `UUID` | ❌ | — | **FK → `videos.id`** `ON DELETE CASCADE`，**UNIQUE** | 1:1 关联 |
| `views` | `INTEGER` | ❌ | `0` | — | 播放量 |
| `completion_rate` | `FLOAT` | ✅ | NULL | `0 ≤ x ≤ 1` | 完播率（< 0.30 触发诊断提醒） |
| `click_rate` | `FLOAT` | ✅ | NULL | `0 ≤ x ≤ 1` | 点击率 |
| `conversion_rate` | `FLOAT` | ✅ | NULL | `0 ≤ x ≤ 1` | 转化率（< 0.001 触发诊断提醒） |
| `gmv` | `FLOAT` | ✅ | NULL | `>= 0` | 成交额（演示用，单位 CNY） |
| `watch_time_distribution` | `JSONB` | ✅ | NULL | 见 3.7 | 时间分段留存率，用于场景流失图 |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `video_metrics_pkey` | B-tree | `id` | 主键 |
| `video_metrics_video_id_key` | B-tree（唯一） | `video_id` | 列级 `UNIQUE` |

**API 映射**：`GET /api/analytics/:video_id`、`ANLX-001/002` 用户故事。

---

## 2.10 `diagnosis_reports`（M7）

> **业务定位**：分析师 Agent（Doubao）针对低转化视频自动生成的诊断报告。一个 video 可生成多份（每次 `POST /api/analytics/:video_id/diagnose` 都追加一份）。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `video_id` | `UUID` | ❌ | — | **FK → `videos.id`** `ON DELETE CASCADE` | 被诊断视频 |
| `issues` | `JSONB` | ✅ | NULL | 见 3.8 | 问题数组（按分镜定位） |
| `suggestions` | `JSONB` | ✅ | NULL | 见 3.8 | 优化 Prompt 数组（与 issues 一一对齐） |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 | 说明 |
| --- | --- | --- | --- |
| `diagnosis_reports_pkey` | B-tree | `id` | 主键 |
| `idx_diagnosis_reports_video_id` | B-tree | `video_id` | 取某视频的最近一份诊断 |

**API 映射**：`POST /api/analytics/:video_id/diagnose`、`GET /api/analytics/:video_id/diagnosis`。

---

## 2.11 `viral_genes`（M8）

> **业务定位**：爆款基因库——同品类爆款视频聚类后的结构化创作模板。系统冷启动预置 30 条（美妆 / 服装 / 家居 / 3C / 食品 各 6 条）；后续由 `viral_library` 聚类自动入库。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `category` | `VARCHAR(100)` | ❌ | — | 见 6.1 品类枚举 | 品类标签 |
| `storyboard_structure` | `JSONB` | ✅ | NULL | 见 3.5 | hook / structure / 因子组合 |
| `performance_score` | `FLOAT` | ✅ | NULL | `0 ≤ x ≤ 1` | 综合性能分（完播率 × 转化率 加权） |
| `embedding` | `vector(1024)` | ✅ | NULL | — | 结构语义向量，供导演 Agent 检索 |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 / 参数 | 说明 |
| --- | --- | --- | --- |
| `viral_genes_pkey` | B-tree | `id` | 主键 |
| `idx_viral_genes_category` | B-tree | `category` | 品类过滤 |
| `idx_viral_genes_embedding` | **HNSW** | `embedding vector_cosine_ops` `WITH (m=16, ef_construction=200)` | 导演 Agent 检索 |

**API 映射**：`GET /api/genes/search`、`GET /api/genes/:id`。

**典型 SQL**

```sql
-- 同品类 Top-5 高分基因（结合性能分与语义相似度）
SELECT id, storyboard_structure, performance_score,
       1 - (embedding <=> $1::vector) AS sim
FROM viral_genes
WHERE category = $2 AND embedding IS NOT NULL
ORDER BY (1 - (embedding <=> $1::vector)) * 0.6 + COALESCE(performance_score, 0) * 0.4 DESC
LIMIT 5;
```

---

## 2.12 `viral_library`（M9）

> **业务定位**：优质视频库。两条入库链路：
> 1. **URL 导入**：`yt-dlp` 取公开元数据 → Doubao Vision 拆解 → 入库（不存储视频本体）。
> 2. **自有视频上传**：FFmpeg 切帧 → Doubao Vision 分析 → 入库。
> 同品类积累 ≥ 5 条后会聚类沉淀至 `viral_genes`，形成「视频库 → 基因库」数据飞轮。

**字段定义**

| 列名 | 类型 | 可空 | 默认 | 约束 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `id` | `UUID` | ❌ | `uuid_generate_v4()` | **PK** | — |
| `source_url` | `VARCHAR(500)` | ✅ | NULL | — | 外部公开 URL；自有视频为 NULL |
| `platform` | `VARCHAR(50)` | ✅ | NULL | 见 6.6 | `TikTok`/`YouTube`/`Instagram`/`local` |
| `declared_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | 来源声明时间，前端展示「来源：[平台] [URL]」 |
| `title` | `VARCHAR(255)` | ✅ | NULL | — | 视频标题（公开元数据） |
| `thumbnail_url` | `VARCHAR(500)` | ✅ | NULL | — | 封面缩略图（仅图片元数据） |
| `analysis_report` | `JSONB` | ✅ | NULL | 见 3.6 | Doubao 拆解输出 |
| `embedding` | `vector(1024)` | ✅ | NULL | — | 报告语义向量 |
| `status` | `VARCHAR(20)` | ❌ | `'pending'` | 枚举：见 6.6 | `pending`/`analyzing`/`completed`/`failed` |
| `created_at` | `TIMESTAMPTZ` | ❌ | `NOW()` | — | — |

**索引**

| 索引名 | 类型 | 列 / 参数 | 说明 |
| --- | --- | --- | --- |
| `viral_library_pkey` | B-tree | `id` | 主键 |
| `idx_viral_library_platform` | B-tree | `platform` | 平台过滤 |
| `idx_viral_library_status` | B-tree | `status` | 仅展示 `completed`，避免脏数据出现在 UI |
| `idx_viral_library_embedding` | **HNSW** | `embedding vector_cosine_ops` `WITH (m=16, ef_construction=200)` | 语义检索与去重 |

> 建议在 v1.1 为 `source_url` 增加 `UNIQUE` 约束 + `WHERE source_url IS NOT NULL` 部分唯一索引，以兜底 URL 重复导入。

**合规要求**：

* `source_url` 必须为公开页 URL，不存储视频本体；
* 服务端禁止保存 `analysis_report` 之外的视频二进制；
* 前端展示必须包含来源声明区块（平台 + URL + 拆解时间），见 API `GET /api/viral-library/:id`。

**API 映射**：`GET /api/viral-library/search`、`POST /api/viral-library/import-url`、`POST /api/viral-library/upload-analyze`、`GET /api/viral-library/:id`、`POST /api/viral-library/:id/reference`。

---

# 3. JSONB 字段规范

VidCraft 在 11 个字段上使用 `JSONB` 存储半结构化数据。本章约束每个 JSONB 的子模式，禁止「字段集合自由生长」。所有应用层写入路径必须使用 DTO 校验后再落库。

## 3.1 `projects.product_info`

商品解析结果。AI（Doubao Function Calling）或人工填写。数据库内部存储使用中文 Key（与 Doubao 提示词输出对齐），API 层转换为英文 Key 返回前端。

```jsonc
{
  "品名":       "雪肌透光亮肤精华液",          // String, required → API: name
  "品类":       "美妆护肤",                  // String, enum 见 6.1 → API: category
  "核心卖点":   ["28天淡化黑色素", "..."],    // String[], 1..5 → API: selling_points
  "目标人群":   "25-35岁都市女性",            // String, optional → API: target_audience
  "使用场景":   "早晚洁面后使用",              // String, optional → API: usage_scene
  "价格锚点":   "原价¥199，现¥89"             // String, optional → API: price_anchor
}
```

> 数据库字段名采用中文以与 Doubao 提示词输出对齐。API 层（Service）在读写时负责 中文 Key ↔ 英文 Key 的双向映射。v1.2 变更：API 响应统一为 flat 结构（不再嵌套 `product_info` 对象），详见 API 文档 §4。

## 3.2 `scripts.storyboard`

分镜数组 + 因子快照。顶层为对象，含 `scenes`（分镜数组）与 `factors`（因子快照）。

```jsonc
{
  "factors": {
    "visual_style": "轻奢质感风",          // v1.2：Key 统一为英文 snake_case
    "opener":       "问题式Hook",
    "narration":    "活泼种草",
    "pacing":       "中速（1-2s/镜）",
    "cta":          "限时优惠"
  },
  "scenes": [                              // v1.2：从 shots 重命名为 scenes
    {
      "index":       0,                    // Integer, ≥ 0，后端以数组顺序为权威
      "description": "暗沉肤色特写...",     // String，画面描述
      "camera_motion": "微距推近",          // String，镜头运动
      "duration":    3,                    // Number, 秒，1..5
      "voiceover":   "你是不是也试过...",   // String|null，配音文案，允许空
      "subtitle":    "暗沉困扰？",          // String|null，字幕，允许空
      "reference_image_url": null          // String|null，参考图（SCRP-009）
    }
    // ... 4–6 条
  ]
}
```

> v1.2 变更：①因子 Key 从中文改为英文 snake\_case（`visual_style`/`opener`/`narration`/`pacing`/`cta`）；②分镜数组从 `shots` 重命名为 `scenes`；③`voiceover`/`subtitle` 明确允许 null 或空字符串（前端新建空白分镜需要）；④后端以 `scenes[]` 数组顺序为权威排序，`index` 字段仅参考用。总分镜 `SUM(duration)` ≤ 15s（应用层校验）。`material_slice_id` 字段在 v1.1 引入，绑定具体素材切片。

## 3.3 `scripts.factor_history`

因子替换历史数组（支持 SCRP-010 撤销 / 重做）。

```jsonc
[
  {
    "id":        "fh-001",                    // String, 历史记录 UUID
    "dimension": "visual_style",              // v1.2：英文 snake_case Key
    "old_value": "黑风极简",
    "new_value": "轻奢质感风",
    "affected_scene_ids": [0, 1, 2],          // v1.2 新增：受影响的分镜序号
    "timestamp": "2025-05-21T10:00:00Z",
    "trace_id":  "trace-xxxx"
  }
]
```

## 3.4 `factor_definitions.values`

某维度的可选值数组。v1.2 起每个可选值为 `{ value, label }` 对象（英文 Key + 中文展示名），与 API `GET /api/factors` 返回结构对齐。

```jsonc
// 示例（visual_style 维度）
[
  { "value": "minimalist_black", "label": "黑风极简" },
  { "value": "summer_vacation",  "label": "夏日度假风" },
  { "value": "cyberpunk",        "label": "赛博科技风" },
  { "value": "luxury",           "label": "轻奢质感风" },
  { "value": "natural_fresh",    "label": "清新自然风" },
  { "value": "retro_film",       "label": "复古胶片风" },
  { "value": "ins_premium",      "label": "高级ins风" },
  { "value": "soft_cream",       "label": "温柔奶油风" }
]
```

> 五个维度的取值见 6.8，禁止与维度无关的字符串混入。v1.2 变更：从纯中文字符串数组改为 `{value, label}` 对象数组，`value` 为英文 snake\_case（i18n 友好），`label` 为中文展示名。

## 3.5 `viral_genes.storyboard_structure`

```jsonc
{
  "hook":       "问题式暗沉痛点",                // String，钩子摘要
  "structure":  ["暗沉展示","产品特写", "..."],  // String[]，分镜段落
  "avg_duration": 15,                            // Number，平均时长（秒）
  "key_factors": {                                // Object，主导因子（v1.2：英文 Key，与 3.2 因子结构对齐）
    "visual_style": "轻奢质感风",
    "opener":       "问题式Hook",
    "pacing":       "中速"
  }
}
```

## 3.6 `viral_library.analysis_report`

```jsonc
{
  "opener":           "问题式Hook",                          // String，与因子库 opener 维度对齐（v1.2 从 hook_type 改名）
  "hook_description": "开头直接展示...",                      // String，<= 200
  "shot_count":       5,                                    // Integer
  "pacing":           "中速1-2s/镜",                         // String，与因子库 pacing 维度对齐（v1.2 从 rhythm 改名）
  "style_tags":       ["轻奢质感","真实测评"],                 // String[]
  "cta_type":         "限时优惠",                            // String
  "cta_position":     "末尾5秒",                             // String
  "estimated_performance_score": 0.92,                       // Number 0..1
  "key_learnings":    ["真实使用过程建立信任", "..."]          // String[]，要点列表
}
```

## 3.7 `video_metrics.watch_time_distribution`

视频按 3 秒粒度的留存率分布，用于场景流失图。

```json
{ "0_3s": 0.85, "3_6s": 0.62, "6_9s": 0.45, "9_12s": 0.35, "12_15s": 0.35 }
```

> Key 形如 `"start_end"s`，value 为 0–1 之间的浮点。粒度可后续调整为 1 秒。

## 3.8 `diagnosis_reports.issues` / `suggestions`

`issues`：

```jsonc
[
  {
    "scene_index": 0,                       // Integer，分镜序号 0-based
    "issue_type":  "hook_weak",             // String，见 6.9
    "severity":    "high",                  // 枚举 "low" | "medium" | "high"
    "description": "前3秒留存率仅78%..."
  }
]
```

`suggestions`（与 `issues` 一一对应）：

```jsonc
[
  {
    "scene_index": 0,
    "optimized_prompt": "特写肤色暗沉+大字幕弹出..."
  }
]
```

## 3.9 `materials.analysis`

Doubao Vision 对整段素材的多模态摘要。

```jsonc
{
  "subject":     "美白精华液瓶身",   // String，主体识别
  "category":    "美妆护肤",         // String
  "tone":        "暖色调",           // String
  "scene":       "室内梳妆台",        // String
  "summary":     "...",              // String，整体摘要
  "duration":    32.5                // Number（仅视频）秒
}
```

## 3.10 `material_slices.tags`

切片级标签（细粒度）。

```jsonc
{
  "subject":  ["瓶身特写","滴管"],
  "action":   ["缓慢旋转"],
  "scene":    ["梳妆台"],
  "lighting": "柔光"
}
```

---

# 4. 索引策略

## 4.1 主键与外键

* 主键统一为 `UUID`，由 PostgreSQL B-tree 索引自动维护。
* 外键列均显式建立 **B-tree 索引**（`idx_<table>_<fk_column>`），避免父表 DELETE 引发顺序扫描。

## 4.2 二级 B-tree 索引

| 表 | 列 | 用途 |
| --- | --- | --- |
| `viral_genes` | `category` | 品类筛选 |
| `viral_library` | `platform`、`status` | 平台筛选 + 仅取 `completed` |

> 当前刻意保守。`projects.status`、`videos.status`、`scripts.strategy_type` 在数据量 > 5 万行时再补，以避免冷启动期写放大。

## 4.3 HNSW 向量索引（pgvector）

四张含 `embedding vector(1024)` 的表均建立 HNSW 索引（详见 5 章）：

| 表 | 索引名 | 参数 |
| --- | --- | --- |
| `materials` | `idx_materials_embedding` | `m = 16, ef_construction = 200` |
| `material_slices` | `idx_material_slices_embedding` | 同上 |
| `viral_genes` | `idx_viral_genes_embedding` | 同上 |
| `viral_library` | `idx_viral_library_embedding` | 同上 |

* 距离算子：`vector_cosine_ops`（余弦距离），与 Doubao Embedding 训练目标一致。
* `m=16`、`ef_construction=200` 是 pgvector 文档推荐的中等召回/中等构建成本配置；演示环境数据量 < 10 万，单次查询 P99 < 500ms（详见 8.1）。

## 4.4 反例 / 不建议建立的索引

* 不在 `created_at` 上单独建索引——所有查询都以 `project_id` / `user_id` 作为前置过滤，组合索引会增加写放大。
* 不在 JSONB 字段上盲建 `GIN` 索引——目前应用层均以「主键 / 外键 + JSONB 读」为主，仅在 v1.1 视频指标筛选（按 `product_info -> '品类'`）时再考虑。

---

# 5. 向量化与 pgvector 操作

## 5.1 维度与模型

* **模型**：`Doubao-Embedding`（火山引擎 OpenAPI）。
* **维度**：固定 **1024 维**（v1.0 已修正 v0.x 误用 1536 维的问题）。
* **入库归一化**：Doubao 输出已 L2 归一化，不需要业务层再做处理；如改用其他模型，需在写入前归一化以保证 cosine 距离稳定。
* **存储**：列类型 `vector(1024)`，写入时使用 `'[0.1,0.2,...]'::vector` 或 TypeORM `simple-array → vector` 转换。

## 5.2 距离度量与查询

| 算子 | 含义 | 推荐场景 |
| --- | --- | --- |
| `<=>` | **余弦距离**（`0..2`，越小越相似） | **VidCraft 默认**：素材 / 切片 / 基因 / 视频库的语义检索 |
| `<#>` | 负内积 | 已归一化向量下等价于负余弦，无需使用 |
| `<->` | 欧氏距离 | 不使用 |

> 相似度计算建议：`SELECT 1 - (embedding <=> $query) AS similarity ORDER BY embedding <=> $query LIMIT k;`

## 5.3 索引参数与查询时调优

* **构建期**（`CREATE INDEX`）：`m = 16, ef_construction = 200`。`m` 越大召回越高、内存越多；`ef_construction` 越大构建越慢但召回更高。
* **查询期**：通过会话级 `SET hnsw.ef_search = N;` 调优。默认 40；演示环境推荐：
  - 检索精度敏感（剧本融合参考）→ `SET hnsw.ef_search = 100;`
  - 大量 Top-N 召回（素材打分） → `SET hnsw.ef_search = 200;`
* **过滤 + 检索**：HNSW 在 `WHERE` 过滤强（如 `category = ?`）时召回会下降，建议先按品类筛选再取向量 Top-K（pgvector 0.7+ 已显著改善 prefilter，演示数据量下可忽略）。

## 5.4 维度迁移流程（若日后切换模型）

1. 新增列：`ALTER TABLE materials ADD COLUMN embedding_new vector(<new_dim>);`
2. 后台批处理：调用新模型重新生成所有 embedding，写入 `embedding_new`。
3. 切换索引：`DROP INDEX idx_materials_embedding; CREATE INDEX ... ON materials USING hnsw (embedding_new ...);`
4. 应用层切换查询列；旧列保留一个迭代后再 `ALTER TABLE ... DROP COLUMN embedding;`

> ⚠️ 现网严禁直接 `ALTER COLUMN embedding TYPE vector(<new_dim>)`，会触发整张表重写并丢失 HNSW 索引一致性。

---

# 6. 枚举与字典

## 6.1 `users.plan_type` / 品类枚举

* `users.plan_type` ∈ { `free`, `pro` }。
* **品类**（与 API 文档附录 A 完全对齐，用于 `projects.product_info.品类`、`viral_genes.category`、`viral_library.analysis_report.*`）：

  | 值 | 中文 |
  | --- | --- |
  | `fashion` | 服装配饰 |
  | `beauty` | 美妆个护 |
  | `home` | 家居家装 |
  | `electronics` | 3C 数码 |
  | `food` | 食品饮料 |
  | `sports` | 运动户外 |
  | `mother_baby` | 母婴用品 |
  | `pet` | 宠物用品 |
  | `other` | 其他 |

  > 注：演示种子数据中 `viral_genes.category` 使用中文（"美妆"/"服装" 等），与本枚举存在历史不一致。v1.1 计划统一为英文 slug，请新写入路径直接使用英文值。

## 6.2 `projects.status`

| 值 | 含义 |
| --- | --- |
| `draft` | 草稿，商品信息未填写或未确认 |
| `confirmed` | 商品信息已确认 |
| `material_pending` | 素材上传阶段 |
| `script_pending` | 剧本生成阶段 |
| `in_production` | 视频创作阶段 |
| `completed` | 视频已导出 |
| `active` | 兼容历史种子数据（v1.1 移除） |

## 6.3 `scripts.strategy_type` / `scripts.status`

`strategy_type`：

| 值 | 含义 |
| --- | --- |
| `痛点共鸣型` | 默认风格 |
| `产品测评型` | — |
| `情感故事型` | — |
| `限时促销型` | — |
| `爆款仿写` | 来自 gene bank / gene |
| `模板融合` | 来自灵感模板 |

`status`：`draft` / `generating` / `completed` / `archived`。

## 6.4 `videos.status` / `videos.resolution`

`status`（v1.2 简化为 4 值枚举）：

| 值 | 含义 |
| --- | --- |
| `queued` | 已入队，等待处理 |
| `rendering` | 生成中（含 Seedance 生成与 FFmpeg 合成两个子阶段） |
| `completed` | 合成完成，已写入 `video_url` 和 `cover_url` |
| `failed` | 全链路任一阶段失败（错误细节见 `videos.error_message` 或 `video_tasks.error_msg`） |

> v1.2 变更：原 `pending`/`generating`/`composing` 三个状态合并为 `queued`+`rendering`，前端只需处理 4 种状态。

`resolution`：字符串描述，如 `"1080×1920 (9:16)"`、`"1920×1080 (16:9)"`、`"1080×1080 (1:1)"`。v1.2 从固定枚举改为自由格式字符串，便于支持更多分辨率。

## 6.5 `video_tasks.status`

| 值 | 含义 |
| --- | --- |
| `queued` | 已创建，待生成 |
| `processing` | Seedance 处理中 |
| `retrying` | 失败后等待重试 |
| `completed` | 单分镜生成完成 |
| `failed` | 重试 3 次后仍失败 |

## 6.6 `viral_library.status` / `platform`

`status`：`pending` / `analyzing` / `completed` / `failed`。

`platform`：`TikTok` / `YouTube` / `Instagram` / `Facebook` / `local`（自有上传）/ `other`。

## 6.7 `materials.file_type`

`image` / `video`。MIME 范围：
* `image`：`image/jpeg`、`image/png`、`image/webp`，单张 ≤ 20MB。
* `video`：`video/mp4`、`video/quicktime`、`video/x-msvideo`，单个 ≤ 500MB，时长 ≤ 5 分钟。

## 6.8 因子维度与可选值（seed）

v1.2 变更：维度名（dimension）从中文统一为英文 snake\_case Key。可选值采用 `{ value, label }` 结构。

| 维度 Key | 中文名 | 可选值（value → label） |
| --- | --- | --- |
| `visual_style` | 视觉风格 | `minimalist_black` 黑风极简 / `summer_vacation` 夏日度假风 / `cyberpunk` 赛博科技风 / `luxury` 轻奢质感风 / `natural_fresh` 清新自然风 / `retro_film` 复古胶片风 / `ins_premium` 高级ins风 / `soft_cream` 温柔奶油风 |
| `opener` | 开场手法 | `question_hook` 问题式Hook / `price_anchor_hook` 价格锚点Hook / `suspense_hook` 悬念式Hook / `data_shock_hook` 数据震撼Hook / `contrast_hook` 对比式Hook / `empathy_hook` 情感共鸣Hook / `counter_intuition_hook` 反常识Hook / `celeb_same_hook` 明星同款Hook |
| `narration` | 旁白风格 | `elegant` 优雅知性 / `energetic` 活泼种草 / `professional` 专业测评 / `casual` 亲切日常 / `storytelling` 温柔故事感 / `passionate` 激情带货 / `humorous` 幽默段子手 |
| `pacing` | 节奏密度 | `fast` 快切节奏（0.5–1s/镜）/ `medium` 中速（1–2s/镜）/ `slow` 慢镜强调（2–3s/镜）/ `mixed` 变速节奏（混合） |
| `cta` | CTA 形式 | `buy_now` 立即下单 / `cart` 点击购物车 / `flash_sale` 限时优惠 / `brand_mind` 品牌心智 / `free_trial` 免费试用 / `suspense_lead` 悬念引导 / `social_proof` 从众效应 |

## 6.9 `diagnosis_reports` 枚举

`issue_type`：`hook_weak` / `drop_off` / `cta_weak` / `pacing_off` / `style_mismatch` / `audio_issue`。

`severity`：`low` / `medium` / `high`。

---

# 7. 关系与级联

## 7.1 实体关系总表

| 父表 | 子表 | 关系 | 删除策略 | 业务含义 |
| --- | --- | --- | --- | --- |
| `users` | `projects` | 1 : N | CASCADE | 用户注销带走全部项目 |
| `projects` | `materials` | 1 : N | CASCADE | — |
| `projects` | `scripts` | 1 : N | CASCADE | — |
| `projects` | `videos` | 1 : N | CASCADE | — |
| `materials` | `material_slices` | 1 : N | CASCADE | — |
| `scripts` | `videos` | 1 : N | SET NULL | 视频成片独立保留 |
| `videos` | `video_tasks` | 1 : N | CASCADE | — |
| `videos` | `video_metrics` | 1 : 1 | CASCADE | UNIQUE(video_id) 强制 |
| `videos` | `diagnosis_reports` | 1 : N | CASCADE | — |
| `factor_definitions` | `scripts` | 逻辑引用 | — | 应用层校验，无 FK |
| `viral_library` | `viral_genes` | 逻辑聚类 | — | 应用层聚类任务写入 |
| `viral_genes` | `scripts` | 逻辑引用 | — | Director Agent 输入 |

## 7.2 引用完整性兜底

* 应用层（NestJS 服务）在删除 project 之前会**显式**清理 MinIO 上的素材/成片，再触发 `DELETE FROM projects`，避免 DB 级联完成但对象存储遗留孤儿文件。
* `videos.script_id`（`ON DELETE SET NULL`）失联后，应用层在视频详情接口 (`GET /api/videos/:id/status`) 返回 `script_deleted: true` 字段并隐藏剧本切换入口。

## 7.3 事务边界（NestJS 侧）

| 操作 | 事务范围 |
| --- | --- |
| 注册用户 | 单事务：`INSERT users` |
| 提交视频生成 | 单事务：`INSERT videos` + `INSERT video_tasks × N` |
| 因子替换 | 单事务：`UPDATE scripts(storyboard, factor_history)` |
| Seedance 回调 | 单事务：`UPDATE video_tasks` + 条件触发 `UPDATE videos.status` |

> 所有事务限制在单实例内（单一 NestJS 服务），禁止跨服务分布式事务。

---

# 8. 容量规划与性能

## 8.1 预估容量（演示阶段）

| 表 | 行数预期 | 平均行宽 | 备注 |
| --- | --- | --- | --- |
| `users` | < 100 | 0.3 KB | 演示账号 + 评委 |
| `projects` | < 500 | 0.5 KB | 含 `product_info` JSONB |
| `materials` | < 2,000 | 2 KB（含向量） | embedding(1024) ≈ 4 KB；JSONB 摘要 < 1 KB |
| `material_slices` | < 10,000 | 4.5 KB | 含向量 + tags JSONB |
| `scripts` | < 1,000 | 6 KB | storyboard JSONB ≈ 4 KB |
| `videos` | < 200 | 0.5 KB | — |
| `video_tasks` | < 1,000 | 0.5 KB | 5 个分镜/视频 |
| `video_metrics` | < 200 | 0.5 KB | — |
| `viral_genes` | 30 + < 100 | 4.5 KB | 含向量 |
| `viral_library` | < 200 | 6 KB | analysis_report + 向量 |
| `factor_definitions` | 5 | 0.5 KB | 字典 |
| `diagnosis_reports` | < 200 | 1.5 KB | — |

> 演示规模下，全库 < 200 MB（含 HNSW 索引）。生产规模（用户量 10×）预估 < 5 GB，单实例 PG 16 完全胜任，无需分片。

## 8.2 性能目标（与需求文档 3.1 对齐）

| 查询场景 | 目标延迟 P95 | 实现路径 |
| --- | --- | --- |
| 项目列表 | < 50ms | `idx_projects_user_id` |
| 项目详情（含 counts） | < 100ms | 子查询 / `LATERAL JOIN` |
| 素材向量检索 | < 500ms | HNSW + `ef_search=100` |
| 视频状态轮询 | < 100ms | 主键查询 + 索引 |
| 数据看板 | < 200ms | LEFT JOIN `video_metrics` |
| 优质视频库搜索 | < 300ms | B-tree(`platform`,`status`) + HNSW |

## 8.3 写入热点

* **video_tasks 高频更新**：单视频 5 个分镜，Seedance 回调期间会以每分镜 2–3 次 `UPDATE` 速率写入。所有写均锁定单行（`WHERE id = ?` 或 `WHERE seedance_task_id = ?`），无冲突。
* **users.video_quota 扣减**：`UPDATE ... WHERE id = $1 AND video_quota > 0` 单语句即原子，无需显式锁。

## 8.4 VACUUM / ANALYZE

PostgreSQL 16 autovacuum 默认即可。**例外**：`video_metrics` 与 `video_tasks` 在大量回调期可能积累死元组，建议在演示前手动执行：

```sql
VACUUM (ANALYZE) video_tasks, video_metrics, scripts;
```

---

# 9. 安全、合规与 PII

## 9.1 PII 处理

| 列 | 风险等级 | 处理 |
| --- | --- | --- |
| `users.email` | 中 | 仅服务端读取，禁止日志打印；导出/备份脱敏 |
| `users.password_hash` | 高 | **bcrypt cost ≥ 10**，任何接口/日志均不得返回；TypeORM 实体 `select: false`（v1.1 引入） |
| `users.avatar_url` | 低 | 使用 MinIO 预签名 URL，TTL 24h |
| `users.nickname` | 低 | 长度限制 1–30，禁止脚本字符 |

## 9.2 合规约束

* **优质视频库**：`viral_library.source_url` 必为公开 URL；数据库不存视频本体；前端展示来源声明（平台 + URL + `declared_at`）。
* **MinIO 隔离**：素材路径前缀必须包含 `<user_id>/<project_id>/`，应用层强制权限校验，防止越权读取。
* **trace_id 全链路**：禁止在 trace_id 中携带 PII；UUID v4 形态固定 36 字符。

## 9.3 注入与校验

* 所有 SQL 均通过 TypeORM / `pg` 参数化执行；禁止字符串拼接 SQL。
* `JSONB` 字段写入前由 DTO（class-validator）校验子结构，避免污染。
* 文件上传：MIME + 文件头双重校验，存入 MinIO 时重命名为 UUID，避免路径穿越。

## 9.4 备份与隐私边界

* 生产环境每日 `pg_dump --format=c` 增量备份至独立桶；备份文件加密（AES-256）。
* 备份保留 30 天。用户注销 → 同时清理 30 天后的最近备份中的对应行（`pg_dump` → `pg_restore` 后单表删除再回写）。

---

# 10. 运维操作手册

## 10.1 初始化

```bash
# 启动基础设施（含 pgvector 镜像）
npm run docker:up

# 创建表 & 索引（首次启动 Docker 时会通过挂载 /docker-entrypoint-initdb.d 自动执行）
npm run db:init

# 预置演示数据（demo 账号、30 条基因、5 条优质视频）
npm run db:seed
```

Docker 入口实现：`docker/docker-compose.yml` 已将 `scripts/init-db.sql` 与 `scripts/seed-demo-data.sql` 挂入 `/docker-entrypoint-initdb.d/`，**仅在首次创建 `postgres_data` 卷时执行**。

## 10.2 重置数据

```bash
# 完整重置（连带向量索引）
docker compose -f docker/docker-compose.yml down -v
npm run docker:up
```

## 10.3 备份与恢复

```bash
# 备份
docker exec -i docker-postgres-1 \
  pg_dump -U vidcraft -d vidcraft --format=c --compress=9 > vidcraft_$(date +%F).dump

# 恢复（保持索引）
docker exec -i docker-postgres-1 \
  pg_restore -U vidcraft -d vidcraft --clean --if-exists < vidcraft_2026-05-22.dump
```

## 10.4 迁移与回滚

当前 v1.0 直接以 `init-db.sql` 一次性建表，**不使用 TypeORM Migration**。v1.1 起每次 schema 变更必须落到 `backend/src/database/migrations/<timestamp>_<desc>.ts`：

```bash
cd backend
# 生成
npx typeorm migration:generate -d src/database/database.module.ts <name>
# 执行
npx typeorm migration:run
# 回滚一步
npx typeorm migration:revert
```

向量索引相关迁移注意事项见 5.4。

## 10.5 常用诊断 SQL

```sql
-- 1. 当前 active 项目 + 已用配额
SELECT u.email, u.video_quota,
       (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS projects,
       (SELECT COUNT(*) FROM videos v
        JOIN projects p ON p.id = v.project_id
        WHERE p.user_id = u.id) AS videos
FROM users u;

-- 2. 失败任务排查（最近一小时）
SELECT vt.id, vt.video_id, vt.shot_index, vt.retry_count, vt.error_msg, vt.trace_id
FROM video_tasks vt
WHERE vt.status = 'failed'
  AND vt.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY vt.updated_at DESC;

-- 3. 索引膨胀检查
SELECT schemaname, relname, indexrelname,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;

-- 4. 当前未完成的视频生成任务（用于演示前的"清场"检查）
SELECT id, project_id, status, created_at
FROM videos
WHERE status IN ('pending','generating','composing')
ORDER BY created_at;

-- 5. 重建某张表的 HNSW 索引（数据漂移后）
DROP INDEX idx_materials_embedding;
CREATE INDEX idx_materials_embedding ON materials
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
ANALYZE materials;
```

## 10.6 连接信息

| 环境 | URI |
| --- | --- |
| 本地开发 | `postgresql://vidcraft:vidcraft@localhost:5432/vidcraft` |
| Docker Compose（容器内） | `postgresql://vidcraft:vidcraft@postgres:5432/vidcraft` |
| 生产 | 由 `.env.production` 注入，仅服务端可读 |

---

# 11. 变更日志

| 版本 | 日期 | 变更摘要 |
| --- | --- | --- |
| **v1.0** | 2026-05-22 | 首次发布。建立 12 张核心表、4 张 HNSW 索引、11 个 JSONB 子模式约束、与 API 文档 / 用户故事 / 技术方案文档全面对齐 |
| **v1.2** | 2026-05-27 | 基于前端联调反馈同步更新：①因子维度 Key 从中文统一为英文 snake\_case；②`scripts` 表新增 `mode`（生成模式）、`version`（版本号）列；③`videos` 表新增 `render_id`/`cover_url`/`error_message` 列，status 简化为 4 值枚举；④JSONB 子模式更新（storyboard.scenes 重命名、factor\_history 新增 affected\_scene\_ids、factor\_definitions.values 改为对象数组）；⑤product\_info API 层 flat 化说明 |

---

# 附录 A：完整 DDL（节选关键约束）

> 完整脚本见 `scripts/init-db.sql`。下列摘录强调可读的约束与索引部分。

```sql
-- 启用扩展
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nickname        VARCHAR(100),
    avatar_url      VARCHAR(500),
    plan_type       VARCHAR(20) DEFAULT 'free',
    video_quota     INTEGER DEFAULT 3,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- projects (含 v1.1 已补充的 views/render_progress/tiktok_ready)
CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    product_url     VARCHAR(500),
    product_info    JSONB,
    status          VARCHAR(20) DEFAULT 'draft',
    views           INTEGER NOT NULL DEFAULT 0,
    render_progress INTEGER NOT NULL DEFAULT 0,
    tiktok_ready    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- materials
CREATE TABLE materials (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_url        VARCHAR(500) NOT NULL,
    file_type       VARCHAR(20) NOT NULL,
    file_name       VARCHAR(255),
    file_size       INTEGER,
    analysis        JSONB,
    embedding       vector(1024),
    tags            TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- scripts (v1.2: 新增 mode, version 列)
CREATE TABLE scripts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    mode            VARCHAR(20) NOT NULL DEFAULT 'auto',
    strategy_type   VARCHAR(50) NOT NULL,
    content         TEXT,
    storyboard      JSONB,
    factor_history  JSONB DEFAULT '[]'::jsonb,
    version         INTEGER NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- videos (v1.2: 新增 render_id, cover_url, error_message; status 简化)
CREATE TABLE videos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    script_id       UUID REFERENCES scripts(id) ON DELETE SET NULL,
    render_id       VARCHAR(20),
    video_url       VARCHAR(500),
    cover_url       VARCHAR(500),
    duration        FLOAT,
    resolution      VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    error_message   TEXT,
    trace_id        VARCHAR(36),
    generation_cost FLOAT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- (其余表略，参见 scripts/init-db.sql)

-- HNSW 索引（4 处）
CREATE INDEX idx_materials_embedding        ON materials        USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_material_slices_embedding  ON material_slices  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_viral_genes_embedding      ON viral_genes      USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);
CREATE INDEX idx_viral_library_embedding    ON viral_library    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);

-- B-tree 索引
CREATE INDEX idx_projects_user_id            ON projects(user_id);
CREATE INDEX idx_materials_project_id        ON materials(project_id);
CREATE INDEX idx_material_slices_material_id ON material_slices(material_id);
CREATE INDEX idx_scripts_project_id          ON scripts(project_id);
CREATE INDEX idx_videos_project_id           ON videos(project_id);
CREATE INDEX idx_videos_script_id            ON videos(script_id);
CREATE INDEX idx_video_tasks_video_id        ON video_tasks(video_id);
CREATE INDEX idx_diagnosis_reports_video_id  ON diagnosis_reports(video_id);
CREATE INDEX idx_viral_genes_category        ON viral_genes(category);
CREATE INDEX idx_viral_library_platform      ON viral_library(platform);
CREATE INDEX idx_viral_library_status        ON viral_library(status);
```

---

# 附录 B：TypeORM 实体对照速查

| 实体类（`backend/src/database/entities/`） | 表名 | 备注 |
| --- | --- | --- |
| `User` | `users` | — |
| `Project` | `projects` | `productInfo: object` 对应 `product_info JSONB` |
| `Material` | `materials` | `embedding: string`（TypeORM 暂以 `varchar` 表示，运行期写入 vector 字面量；v1.1 引入自定义列类型） |
| `MaterialSlice` | `material_slices` | 同上 |
| `Script` | `scripts` | `factor_history` 默认 `[]`（建议在实体 `default: () => "'[]'::jsonb"`） |
| `Video` | `videos` | `script_id` 可为 `null` |
| `VideoTask` | `video_tasks` | — |
| `VideoMetric` | `video_metrics` | `OneToOne(Video)`，列级 `unique: true` |
| `DiagnosisReport` | `diagnosis_reports` | — |
| `ViralGene` | `viral_genes` | — |
| `ViralLibrary` | `viral_library` | — |
| `FactorDefinition` | `factor_definitions` | — |

> 已知差异：`embedding` 字段当前 TypeORM 声明类型为 `varchar`，与 DDL 中的 `vector(1024)` 不一致。运行期通过原生 SQL 写入和读取，**避免 TypeORM 自动 migrate 时漂移类型**。v1.1 计划引入 `typeorm-pgvector` 自定义列。

---

# 附录 C：与 API 接口的映射

| 接口 | 主写表 / 读表 |
| --- | --- |
| `POST /api/auth/register` / `login` / `guest-login` | `users` |
| `GET /api/auth/profile` | `users` |
| `POST /api/projects` / `GET /api/projects` | `projects` |
| `POST /api/products/parse-url|parse-image` | `projects.product_info` |
| `POST /api/materials/upload` | `materials` + `material_slices` |
| `GET /api/materials/search` | `materials` / `material_slices`（HNSW） |
| `POST /api/scripts/generate` | `scripts` |
| `POST /api/scripts/:id/replace-factor` | `scripts.storyboard` / `scripts.factor_history` |
| `GET /api/factors` | `factor_definitions` |
| `POST /api/videos/generate` | `videos` + `video_tasks`（事务） |
| `POST /api/volcano/seedance-callback` | `video_tasks`、间接 `videos.status` |
| `GET /api/analytics/:video_id` | `video_metrics` + `videos` |
| `POST /api/analytics/:video_id/diagnose` | `diagnosis_reports` |
| `GET /api/genes/search` | `viral_genes`（HNSW） |
| `GET /api/viral-library/search` | `viral_library`（HNSW + B-tree） |
| `POST /api/viral-library/import-url|upload-analyze` | `viral_library` |
| `POST /api/viral-library/:id/reference` | 读 `viral_library` → 写 `scripts` |

---

# 附录 D：v1.1 待办（已识别的优化项）

1. ~~**统一 `viral_genes.category` 枚举**：从中文迁移到英文 slug~~ → v1.2 已完成：因子维度 Key 统一为英文 snake\_case。
2. ~~**`scripts.storyboard` 顶层结构化**：从「裸数组」升级为 `{factors, scenes}` 双键对象~~ → v1.2 已完成：`shots` 重命名为 `scenes`。
3. **TypeORM `embedding` 列类型**：替换为自定义 `vector` 类型，避免类型漂移。
4. **`video_tasks` 唯一约束**：补 `UNIQUE(video_id, shot_index)` 与 `idx_video_tasks_seedance_task_id`。
5. **`videos.trace_id` 部分索引**：`CREATE INDEX ... WHERE trace_id IS NOT NULL`。
6. **`viral_library.source_url` 唯一约束**：避免重复导入。
7. **`materials.tags` GIN 索引**：当行数 > 50,000 时启用。
8. **全表 `deleted_at TIMESTAMPTZ NULL`** 软删除列：替代当前 hard delete。
9. **TypeORM Migration 接入**：所有后续 schema 变更必须经迁移文件，禁止直接改 `init-db.sql`。
10. **`password_hash` 实体级 `select: false`**：避免误用 `find()` 时回流到响应体。
11. **（v1.2 新增）`scripts` 表 seed 数据迁移**：存量数据中 `storyboard.factors` 的中文 Key 需迁移为英文 Key。
12. **（v1.2 新增）`factor_definitions` 表 seed 数据迁移**：`dimension` 值从中文迁移为英文，`values` 从字符串数组迁移为 `{value, label}` 对象数组。
