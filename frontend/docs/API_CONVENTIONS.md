# 前端 API 对接约定速查表

> **每次写 service / store / mock 之前先扫一眼这里**，避免字段名/路径/格式漂移。
> 权威来源：[`docs/API接口规范文档.md`](../../docs/API接口规范文档.md)
> 本表只覆盖前端实践，规范变动以原始文档为准。

---

## 🎯 TL;DR — 写代码前必记的 5 条

1. **成功码是 `200`，不是 `0`**；错误消息字段叫 **`msg`**，不是 `message`
2. **所有接口前缀 `/api/`**；前端 baseURL = `/api`，service 里写 `/auth/login` 即可
3. **字段名跟后端走**：Token 类是 `accessToken`/`refreshToken`（驼峰），User/业务字段多为 `snake_case`（`is_guest`、`cover_url`、`video_count`、`updated_at`）
4. **AccessToken 存 `localStorage.vidcraft_access_token`**，由 axios 请求拦截器自动注入 `Authorization: Bearer <token>`
5. **错误处理统一在 axios 响应拦截器里**——service / store 不用 try/catch + `message.error`，让它抛出去

---

## 📦 响应结构（必背）

后端所有接口（包括错误）都返回：

```ts
interface ApiResponse<T> {
  code: number;        // 200 = 成功；400/401/403/404/409/429/500/503 = 错误
  msg: string | null;  // 成功为 null，错误为人类可读消息
  total: number;       // 列表总数，非列表接口为 0
  data: T;             // 业务数据
  traceId: string;     // 链路追踪 ID（错误时给运维排查用）
}
```

**axios 响应拦截器会自动解包**：service 拿到的是 `data` 本身，不是整个 envelope。

```ts
// service 里
const user: User = await api.get('/auth/profile');
//              ↑ 直接是 data 字段，envelope 已被剥掉
```

**特殊场景**：如果需要 `total`（分页），目前没封装，先内联 `axios.get(...)` 拿 raw response 再解。

---

## 🚨 错误码与拦截器行为

拦截器对这些 HTTP 状态码已经统一处理（**不要在 service 里重复处理**）：

| Status | 拦截器行为 |
|---|---|
| `200` + `code === 200` | 解包返回 `data` |
| `200` + `code !== 200` | 弹 `message.error(msg)`，Promise reject |
| `401` | 清 token + 提示「登录已过期」（TODO: 跳登录页） |
| `403` | 弹「没有权限」 |
| `404` | 弹「资源不存在」 |
| `429` | 弹「请求过于频繁」 |
| `503` | 弹「下游 AI 服务暂不可用」+ traceId |
| `5xx` | 弹「服务异常」+ traceId |
| 超时 | 弹「请求超时」 |

**Service / store 里不要再调 `message.*`**。要在 UI 上展示**特定**错误时，用 try/catch 自己处理（拦截器仍会弹默认 toast，可以传 axios config `{ silent: true }` 关掉——目前没实现，需要时再加）。

---

## 🗂 文件结构与命名

```
src/
├── types/
│   └── <module>.ts          # 模块类型，严格按 API 文档字段名
├── services/
│   ├── api.ts               # axios 实例（不要改）
│   └── <module>Service.ts   # 一个文件一个模块
├── stores/
│   └── <module>Store.ts     # Zustand store
└── mocks/handlers/
    └── <module>.ts          # MSW handler，必须配合 service 路径一致
```

命名规范：
- 类型文件：`auth.ts`、`project.ts`（小写名词）
- Service：`authService`、`projectService`（驼峰 + Service 后缀）
- Store hook：`useAuthStore`、`useProjectStore`
- Selectors：`selectUser`、`selectIsGuest`（select 前缀）
- LocalStorage key：`vidcraft_*`（统一前缀）

---

## 🔤 字段命名（最容易出错的点）

后端**混用** camelCase 和 snake_case，前端**不转换**，原样使用：

| 区域 | 风格 | 例子 |
|---|---|---|
| Token 类 | camelCase | `accessToken`、`refreshToken` |
| URL Query / Body | snake_case | `project_id`、`confirm_name` |
| User 内字段 | snake_case | `is_guest`、`plan_type`、`video_quota` |
| Project 内字段 | snake_case | `cover_url`、`video_count`、`updated_at` |
| Product 内字段 | snake_case | `selling_points`、`target_audience`、`price_anchor` |

**判断方法**：写之前去 [`docs/API接口规范文档.md`](../../docs/API接口规范文档.md) 搜对应端点，**照抄字段名**。

---

## 📝 Service 模板

