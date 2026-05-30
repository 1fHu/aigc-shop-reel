# 前端协作工作流

> 这份文档总结了 VidCraft 前端开发期间累积下来的协作约定。
> **每次开始一段新工作（写新页面、改 bug、做联调）前先扫一遍**。
> 适用人：前端开发者、AI Agent（Claude / Copilot 等）。
>
> 短规则版：[`frontend/CLAUDE.md`](../CLAUDE.md)（Claude Code 自动加载）

---

## 1. 环境与 Mock 切换

### 1.1 文件分工

| 文件 | 进 git？ | 用途 |
|---|---|---|
| `frontend/.env.example` | ✅ | 文档化所有可用 env 变量 |
| `frontend/.env.development` | ✅（如果存在） | **团队共享** dev 默认值 |
| `frontend/.env.local` | ❌（gitignored） | **个人覆盖**，独立于团队 |
| `frontend/.env.production` | ✅ | 生产环境固定值 |

### 1.2 Mock 开关

前端通过 `VITE_USE_MOCK=true` 启用 MSW Mock。

**前端独立开发期间**（后端未就绪 / 不想起 backend 服务）：
```bash
# 一次性设置
echo "VITE_USE_MOCK=true" > frontend/.env.local
```
之后所有的 dev server 都自动跑 mock。

**联调期间**（要打通真后端）：
```bash
rm frontend/.env.local
# 重启 dev server，自动走 Vite proxy → backend localhost:3000
```

### 1.3 启动规则

- **永远在 `frontend/` 目录跑 npm**，不要在仓库根目录
- 推荐 shell alias（写入 `~/.zshrc`）：
  ```bash
  alias vcdev='cd /Users/a1234/Desktop/aigc-shop-reel/frontend && npm run dev'
  ```

---

## 2. Git 协作模式

### 2.1 分支约定

```
master                       ← 主线（默认分支，PR 都合到这）。push 即部署到 vidcraft.icu
  ├── feat/frontend-*        ← 前端工作分支
  ├── feat/<backend-task>    ← 后端工作分支（如 dev-new-project）
  └── docs/*                 ← 文档专用分支（如 docs/prototype）

develop                      ← 已废弃，无视
```

**铁律**：
- ❌ 永远不直接 commit / push master 或 develop
- ✅ 所有工作走 feature branch → Draft PR → master
- ✅ Draft PR 持续累积 commits，最后一次性合并

### 2.2 同分支多人协作

**后端可能直接 push 到你的 feat 分支**（小修复，如根目录 `package.json` 配置）。

**每次开工前**：
```bash
git pull
```
不要直接开始写代码，否则 push 时会被打回（non-fast-forward）。

### 2.3 定期 merge master

后端的 PR 合到 master 后，**你的 feat 分支会落后**。每隔 1-2 个工作日（或后端通知有新进展时）：

```bash
git fetch origin
git log --oneline master..origin/master | head -10   # 看 master 新增了啥
git merge origin/master                                # merge 进来
```

**冲突处理**：
- `.gitignore` 冲突：**两边都保留**（前后端各自的 ignore 规则不冲突）
- 文档冲突：通常是 README / spec 更新，看实际内容决定
- 代码冲突：先看是不是后端动了你的前端代码（罕见）；冲突时跟后端沟通

### 2.4 push 注意事项

- 第一次 push 用 `git push -u origin feat/xxx` 确保 upstream 正确
- 平时直接 `git push`
- ❌ 永远不要 `git push --force`（除非你 100% 知道在做什么）

---

## 3. 后端 DTO 是真理

### 3.1 永远先看 backend 代码再写 frontend 类型

写新 service / type / mock 前**强制顺序**：

```
1. 翻 docs/API接口规范文档.md 找对应端点
2. 翻 backend/src/modules/<module>/dto/  看 DTO 定义
3. 翻 backend/src/modules/<module>/<x>.service.ts 看 response shape（特别是 toFlatXxx 函数）
4. 复制后端的字段名、枚举值、约束（max length、required 等）到 frontend types
5. 写 mock，response 结构跟 backend 一致
6. 写 service，方法签名按 backend controller 路径
```

**反例**：
- ❌ "我觉得字段叫 `coverUrl` 比较好"（后端是 `cover_url`）
- ❌ "我猜枚举有 3 个值"（后端是 6 个，类型不全前端 UI 渲染会异常）
- ❌ "我编个 `render_id` 格式" → 必须跟 backend 一致

### 3.2 字段命名约定

| 区域 | 风格 | 来源 |
|---|---|---|
| **响应包顶层** | snake_case | `{ code, msg, total, data, trace_id... }` （注意是 `traceId` 驼峰，spec 历史） |
| **Token 字段** | camelCase | `accessToken / refreshToken` |
| **业务字段（DB 列名）** | snake_case | `cover_url / video_count / updated_at / is_guest / plan_type` |
| **URL Query / Body 参数** | snake_case | `project_id / confirm_name / scene_id` |
| **TypeScript 类型字段** | **照搬后端 DTO**，不做转换 |

