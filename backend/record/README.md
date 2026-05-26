# 后端修改记录

代码变更日志、功能迭代记录、Bug 修复说明存放于此。

## 本次改动（快速概览）

- **目标**：使后端在无外部依赖（Postgres/Redis/MinIO/Volcano）的情况下可启动、可用于前端联调和 CI e2e 测试。
- **实现方式**：新增全局内存 Mock 数据层并将各模块控制器/服务接入该层，移除运行时对 TypeORM 的强依赖。

## 主要文件变更

- 新增：`src/common/mock-store.service.ts`、`src/common/mock-store.module.ts`、`src/common/api-response.ts`
- 新增：`src/app.controller.ts`（健康检查）
- 修改/实现：各模块（`auth`、`project`、`product`、`material`、`script`、`video`、`analytics`、`gene-bank`、`viral-library`、`volcano`）的控制器与服务，改为使用 MockStore
- 修复：`src/modules/auth/local.strategy.ts`（实现密码校验）
- 测试：`test/app.e2e-spec.ts` — 覆盖健康检查、访客登录与项目流、注册/登录/个人信息更新、以及若干查询接口

## 如何运行（本地快速验证）

```powershell
Set-Location e:\vidcraft\backend
npm install
npm run build
npm run test:e2e
```

测试说明：当前 e2e 测试均通过（4 个测试），但测试运行后 Jest 会报告存在未关闭的异步句柄（open handles）。这不影响测试断言结果；通常由长期运行的 socket/gateway 或第三方长期任务引起。在 CI 中可以忽略或进一步定位。

## 后续建议

- 实现或恢复 TypeORM 适配层，以便在生产环境中使用真实持久化并保留 MockStore 作为开发/CI 的回退。
- 进一步完善 `LocalStrategy` 与用户注册/验证流程的安全性（密码策略、邮箱验证、演示用户密码替换为 bcrypt 哈希）。
- 可选：将 Video Gateway 以可关闭方式改造，避免测试环境中的持续句柄。

记录时间：2026-05-23