```ts
// src/services/projectService.ts
import api from './api';
import type { ProjectListItem, CreateProjectPayload, ProjectListQuery } from '@/types';

export const projectService = {
  /** 获取项目列表 */
  list(query?: ProjectListQuery): Promise<ProjectListItem[]> {
    return api.get('/projects', { params: query });
  },

  /** 获取项目详情 */
  detail(id: string): Promise<ProjectListItem> {
    return api.get(`/projects/${id}`);
  },

  /** 创建项目 */
  create(payload: CreateProjectPayload): Promise<ProjectListItem> {
    return api.post('/projects', payload);
  },

  /** 删除项目 */
  remove(id: string, confirm_name: string): Promise<void> {
    return api.delete(`/projects/${id}`, { data: { confirm_name } });
  },
};
```

**规则**：
- 一个文件一个 service 对象
- 方法名用动词（`list`/`detail`/`create`/`update`/`remove`/`upload`/`search`...）
- 路径用模板字符串拼路径参数，避免手拼
- 返回 `Promise<T>`，T 是文档定义的 data 字段类型
- **不要** try/catch、不要 `message.error`、不要在这里管 loading

---

## 🪣 Store 模板

```ts
// src/stores/projectStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { projectService } from '@/services/projectService';
import type { ProjectListItem, ProjectListQuery } from '@/types';

interface ProjectState {
  items: ProjectListItem[];
  loading: boolean;
  fetch: (query?: ProjectListQuery) => Promise<void>;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set) => ({
      items: [],
      loading: false,
      fetch: async (query) => {
        set({ loading: true }, false, 'project/fetch/start');
        try {
          const items = await projectService.list(query);
          set({ items, loading: false }, false, 'project/fetch/success');
        } catch (err) {
          set({ loading: false }, false, 'project/fetch/error');
          throw err;
        }
      },
      reset: () => set({ items: [], loading: false }, false, 'project/reset'),
    }),
    { name: 'ProjectStore' },
  ),
);

// selectors
export const selectProjects = (s: ProjectState) => s.items;
export const selectLoading = (s: ProjectState) => s.loading;
```

**规则**：
- 用 `devtools` 中间件，action 名带模块前缀（`project/fetch/start`），Redux DevTools 里好筛选
- 需要持久化的字段（如 token、当前活跃项目 id）才加 `persist`，避免冻结临时状态
- Loading / 错误状态局部用 `useState` 或 store，跨页面共享才进 store
- 异步 action 内部 try/catch 只为切 loading，错误**继续 throw 让组件捕获**

---

## 🎭 Mock Handler 模板

```ts
// src/mocks/handlers/projects.ts
import { http, HttpResponse } from 'msw';
import type { ProjectListItem } from '@/types';

const mockData: ProjectListItem[] = [/* ... */];

export const projectHandlers = [
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    // ... 分页/筛选逻辑

    return HttpResponse.json({
      code: 200,
      msg: null,
      total: mockData.length,
      data: mockData,
      traceId: `mock-${Date.now()}`,
    });
  }),
];
```

**规则**：
- **必须** 返回完整 envelope（`code`/`msg`/`total`/`data`/`traceId`）
- 路径**带 `/api` 前缀**（这是浏览器实际发出的请求路径，不是 service 里的相对路径）
- 成功 `code: 200`，`msg: null`
- 错误用 `HttpResponse.json({ code: 400, msg: '参数错误', total: 0, data: null, traceId: 'mock-x' }, { status: 400 })`
- 在 `handlers.ts` 里聚合导入

---

## 🔐 Token 与登录态

- `accessToken` 存 `localStorage.vidcraft_access_token`，**axios 拦截器自动读**，service 不用手动加
- `refreshToken` 存 `localStorage.vidcraft_refresh_token`
- `useAuthStore` 持久化 `accessToken / refreshToken / user / isAuthenticated`，刷新页面不掉线
- Token 过期（401）拦截器会清掉 localStorage + 提示重新登录（TODO: 接登录页跳转）
- 主动登出：`useAuthStore.getState().logout()` 调 `/auth/logout` + 清 localStorage + 清 store

---

## 🌐 接口前缀与代理

- 前端 `baseURL = '/api'`（见 `services/api.ts`）
- Vite dev server 把 `/api/*` 代理到 `http://localhost:3000/*`（见 `vite.config.ts`）
- 生产环境直接打到 `https://api.vidcraft.io`（通过 `VITE_API_BASE_URL` 覆盖）
- **WebSocket** 也走 `/socket.io` 代理（见 `vite.config.ts`），目前未实装

---

## 🎚 Mock 开关

`frontend/.env.development`：
```env
VITE_USE_MOCK=true   # 前端 mock，后端没起也能跑
```
后端真接口 ready 时，改成 `false` 即可全部走真接口，业务代码一行不用动。

