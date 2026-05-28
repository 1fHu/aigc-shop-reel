# Claude Code 工作指引（前端）

> 本文件在前端目录工作时由 Claude Code 自动加载。
> 适用于 `frontend/` 子项目所有任务。
>
> **完整工作流细则**：[`frontend/docs/WORKFLOW.md`](docs/WORKFLOW.md)
> **API 对接规范**：[`frontend/docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md)

---

## 🎯 核心约束

1. **写任何 service / store / mock / 接口调用前**，按以下顺序找权威：
   1. `backend/src/modules/<module>/dto/*.dto.ts` —— 后端 DTO 是最高真理
   2. `backend/src/modules/<module>/<x>.service.ts` —— 看 toFlatXxx 函数确定响应 shape
   3. `docs/API接口规范文档.md` —— spec 总览
   4. [`frontend/docs/API_CONVENTIONS.md`](docs/API_CONVENTIONS.md) —— 前端实践速查
2. **响应成功码 = `200`**（不是 0），错误消息字段 = **`msg`**（不是 `message`）
3. **不做 camelCase 转换**：`is_guest` / `cover_url` / `video_count` / `avatar_url` 等照搬后端
4. **枚举值不要发明**：照搬后端 DTO 里的 enum 数组（如 `PRODUCT_CATEGORIES`、`status` 6 值等）

---

## 🛠 技术栈（不可更换）

- React 18 + TypeScript + Vite 5
- UI：**Ant Design 5**（不允许引入 Tailwind / MUI / shadcn）
- 状态：**Zustand**（不允许引入 Redux / Jotai / MobX）
- 路由：React Router 7
- HTTP：axios（已封装拦截器，service 直接 import 用）
- 图表：Recharts
- 拖拽：@dnd-kit
- 实时：socket.io-client
- Mock：MSW（`VITE_USE_MOCK=true` 开启）

---

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

---

## 🚦 Git / 协作铁律

1. **永不直接 commit master / develop**，所有工作走 feat 分支 + Draft PR
2. **每次开工前 `git pull`**（后端可能直接 push 到你的 feat 分支）
3. **每隔 1-2 天 `git fetch && git merge origin/master`** 同步后端新进展
4. **冲突优先两边都保留**（特别是 .gitignore / 文档）
5. **PR 评论 24h 内回复**，修完回复 commit hash + Resolve conversation
6. 每次 commit message 末尾加 `⚠️ Backend coordination:` 段落（如有诉求）

---

## 🔧 环境与 Mock 切换

| 文件 | 进 git？ | 用途 |
|---|---|---|
| `.env.development` | ✅ | 团队共享 dev 默认 |
| `.env.local` | ❌（gitignored） | **个人覆盖**，前端独立开发期间放 `VITE_USE_MOCK=true` |

**开 Mock**（前端独立开发）：
```bash
echo "VITE_USE_MOCK=true" > frontend/.env.local
```

**关 Mock**（联调真后端）：
```bash
rm frontend/.env.local
```

切换后**必须重启 dev server** 才生效。

启动 dev server **必须在 `frontend/` 目录**：
```bash
cd /Users/a1234/Desktop/aigc-shop-reel/frontend && npm run dev
```

---

## ✅ 提交前必跑三连

```bash
cd frontend
npm run lint        # 必须 0 error 0 warning
npm run type-check  # 必须无错
npm run build       # 必须能产出
```

修改文档链接 / 文件名时**额外**：
```bash
grep -rn "<旧文件名>" frontend docs --include="*.md" --include="*.ts" --include="*.tsx"
# 必须 0 命中
```

---

## 🚫 不要做

- ❌ 不要直接 commit / push 到 `master` 或 `develop`
- ❌ 不要在 service / store 里调 `message.*`（拦截器已统一处理错误）
- ❌ 不要给 envelope 字段重命名（不要 `code → status`、`msg → message`）
- ❌ 不要把 snake_case 字段转 camelCase
- ❌ 不要发明枚举值（status / category / mode 等都看后端 DTO）
- ❌ 不要装新的 UI 库 / 状态库 / CSS 框架
- ❌ 不要创建无关的 markdown 文档；只在用户明确要求时新建
- ❌ 不要 `git push --force`（除非用户明确要求）
- ❌ 不要把 `prototype.html` / `DESIGN.md` / `.env.local` / `.claude/` 这些个人/临时文件 commit 进 git
- ❌ 不要在仓库根目录跑 `npm run dev`（要 `cd frontend` 再跑）

---

## 💬 不确定时

- **字段名 / 端点 / 枚举** → 翻 `backend/src/modules/*/dto/*.dto.ts`，找不到再翻 `docs/API接口规范文档.md`
- **项目结构 / 写法** → 参考样板：`authService.ts` / `authStore.ts` / `mocks/handlers/auth.ts` / `pages/Login/index.tsx`
- **设计 token / 颜色 / 圆角** → 看 `src/theme.ts`，**不要硬编码颜色**
- **开发工作流卡住** → 查 [`docs/WORKFLOW.md`](docs/WORKFLOW.md) 第 7 节"出现问题怎么办"
