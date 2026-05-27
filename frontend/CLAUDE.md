# Claude Code 工作指引（前端）

> 本文件在前端目录工作时由 Claude Code 自动加载。
> 适用于 `frontend/` 子项目所有任务。

## 🎯 核心约束

1. **写任何 service / store / mock / 接口调用前，必须先读 [`frontend/docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md)**，确保字段名、端点路径、响应结构与文档对齐
2. 字段名、端点、响应结构以 [`docs/API接口规范文档.md`](../docs/API接口规范文档.md) 为最终权威；不确定不要凭印象写
3. 响应成功码是 **200**（不是 0），错误消息字段是 **`msg`**（不是 `message`）
4. 后端字段不做 camelCase 转换，原样使用（含 snake_case 字段如 `is_guest` / `cover_url` / `video_count`）

## 🛠 技术栈（不可更换）

- React 18 + TypeScript + Vite 5
- UI：Ant Design 5（不允许引入 Tailwind / MUI / shadcn 等其他 UI 库）
- 状态：Zustand（不允许引入 Redux / Jotai / MobX）
- 路由：React Router 7
- HTTP：axios（已封装拦截器，service 直接 import 用）
- 图表：Recharts
- 拖拽：@dnd-kit
- 实时：socket.io-client
- Mock：MSW（VITE_USE_MOCK=true 开启）

## 📁 目录结构与约定

```
src/
├── pages/<Page>/        # 一个页面一个目录，含 index.tsx
├── components/<C>/      # 复用组件，目录组织
├── services/<x>Service.ts
├── stores/<x>Store.ts
├── mocks/handlers/<x>.ts
├── types/<x>.ts
├── hooks/
└── utils/
```

## ✅ 提交前必须通过

```bash
npm run lint        # 必须 0 error 0 warning
npm run type-check  # 必须无错
npm run build       # 必须能产出
```

## 🚫 不要做

- 不要直接 commit / push 到 `master` 或 `develop`，永远走 `feat/xxx` 分支
- 不要在 service / store 里调 `message.*`（拦截器已统一处理错误）
- 不要给 envelope 字段重命名（不要 `code → status`、不要 `msg → message`）
- 不要把 snake_case 字段转 camelCase，照抄文档
- 不要装新的 UI 库 / 状态库 / CSS 框架，遇到需求先查 antd 是否有对应组件
- 不要创建无关的 markdown 文档；只在用户明确要求时新建

## 💬 不确定时

- 字段名 / 端点 / 状态枚举 → 翻 `docs/API接口规范文档.md`
- 项目结构 / 风格 → 参考已有的 `authService.ts` / `authStore.ts` / `mocks/handlers/auth.ts` 三个样板
- 设计 token / 颜色 / 圆角 → 看 `src/theme.ts`，**不要硬编码颜色**