详见 [`API_CONVENTIONS.md`](API_CONVENTIONS.md)。

### 3.3 不确定的字段处理

如果 spec / DTO 都没明示某个字段：
1. **先在 gap 文档**（`docs/VidCraft_前端期望后端补充_v1.0.md`）找
2. 找不到 → 加 TBD 注释到前端 mock：
   ```ts
   /** ⚠️ TBD: 后端 spec 没明示，前端按 prototype 假设 */
   ```
3. 在 commit message 末尾写 `⚠️ Backend coordination: ...` 描述问题
4. PR 评论里点名问后端

---

## 4. PR 反馈循环

### 4.1 标准节奏

```
你 push → 后端 review → 评论 → 你 24h 内回复 → 修完 commit → 回复 hash + Resolve
                                       ↓
                             不同意？先沟通理由，再决定是否 Resolved
```

### 4.2 评论回复规范

- ✅ **修完了**："已修复 ✅ commit `abc1234`" + 点 "Resolve conversation"
- ✅ **不修，有理由**："理由是 XXX，建议保持现状" + 等后端再回
- ❌ **沉默** —— PR 会僵在那

### 4.3 自己提诉求给后端

每次 commit 涉及"前端期望后端补"的内容，**commit message 末尾**加：

```
⚠️ Backend coordination:
1. ProjectListItem 缺 `views` 字段，前端硬编码兜底
2. ScriptMode key 编码请确认是英文还是中文
```

这样后端 review PR 时一眼能看到诉求。

---

## 5. 提交前自检

### 5.1 必跑三连

```bash
cd frontend
npm run lint        # 必须 0 error
npm run type-check  # ⚠️ 见下，基本空跑，别只信它
npm run build       # 真正的类型门禁 + 产出，必须过
```

任何一项不过都不要 commit。

> ⚠️ **`type-check` 实为空跑**：根 `tsconfig.json` 是 `{ "files": [], "references": [...] }`（project references），`tsc --noEmit` 不会进入子项目，所以 `type-check` 几乎永远 0 报错。**真正的类型检查只发生在 `npm run build`（`tsc -b`）**。判断类型是否健康一律以 `build` 为准。

### 5.2 文档链接 grep

修改文档链接或文件名时：

```bash
grep -rn "<旧文件名>" frontend docs --include="*.md" --include="*.ts" --include="*.tsx"
```

确保**全 0 命中**才 commit。

### 5.3 staged 文件审查

```bash
git diff --cached --stat
```

确认：
- 没有意外的 `DESIGN.md` / `prototype.html` 等个人文件
- 没有 `.claude/` 等本地状态文件
- 没有 `node_modules/` 等大件

---

## 6. 实际开发的"标准动作"

每次开新工作（一个页面 / 一个 bug fix）的固定流程：

```
1. git pull                                  ← 拉最新（含后端可能的 push）
2. git fetch origin && git log master..origin/master    ← 看 master 有没有新东西要 merge
3. 必要时 git merge origin/master，解决冲突
4. 开始写代码，按 API_CONVENTIONS.md 规范
5. 跑三连：lint / type-check / build
6. 视觉自测（dev server）
7. git add <精确文件>（避开个人 / 临时文件）
8. git commit -m "..."（含 ⚠️ Backend coordination 段如有）
9. git push
10. 在 PR 评论区告诉后端"我推了 X 功能，commit Y"
```

---

## 7. 出现问题怎么办

| 症状 | 多半是 |
|---|---|
| `npm error code ENOENT` | 你不在 `frontend/` 目录 |
| `ECONNREFUSED /api/...` | MSW 没开（缺 `.env.local`）且后端没启动 |
| `Port 5173 already in use` | 之前的 dev server 没杀干净，跑 `lsof -ti:5173 \| xargs kill -9` |
| 浏览器看 mock 数据但实际是真接口的报错 | `.env.local` 设了 `VITE_USE_MOCK=true` 但 dev server 没重启 |
| `git push` 提示 non-fast-forward | 没拉就推，先 `git pull` |
| 字段名跟后端对不上 | 没翻 `backend/.../dto/*.dto.ts` 就写类型 |
| 类型报错 `'xxx' is not assignable` | 后端改了 DTO 后没同步 frontend type |

---

## 8. 工具速查

```bash
# Mock 开
echo "VITE_USE_MOCK=true" > frontend/.env.local

# Mock 关
rm frontend/.env.local

# 切到 frontend 跑 dev
cd frontend && npm run dev

# 杀 5173 端口的占用
lsof -ti:5173 | xargs kill -9 2>/dev/null

# 同步 master（看新东西 → merge）
git fetch origin
git log --oneline master..origin/master
git merge origin/master

# 检查 PR 评论里提到的文件改名是否都同步了
grep -rn "<旧文件名>" frontend docs --include="*.md"

# 三连自检
cd frontend && npm run lint && npm run type-check && npm run build
```

---

*最后更新：手动填写功能 + 后端 v1.1 集成完成*
