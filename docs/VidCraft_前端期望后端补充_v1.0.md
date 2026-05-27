# VidCraft 前端期望后端补充 v1.0

> **文档目的**：前端实现 Login / Dashboard / Projects / ProductParse / ScriptStudio / VideoCreation 6 个页面期间，累积出的「API 规范 v1.0 没有明示，需要后端确认或补充」的字段 / 端点清单。
>
> **基线版本**：[`docs/API接口规范文档.md`](API接口规范文档.md)
>
> **前端代码位置**：`feat/frontend-infrastructure` 分支
> - 类型定义：[`frontend/src/types/`](../frontend/src/types/)
> - Service 实现：[`frontend/src/services/`](../frontend/src/services/)
> - Mock handler（用于前端独立开发，可视为前端"期望返回"参考）：[`frontend/src/mocks/handlers/`](../frontend/src/mocks/handlers/)
> - 前端 API 约定文档：[`frontend/docs/API_CONVENTIONS.md`](../frontend/docs/API_CONVENTIONS.md)
>
> **优先级图例**：
> - 🔴 **必须明确**（不解决会导致联调失败）
> - 🟡 **建议处理**（不解决可工作，但 UX 或维护性受损）
> - 🟢 **可选优化**（锦上添花）

---

## 0. 全局约定（已对齐）

前端已严格按 spec 第 0 章实现：
- 统一响应包 `{ code, msg, total, data, traceId }`，axios 拦截器自动解包 `data`
- 成功 `code === 200`，错误 `code !== 200`
- 通用错误码 400 / 401 / 403 / 404 / 429 / 5xx 已分类处理
- `X-Trace-Id` 暂未注入请求头（如后端不强求，先不加）

**前端约定参考**：[`frontend/docs/API_CONVENTIONS.md`](../frontend/docs/API_CONVENTIONS.md)

---

## 1. M2 Projects 模块

涉及端点：`POST /api/projects`、`GET /api/projects`、`GET /api/projects/:id`、`PUT /api/projects/:id`、`DELETE /api/projects/:id`

### 1.1 `description` 字段（POST /api/projects）🟡

- **spec v1.0**：请求体未明示 `description`，仅 `name` 必填
- **前端实际发送**：`{ name: string, description?: string }`，可选
- **建议**：
  - 选项 A：spec 补 `description: String?`，DB 加列
  - 选项 B：明确说不接受，前端 UI 去掉描述字段
- **现状**：mock 接收但不存储，等待对齐

### 1.2 `ProjectListItem` 缺展示字段 🔴

前端 Dashboard / Projects 页**实际渲染需要**但 spec 没定义的字段：

```ts
interface ProjectListItem {
  id: string;
  name: string;
  cover_url: string;
  video_count: number;
  status: 'completed' | 'in_progress' | 'draft';
  updated_at: string;

  // 👇 spec v1.0 没有，前端目前在 Dashboard 用硬编码兜底
  views?: number | string;          // 该项目下视频累计播放量（"4.2k" 这种格式可后端格式化）
  render_progress?: number;         // 0-100，状态为 in_progress 时进度条用
  tiktok_ready?: boolean;           // 顶部"TIKTOK READY"徽章
}
```

- **影响**：Projects 列表 / Dashboard 最近项目网格的视觉信息不完整，目前用 `i === 0` 这种硬编码 demo
- **建议**：spec v1.x 把这 3 个字段加进 `ProjectListItem`

### 1.3 `?status=` 查询参数 🟡

- **spec v1.0**：`GET /api/projects` 只支持 `page / limit / keyword`
- **前端实际**：状态筛选目前是 client-side（fetch 全部后再筛选）
- **影响**：数据量小没问题；项目数超百级别时浪费带宽
- **建议**：spec 补 `status?: 'completed'|'in_progress'|'draft'|'all'` 查询参数

### 1.4 `confirm_name` 在 DELETE 请求 body 里 ✓

- spec 已明示，前端已实现，body 字段名 `confirm_name`（snake_case）已对齐

---

## 2. M3 Products 模块

涉及端点：`POST /api/products/parse-url`、`POST /api/products/parse-image`、`PUT /api/products/:project_id`、`POST /api/products/:project_id/confirm`、`GET /api/products/:project_id`

### 2.1 PUT 响应结构与 parse-url/image 不一致 🔴