也可以**精细化**：把 `handlers.ts` 里某个模块的 handlers 数组注释掉，那个模块就走真接口、其他还走 mock。适合"后端做完了 auth 但 projects 还在做"的过渡期。

---

## 📚 端点清单（v1.0 速查）

完整文档见 [`docs/API接口规范文档.md`](../../docs/API接口规范文档.md)，这里只列前端常用：

### Auth（M0/M1）
- `POST /api/auth/guest-login` — 游客一键登录
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录
- `POST /api/auth/refresh` — 刷新 token
- `POST /api/auth/logout` — 登出
- `GET /api/auth/profile` — 我的信息 + 配额
- `PUT /api/auth/profile` — 更新昵称/头像

### Projects（M2）
- `POST /api/projects` — 创建项目
- `GET /api/projects?page=&limit=&keyword=` — 项目列表
- `GET /api/projects/:id` — 项目详情
- `PUT /api/projects/:id` — 改名/改描述
- `DELETE /api/projects/:id` — 删除（body 带 `confirm_name`）

### Products（M3）
- `POST /api/products/parse-url` — AI 解析商品链接
- `POST /api/products/parse-image` — AI 解析商品主图（multipart）
- `PUT /api/products/:project_id` — 手动填写/更新商品信息
- `POST /api/products/:project_id/confirm` — 确认进入素材阶段
- `GET /api/products/:project_id` — 获取商品信息

### Materials（M4）
- `POST /api/materials/upload` — 批量上传（multipart）
- `GET /api/materials` — 列表
- `GET /api/materials/search?q=&mode=keyword|tag|vector` — 检索
- `GET /api/materials/:id` — 详情含切片
- `PUT /api/materials/:id/tags` — 改标签
- `DELETE /api/materials/:id` — 删素材

### Scripts（M5）
- `POST /api/scripts/generate` — 生成剧本（**SSE 流式**）
- `GET /api/scripts/:id` — 剧本详情 + 分镜列表
- `PUT /api/scripts/:id/storyboard` — 保存分镜编辑
- `POST /api/scripts/:id/regenerate-shot` — 单分镜重生
- `POST /api/scripts/:id/replace-factor` — 因子替换
- `GET /api/factors` — 因子库

### Videos（M6）
- `POST /api/videos/generate` — 提交一键成片
- `GET /api/videos?project_id=` — 取项目最新视频（⚠️ 待后端确认；前端 mock 兜底，已完成返回带 `download_url`/`cover_url` 的 task，无则 `null`。用于进视频页判断是否可直接播放）
- `GET /api/videos/:id/status` — 查任务状态（轮询 / WebSocket）
- `POST /api/videos/:id/shots/:index/regenerate` — 单镜头重生
- `PUT /api/videos/:id/settings` — TTS/BGM 配置
- `GET /api/videos/:id/download` — 下载链接
- `POST /api/videos/:id/export` — 指定画幅导出

### Analytics（M7）
- `GET /api/analytics/:video_id` — 视频指标 + 流失分布（Mock）
- `POST /api/analytics/:video_id/diagnose` — 触发诊断 Agent
- `GET /api/analytics/:video_id/diagnosis` — 诊断报告

### Gene Bank
- `GET /api/viral-library/search` — 优质视频检索
- `POST /api/viral-library/import-url` — URL 导入异步拆解
- `POST /api/viral-library/upload-analyze` — 上传视频拆解
- `GET /api/viral-library/:id` — 拆解报告
- `POST /api/viral-library/:id/reference` — 一键借鉴
- `GET /api/genes/search` — 基因检索
- `GET /api/genes/:id` — 基因详情

---

## ✅ 写新模块的 checklist

每次开始一个新业务模块（如 materials），按这个顺序：

1. 翻 [`docs/API接口规范文档.md`](../../docs/API接口规范文档.md) 对应章节，把所有相关字段抄进 `types/<module>.ts`
2. 在 `services/<module>Service.ts` 按本表模板写出 CRUD 方法
3. 在 `mocks/handlers/<module>.ts` 配置 mock，每个 handler 返回完整 envelope
4. 在 `mocks/handlers.ts` 聚合入口加上新 handlers
5. 写 `stores/<module>Store.ts`（如果需要跨页面状态）
6. 跑 `npm run lint && npm run type-check`，过了再 commit

---

## 🤖 给 AI Agent 的提醒

如果你是 Claude / Copilot / Cursor 在帮我写代码，**写任何 service / store / mock 前必须读这份文件**，并且：

- 字段名 / 端点路径 / 响应结构 **不要凭印象**，必须来自 API 文档
- 不确定的字段不要瞎编，问我或挂 TODO
- 不要把 envelope 里的 `code===0` 当成功——是 `200`
- 不要把字段从 snake_case 转 camelCase
