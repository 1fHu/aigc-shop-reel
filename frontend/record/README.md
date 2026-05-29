# 前端修改记录

代码变更日志、功能迭代记录、Bug 修复说明存放于此。

---

## 2026-05-30 — feat/videocreate 分支

### 新增页面

**Register 注册页** `src/pages/Register/`
- 左品牌秀 + 右表单（昵称/邮箱/密码/确认密码）
- 两步流程：填写信息 → 输入验证码 → 完成注册
- 配色与 Login 页完全一致（CSS Module 继承 Login.module.css）

**ForgotPassword 忘记密码页** `src/pages/ForgotPassword/`
- 输入邮箱 → 发送重置链接 → 成功提示
- 支持重新发送

**ResetPassword 重置密码页** `src/pages/ResetPassword/`
- 从邮件链接 ?token=xxx 进入
- 输入新密码 → 重置成功 → 返回登录

### 修改

**Login 登录页** `src/pages/Login/`
- 登录方式从邮箱改为用户名
- 输入框 label: 邮箱地址 → 用户名
- icon: MailOutlined → UserOutlined
- "立即注册" 链接跳转 `/register`
- "忘记密码" 链接跳转 `/forgot-password`

**App.tsx 路由**
- 新增 `/register` → `Register`
- 新增 `/forgot-password` → `ForgotPassword`
- 新增 `/reset-password` → `ResetPassword`

**Types 类型**
- `types/auth.ts`: `LoginPayload.email` → `LoginPayload.username`

### 关键文件
- `src/pages/Register/index.tsx` — 新建
- `src/pages/ForgotPassword/index.tsx` — 新建
- `src/pages/ResetPassword/index.tsx` — 新建
- `src/pages/Login/index.tsx` — 改username登录 + 链接
- `src/App.tsx` — 加3个路由
- `src/types/auth.ts` — LoginPayload.username

记录时间：2026-05-30