- **spec v1.0 第 4 章示例**：
  - `parse-url` / `parse-image` 返回 **flat**：`data: { name, category, selling_points, ... }`
  - `PUT /products/:project_id` 返回 **nested**：`data: { project_id, product_info: { ... }, updated_at }`
- **影响**：前端如果 follow spec，要写两种解包逻辑
- **前端目前**：mock + 类型都用 **flat** + project_id + updated_at（内部一致）
- **建议**：**统一为 flat**：
  ```json
  {
    "code": 200, "data": {
      "project_id": "...",
      "name": "...",
      "category": "...",
      "selling_points": [...],
      "target_audience": "...",
      "usage_scene": "...",
      "price_anchor": "...",
      "cover_url": "...",
      "updated_at": "..."
    }
  }
  ```

### 2.2 GET 响应结构未明示 🟡

- spec v1.0 第 4 章没明示 `GET /products/:project_id` 的 data 结构
- **前端假设**：和 parse-url 返回结构一致（flat） + project_id + updated_at
- **建议**：spec v1.x 补示例

### 2.3 408 解析超时的特殊 UX 🟢

- spec 提到解析超时返回 `code: 408` + `msg: "解析超时，请尝试手动填写"`
- **前端目前**：通过通用 5xx 拦截器处理，弹默认错误 toast
- **建议**（可选）：前端给 408 单独的 UX —— 解析失败界面 + "切换为手动填写"按钮。等 spec 稳定后再做。

---

## 3. M5 Scripts 模块（**TBD 最多**，spec ch.5 细节较少）

涉及端点：`POST /api/scripts/generate`（SSE）、`GET /api/scripts/:id`、`PUT /api/scripts/:id/storyboard`、`POST /api/scripts/:id/regenerate-shot`、`POST /api/scripts/:id/replace-factor`、`GET /api/factors`

### 3.1 ScriptMode 编码格式 🔴

- **前端**：英文 snake key + 中文 label 映射
  ```ts
  type ScriptMode = 'reference' | 'template' | 'auto';
  const SCRIPT_MODE_LABELS = {
    reference: '爆款仿写',
    template:  '灵感模板',
    auto:      '自动化生成',
  };
  ```
- **spec v1.0**：只写中文展示名"爆款仿写 / 灵感模板 / 自动化生成"
- **建议**：明确 API 用哪种
  - **推荐英文 key**（i18n 友好、避免编码问题、易序列化）
  - 中文 label 留给前端 UI 展示

### 3.2 FactorKey 编码格式 🔴

同上：

```ts
type FactorKey = 'visual_style' | 'opener' | 'narration' | 'pacing' | 'cta';
```

`GET /api/factors` 返回的 group 结构、`POST /scripts/:id/replace-factor` 请求体 `{ factor, value }` 中的 `factor` 字段，**都需要确认 key 编码**。建议英文 snake_case。

### 3.3 SSE 事件协议 🔴

`POST /api/scripts/generate` 是 SSE 流式。**前端期望的事件类型**：

```ts
type GenerateStreamEvent =
  | { type: 'meta'; script_id: string; total_scenes: number }
  | { type: 'scene'; scene: Scene }
  | { type: 'done'; script_id: string }
  | { type: 'error'; msg: string };
```

每个事件以 `data: <JSON>\n\n` 格式推送，`Content-Type: text/event-stream`。

- **spec v1.0**：只说 "SSE 流式输出"，没明示事件结构
- **建议**：spec 补 SSE 事件协议（事件名、payload 结构）

### 3.4 Script GET 返回结构补充 🟡

前端期望 `GET /scripts/:id` 返回：

```ts
interface Script {
  id: string;
  project_id: string;
  mode: ScriptMode;
  factors: FactorState;             // { visual_style, opener, narration, pacing, cta }
  scenes: Scene[];
  total_duration: number;
  version: string;                  // 'v1.2.4' 假设字符串
  history: ScriptHistoryEntry[];    // ⚠️ spec 未明示
  product_snapshot?: ParsedProduct; // ⚠️ spec 未明示，前端在编辑器右上展示用
  created_at: string;
  updated_at: string;
}
```

需要后端确认：
- `version` 格式（字符串如 `'v1.2.4'`？还是整数自增？）
- `history` 是随 Script 一起返回还是单独端点 `GET /scripts/:id/history`？
- `product_snapshot` 是否包含（如果有，避免前端再调 `GET /products/:project_id`）

### 3.5 ReplaceFactor 响应建议加 `affected_scene_ids` 🟡

