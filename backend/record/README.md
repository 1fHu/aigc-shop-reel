# 后端修改记录

代码变更日志、功能迭代记录、Bug 修复说明存放于此。

---

## 2026-05-30 — feat/videocreate 分支

### 认证模块重构

**登录改为用户名+密码**
- `POST /api/auth/login` 参数从 `{email, password}` 改为 `{username, password}`
- 新增 `MockStore.getUserByNickname()` 方法
- `auth.service.ts`: login 方法用 nickname 查找用户

**邮箱验证码注册流程**
- `POST /api/auth/register` 不再直接创建用户，改为发送6位验证码
- 新增 `POST /api/auth/verify-email` → 验证码校验成功后创建用户
- MockStore 新增 `storeVerificationCode()` / `consumeVerificationCode()`
- EmailService 新增 `sendVerificationCode()` 方法

**忘记/重置密码（Resend 真实邮件）**
- 新增 `POST /api/auth/forgot-password` → 发送重置链接
- 新增 `POST /api/auth/reset-password` → token 校验后更新密码
- MockStore 新增 `issueResetToken()` / `consumeResetToken()`
- EmailService 新增 `sendPasswordReset()` 方法
- 开发模式控制台输出链接：`[DEV] 密码重置链接: http://...`

**全局 HTTP 状态码修复**
- `main.ts` 全局中间件：所有 201 → 200
- auth controller 所有 POST 端点加 `@HttpCode(200)`
- `HttpExceptionFilter` 统一返回 `{code, msg, total, data, traceId}`

**预置管理员账号**
- username: `admin` / password: `admin123456` / email: `3051225284@qq.com`

### 依赖
- 新增 `resend` SDK（真实邮件发送）

### 关键文件
- `src/common/mock-store.service.ts` — 新增验证码/重置token存储
- `src/modules/auth/auth.controller.ts` — 新增 verify-email/forgot-password/reset-password
- `src/modules/auth/auth.service.ts` — 登录改username，注册改验证码流程
- `src/modules/auth/email.service.ts` — Resend 邮件发送服务
- `src/main.ts` — 全局 201→200 + HttpExceptionFilter 注册

记录时间：2026-05-30