- **当前响应**：`{ updated_scenes: Scene[], history_entry: ScriptHistoryEntry }`
- **问题**：前端为了"立刻"显示模糊蒙层（不等响应），**前端 hardcode 了「哪个因子影响哪些分镜」的规则**（视觉影响前 2 镜、旁白影响全部……）。**真实后端 LLM 决定**时规则不同，前端规则会偏差。
- **建议加字段**：`affected_scene_ids: string[]`，**响应 / 流早期返回**这个字段，前端可以丢掉 hardcode 规则。

或更激进：**replace-factor 也走 SSE**，先推 `affected_scene_ids`，再陆续推每个 `updated_scene`。

### 3.6 Scene.index 的所有权 🟡

- 前端 saveStoryboard 时，每个 Scene 带 `index` 字段（按数组下标计算）
- **建议**：后端**以 `scenes[]` 数组顺序为权威**，忽略每条的 `index`。前端不维护 `index` 也行。
- 否则要明确：用户拖拽后，前端 / 后端谁负责 reindex

### 3.7 Scene 字段 nullable 约束 🟡

前端"+ 添加新分镜"创建空白分镜默认值：
```ts
{ description: '新分镜：请输入画面描述...', voiceover: '', subtitle: '', ... }
```

如果后端 schema 强制 `voiceover` / `subtitle` 非空，PUT 会失败。**建议**：spec 明确这些字段的 nullable / 最小长度约束。

### 3.8 单分镜重生延迟 🟢

- mock 1.5s，真实 LLM 可能 5-15s
- 前端会有"用户等着空模糊页面"的尴尬期
- **建议**（远期）：单分镜重生也提供 SSE 流式响应，前端逐步显示中间状态

---

## 4. M6 Videos 模块

涉及端点：`POST /api/videos/generate`、`GET /api/videos/:id/status`、`POST /api/videos/:id/shots/:index/regenerate`、`PUT /api/videos/:id/settings`、`GET /api/videos/:id/download`、`POST /api/videos/:id/export`

### 4.1 WebSocket vs 轮询 🔴

- **spec v1.0**：推荐 Socket.io 实时推送
- **前端 mock**：用 800ms 轮询代替（MSW 不原生支持 WebSocket）
- **联调时要做**：
  - 后端 WebSocket endpoint 待 spec 明示（事件名 `video:progress`？payload 结构？）
  - 前端把 `setInterval(getStatus, 800)` 替换为 `socket.on('video:progress', setTask)`
  - `socket.io-client` 已在 deps，前端已就绪
- **建议 spec 补**：WebSocket 协议章节（连接握手、事件名、payload、断线重连约定）

### 4.2 字段细节确认 🟡

| 字段 | 前端假设 | 需后端确认 |
|---|---|---|
| `status` 枚举 | `'queued' \| 'rendering' \| 'completed' \| 'failed'` | spec 没明示值 |
| `estimated_remaining` 单位 | 秒（整数） | 没明示 |
| `render_id` 格式 | `VC-XXXXX-AIGC` | 前端编的 |
| `resolution` 字符串 | `"1080×1920 (9:16)"` | 后端可能给数字或对象 |
| `shot.label` 长度 | 简短（"产品外观展示"） | 是否需要更详细 |
| `cover_url` 何时返回 | 仅在 completed 时 | 确认时序 |
| `download_url` 何时返回 | 仅在 completed 时 | 确认时序 |
| `error_message` 字段 | 失败时返回 | 没明示 |

### 4.3 取消任务端点缺失 🟡

- **spec v1.0**：没有 cancel endpoint
- **前端 UI**："取消任务"按钮目前只跳走，**不通知后端**——任务在后端继续跑完
- **建议**：spec v1.x 加 `POST /api/videos/:id/cancel` 或 `DELETE /api/videos/:id`

### 4.4 视频 URL 设计 🟢

前端目前 `/projects/:id/video` 和 `/video-creation` 路由都**不带 videoId**。每次访问 = 新任务。

**生产应该**：URL 带 videoId，可分享、可历史回看：
- 创建任务时跳 `/projects/:id/video/:videoId`
- 进页面读 useParams.videoId → 直接 GET /status

不阻塞，前端 follow-up。

---

## 5. 🆕 Dashboard 聚合端点（spec v1.0 不存在）

### 5.1 `GET /api/dashboard/overview` 新增 🔴

前端 Dashboard 页**需要一个聚合端点**：

```ts
interface DashboardOverview {
  stats: StatCardData[];                    // 4 张统计卡
  recent_projects: ProjectListItem[];       // 最近 4-6 个项目
  performance_trend: PerformanceTrendPoint[]; // 近 30 天生成数/观看量
  highlight: {
    best_conversion: { rate: string; date: string };
    viral_prediction: { category: string; level: 'low'|'medium'|'high' };
  };
}

interface StatCardData {
  key: 'total_videos' | 'monthly_new' | 'completion_rate' | 'gmv_rate';
  label: string;                            // 中文展示名
  value: string;                            // 已格式化（"1,284" / "68.4%"）
  trend: string;                            // "+12%" / "-2.1%"
  trend_dir: 'up' | 'down' | 'flat';
  bars: number[];                           // 7 天迷你条形数据
}
```

**两种实现方案**（建议方案 A）：
- **方案 A**（推荐）：后端提供 `GET /api/dashboard/overview` 直接返回聚合
- **方案 B**：前端从 `GET /api/projects` + `GET /api/analytics/*` 自己拼装（请求次数多、慢、复杂）

**Mock 参考**：[`frontend/src/mocks/handlers/dashboard.ts`](../frontend/src/mocks/handlers/dashboard.ts)

---

## 6. 优先级总览

### 🔴 必须明确（不解决联调失败）

| # | 模块 | 项 | 建议方案 |
|---|---|---|---|
| 1 | Projects | `ProjectListItem` 缺 `views` / `render_progress` / `tiktok_ready` | spec 加 3 个字段 |
| 2 | Products | PUT 响应结构与其他端点不一致 | 统一为 flat 结构 |
| 3 | Scripts | ScriptMode key 编码（中/英）| 用英文 snake key |
| 4 | Scripts | FactorKey 编码（中/英）| 用英文 snake key |
| 5 | Scripts | SSE 事件协议 | spec 补事件结构 |
| 6 | Videos | WebSocket 协议章节 | spec 补 socket 事件 |
| 7 | Dashboard | `GET /api/dashboard/overview` 新端点 | spec 加 endpoint |

### 🟡 建议处理（影响 UX / 维护性）

| # | 模块 | 项 |
|---|---|---|
| 8 | Projects | POST 是否接受 `description` |
| 9 | Projects | `?status=` 查询参数 |
| 10 | Products | GET 响应结构示例 |
| 11 | Scripts | Script GET 是否含 `history` / `product_snapshot` |
| 12 | Scripts | replace-factor 响应加 `affected_scene_ids` |
| 13 | Scripts | scene.index 所有权（建议后端忽略） |
| 14 | Scripts | scene 字段 nullable 约束 |
| 15 | Videos | status 等字段确认（见 4.2） |
| 16 | Videos | 取消任务端点 |

### 🟢 可选优化

| # | 模块 | 项 |
|---|---|---|
| 17 | Products | 408 超时单独 UX |
| 18 | Scripts | 单分镜重生 SSE 化 |
| 19 | Videos | URL 设计带 videoId |

---

## 7. 建议的联调流程

1. **后端**：基于本文档 review，决定每项的方案 → 更新 spec v1.x
2. **后端**：实现 spec v1.x 的接口（可分批，按优先级 🔴 > 🟡）
3. **前端**：每个端点真实可用后，关闭对应的 mock handler（注释掉 import），用真接口跑通
4. **前端 + 后端**：一起验证以下 e2e 链路（按页面顺序）：
   - 登录 → 进 Dashboard（验 5.1）
   - 创建项目 → ProductParse 解析（验 1.1 / 2.x）
   - 生成剧本 SSE → ScriptStudio 编辑（验 3.x）
   - 因子替换 → 观察 replace-factor（验 3.5）
   - 拖拽分镜 → saveStoryboard（验 3.6）
   - 生成视频 WebSocket 进度（验 4.x）

---

## 8. 联系方式 / 反馈

- 这份文档跟着前端代码一起维护，最新版总在 `feat/frontend-infrastructure` 分支
- 后端如有疑问 / 反馈，可以：
  1. 在 spec v1.0 文档上加批注，前端会同步本文档
  2. GitHub issue（标 `api-contract` 标签）
  3. 飞书直接 @ 前端
- 本清单覆盖前 6 个页面的 gap，后 4 个页面（Analytics / MaterialLibrary / GeneBank / ViralLibrary）实现后会补 v2.0

---

*最后更新：commit `efa9c0a`（VideoCreation 完成）*
