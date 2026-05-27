**VidCraft**

AIGC 带货视频生成系统

**API 接口规范文档**

|  |  |
| --- | --- |
| **文档版本** | v1.1 |
| **状态** | 正式版（修订：补充 /api/users/me、修正 JWT 有效期与 Token 传输方式） |
| **基础路径** | https://api.vidcraft.io |
| **鉴权方式** | JWT Bearer Token |
| **响应格式** | JSON |

# 0. 全局约定

**0.1 基础路径**

|  |
| --- |
| Base URL: https://api.vidcraft.io  （本地开发: http://localhost:3000） |

**0.2 统一请求头**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **Authorization** | String | 条件必填 | Bearer <access\_token>，受保护接口必填 |
| **Content-Type** | String | 是 | application/json（文件上传接口为 multipart/form-data） |
| **X-Trace-Id** | String | 否 | 可选，调用方传入自定义 Trace ID；若为空则由服务端生成 |

**0.3 统一响应格式**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **code** | Integer | 状态码，200 表示成功 |
| **msg** | String / null | 错误消息，成功时为 null |
| **total** | Integer | 列表总数，非列表接口为 0 |
| **data** | Object / Array / null | 业务数据，结构见各接口说明 |
| **traceId** | String | 链路追踪 ID，排查异常时提供给运维 |

|  |
| --- |
| // 成功示例  {  "code": 200,  "msg": null,  "total": 0,  "data": { ... },  "traceId": "a1b2c3d4-..."  }  // 失败示例  {  "code": 400,  "msg": "参数校验失败：email 格式不正确",  "total": 0,  "data": null,  "traceId": "e5f6g7h8-..."  } |

**0.4 通用错误码**

| **code** | **说明** |
| --- | --- |
| **200** | 成功 |
| **400** | 请求参数错误 |
| **401** | 未鉴权或 Token 已过期 |
| **403** | 无权限（含签名验证失败） |
| **404** | 资源不存在 |
| **409** | 资源冲突（如邮箱已注册） |
| **429** | 触发限流（每用户每分钟 ≤5 次视频生成） |
| **500** | 服务器内部错误 |
| **503** | 下游 AI API 不可用 |

# 接口总览

| **方法** | **路径** | **功能说明** | **优先级** |
| --- | --- | --- | --- |
| **POST** | **/api/auth/guest-login** | 游客一键登录（无需账号密码） | P0 |
| **POST** | **/api/auth/register** | 新用户注册 | P0 |
| **POST** | **/api/auth/login** | 用户登录，获取 Token | P0 |
| **POST** | **/api/auth/refresh** | 刷新 Access Token | P0 |
| **POST** | **/api/auth/logout** | 安全退出，吊销 Refresh Token | P0 |
| **GET** | **/api/auth/profile** | 获取当前用户信息与配额 | P0 |
| **PUT** | **/api/auth/profile** | 更新昵称 / 头像 | P0 |
| **GET** | **/api/users/me** | 获取当前登录用户信息（JWT 解析） | P0 |
| **POST** | **/api/projects** | 创建新项目 | P0 |
| **GET** | **/api/projects** | 获取项目列表 | P0 |
| **GET** | **/api/projects/:id** | 获取项目详情 | P0 |
| **PUT** | **/api/projects/:id** | 更新项目名称 / 描述 | P0 |
| **DELETE** | **/api/projects/:id** | 删除项目（级联删除素材、视频） | P1 |
| **POST** | **/api/products/parse-url** | AI 解析商品链接 | P0 |
| **POST** | **/api/products/parse-image** | AI 解析商品主图 | P0 |
| **PUT** | **/api/products/:project\_id** | 手动填写 / 更新商品信息 | P0 |
| **POST** | **/api/products/:project\_id/confirm** | 确认商品信息，步骤条进入素材阶段 | P0 |
| **GET** | **/api/products/:project\_id** | 获取商品信息 | P0 |
| **POST** | **/api/products/import** | 从历史项目导入商品信息 | P1 |
| **POST** | **/api/materials/upload** | 批量上传素材，触发 AI 解析与向量化 | P0 |
| **GET** | **/api/materials** | 获取项目素材列表（支持分页） | P0 |
| **GET** | **/api/materials/search** | 多颗粒度检索（关键词/标签/向量） | P1 |
| **GET** | **/api/materials/:id** | 获取素材详情及切片列表 | P0 |
| **PUT** | **/api/materials/:id/tags** | 更新素材标签 | P1 |
| **DELETE** | **/api/materials/:id** | 删除素材（软删除） | P2 |
| **POST** | **/api/scripts/generate** | 生成剧本（SSE 流式输出） | P0 |
| **GET** | **/api/scripts/:id** | 获取剧本详情与分镜列表 | P0 |
| **PUT** | **/api/scripts/:id/storyboard** | 保存分镜编辑（顺序/内容/时长） | P0 |
| **POST** | **/api/scripts/:id/regenerate-shot** | 单分镜重新生成 | P1 |
| **POST** | **/api/scripts/:id/replace-factor** | 因子局部替换，触发受影响分镜重生成 | P1 |
| **GET** | **/api/factors** | 获取因子库（维度 + 可选值列表） | P1 |
| **POST** | **/api/videos/generate** | 提交一键成片任务 | P0 |
| **GET** | **/api/videos/:id/status** | 获取视频 / 分镜生成状态 | P0 |
| **POST** | **/api/videos/:id/shots/:index/regenerate** | 单分镜重新生成 | P0 |
| **PUT** | **/api/videos/:id/settings** | 更新 TTS 配音 / BGM 设置 | P1 |
| **GET** | **/api/videos/:id/download** | 获取视频下载临时链接 | P1 |
| **POST** | **/api/videos/:id/export** | 触发指定画幅 / 分辨率导出 | P1 |
| **POST** | **/api/volcano/seedance-callback** | Seedance 回调（内部，HMAC 验证） | P0 |
| **GET** | **/api/analytics/:video\_id** | 获取视频指标 + 分镜流失分布（Mock） | P0 |
| **POST** | **/api/analytics/:video\_id/diagnose** | 触发分析师 Agent 诊断 | P1 |
| **GET** | **/api/analytics/:video\_id/diagnosis** | 获取最新诊断报告 | P1 |
| **GET** | **/api/genes/search** | 检索爆款基因库 | P1 |
| **GET** | **/api/genes/:id** | 获取单条基因详情 | P1 |
| **GET** | **/api/viral-library/search** | 检索优质视频库 | P0 |
| **POST** | **/api/viral-library/import-url** | 导入外部视频 URL，触发异步拆解 | P0 |
| **POST** | **/api/viral-library/upload-analyze** | 上传自有视频，触发结构化拆解 | P1 |
| **GET** | **/api/viral-library/:id** | 获取视频拆解报告详情 | P0 |
| **POST** | **/api/viral-library/:id/reference** | 一键借鉴，将分镜结构注入剧本编辑器 | P1 |

# 1. M0 游客 / 演示模式

评委或访客无需注册即可一键进入演示环境，体验完整的「商品解析→剧本生成→视频创作」核心流程。

## POST /api/auth/guest-login 游客一键登录

|  |
| --- |
| 🔓 无需鉴权（公开接口） |

**请求参数**

无需任何参数，直接 POST 即可。

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **code** | Integer | 固定 200 |
| **data.accessToken** | String | JWT Access Token（有效期由服务端配置决定，开发环境默认 7 天） |
| **data.refreshToken** | String | Refresh Token（内存 Mock，服务重启失效） |
| **data.user** | Object | 用户基础信息，含 is\_guest: true 标识 |
| **data.user.quota** | Integer | 本次会话剩余配额（默认 2 条视频） |

**返回示例**

|  |
| --- |
| {  "code": 200,  "msg": null,  "total": 0,  "data": {  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  "refreshToken": "rt-guest-xxxxxxxxxxxxxxxx",  "user": {  "id": "00000000-0000-0000-0000-000000000001",  "nickname": "体验用户",  "is\_guest": true,  "quota": 2  }  },  "traceId": "a1b2c3d4-0001"  } |

|  |
| --- |
| 游客账号限制：① 不可修改密码；② 不可删除预置演示数据；③ 每次会话最多触发 2 次视频生成（视频生成可走 Mock 流程演示进度条）。 |

# 2. M1 用户认证与账户

## POST /api/auth/register 新用户注册

|  |
| --- |
| 🔓 无需鉴权（公开接口） |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **email** | String | 是 | 邮箱地址，格式校验 |
| **password** | String | 是 | 密码，≥8 位，须包含字母与数字 |
| **confirmPassword** | String | 是 | 确认密码，须与 password 一致 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.accessToken** | String | JWT Access Token（有效期由服务端配置决定，开发环境默认 7 天） |
| **data.refreshToken** | String | Refresh Token（内存 Mock，服务重启失效） |
| **data.user** | Object | 新用户信息，plan\_type: 'free'，video\_quota: 3 |

**返回示例**

|  |
| --- |
| {  "code": 200,  "msg": null,  "total": 0,  "data": {  "accessToken": "eyJ...",  "refreshToken": "rt-...",  "user": { "id": "uuid", "email": "user@example.com", "nickname": "user", "plan\_type": "free", "video\_quota": 3 }  },  "traceId": "..."  } |

## POST /api/auth/login 用户登录

|  |
| --- |
| 🔓 无需鉴权（公开接口） |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **email** | String | 是 | 邮箱地址 |
| **password** | String | 是 | 密码 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.accessToken** | String | JWT Access Token，JSON Body 返回，由客户端负责存储 |
| **data.refreshToken** | String | Refresh Token，JSON Body 返回，由客户端负责存储 |
| **data.user** | Object | 用户信息对象 |

**返回示例**

|  |
| --- |
| {  "code": 200,  "msg": null,  "total": 0,  "data": {  "accessToken": "eyJ...",  "refreshToken": "rt-...",  "user": { "id": "uuid", "email": "user@example.com", "nickname": "商家A", "plan\_type": "pro", "video\_quota": 10 }  },  "traceId": "..."  } |

|  |
| --- |
| 当前实现：Token 以 JSON Body 形式返回，客户端负责安全存储。连续失败锁定与 httpOnly Cookie 为规划功能，暂未实现。 |

## POST /api/auth/refresh 刷新 Access Token

|  |
| --- |
| 🔓 无需鉴权（公开接口） |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **refreshToken** | String | 是 | 有效的 Refresh Token |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.accessToken** | String | 新的 Access Token |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "accessToken": "eyJ..." }, "traceId": "..." } |

## POST /api/auth/logout 安全退出

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **refreshToken** | String | 是 | 当前 Refresh Token，服务端写入 Redis 黑名单 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": null, "traceId": "..." } |

## GET /api/auth/profile 获取个人信息与配额

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

无

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 用户 UUID |
| **data.email** | String | 邮箱（不可修改） |
| **data.nickname** | String | 昵称 |
| **data.avatar\_url** | String | 头像 URL |
| **data.plan\_type** | String | 套餐类型：free / pro |
| **data.video\_quota** | Integer | 本月剩余生成配额 |
| **data.is\_guest** | Boolean | 是否为游客账号 |

**返回示例**

|  |
| --- |
| {  "code": 200, "msg": null, "total": 0,  "data": {  "id": "uuid", "email": "user@example.com",  "nickname": "商家A", "avatar\_url": "https://cdn.../avatar.jpg",  "plan\_type": "free", "video\_quota": 2, "is\_guest": false  }, "traceId": "..."  } |

## PUT /api/auth/profile 更新个人信息

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（multipart/form-data）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **nickname** | String | 否 | 昵称，1–30 字符 |
| **avatar** | File | 否 | 头像图片，JPG/PNG，≤2MB，自动裁剪为 1:1 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "nickname": "新昵称", "avatar\_url": "https://..." }, "traceId": "..." } |

## GET /api/users/me 获取当前用户信息

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

无

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 用户 UUID |
| **data.email** | String | 邮箱 |
| **data.nickname** | String | 昵称 |
| **data.avatar\_url** | String | 头像 URL |
| **data.plan\_type** | String | 套餐类型：free / pro |
| **data.video\_quota** | Integer | 剩余生成配额 |
| **data.is\_guest** | Boolean | 是否为游客账号 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "uuid", "email": "user@example.com", "nickname": "商家A", "avatar\_url": null, "plan\_type": "free", "video\_quota": 3, "is\_guest": false }, "traceId": "..." } |

|  |
| --- |
| 与 GET /api/auth/profile 功能相同，均返回当前 JWT 对应的用户信息。/api/users/me 挂载于 UserModule，/api/auth/profile 挂载于 AuthModule，两者可互为备用。 |

# 3. M2 项目管理

## POST /api/projects 创建项目

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **name** | String | 是 | 项目名称，2–50 字符 |
| **description** | String | 否 | 项目描述，≤200 字符 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 新项目 UUID |
| **data.name** | String | 项目名称 |
| **data.status** | String | 初始状态：draft |
| **data.created\_at** | String | 创建时间 ISO 8601 |

**返回示例**

|  |
| --- |
| {  "code": 200, "msg": null, "total": 0,  "data": {  "id": "proj-uuid", "name": "夏季防晒霜推广",  "description": "", "status": "draft", "created\_at": "2025-06-01T10:00:00Z"  }, "traceId": "..."  } |

## GET /api/projects 获取项目列表

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（Query）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **page** | Integer | 否 | 页码，默认 1 |
| **limit** | Integer | 否 | 每页条数，默认 20，最大 50 |
| **keyword** | String | 否 | 项目名称关键词筛选 |
| **status** | String | 否 | 按状态筛选：`draft` / `in_progress` / `completed` / `all`（默认 `all`） |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **total** | Integer | 项目总数 |
| **data[]** | Array | 项目列表 |
| **data[].id** | String | 项目 UUID |
| **data[].name** | String | 项目名称 |
| **data[].cover\_url** | String | 商品封面图 URL |
| **data[].video\_count** | Integer | 已生成视频数量 |
| **data[].status** | String | 项目状态：draft / in\_progress / completed |
| **data[].views** | Integer | 该项目下视频累计播放量 |
| **data[].render\_progress** | Integer | 渲染进度 0-100，状态为 in\_progress 时进度条用 |
| **data[].tiktok\_ready** | Boolean | 是否达到 TikTok 发布标准 |
| **data[].updated\_at** | String | 最后编辑时间 |

**返回示例**

|  |
| --- |
| {  "code": 200, "msg": null, "total": 3,  "data": [  { "id": "proj-001", "name": "防晒霜推广", "cover\_url": "https://...", "video\_count": 2, "status": "in\_progress", "views": 4200, "render\_progress": 100, "tiktok\_ready": true, "updated\_at": "2025-06-01T12:00:00Z" }  ], "traceId": "..."  } |

## GET /api/projects/:id 获取项目详情

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 项目 UUID |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 项目 UUID |
| **data.name** | String | 项目名称 |
| **data.description** | String | 项目描述 |
| **data.status** | String | 项目状态 |
| **data.product\_info** | Object | 已解析的商品信息 JSONB |
| **data.material\_count** | Integer | 素材数量 |
| **data.script\_count** | Integer | 已生成剧本数量 |
| **data.video\_count** | Integer | 已生成视频数量 |

**返回示例**

|  |
| --- |
| {  "code": 200, "msg": null, "total": 0,  "data": {  "id": "proj-001", "name": "防晒霜推广", "description": "夏季爆款",  "status": "in\_progress",  "product\_info": { "name": "XX防晒霜", "category": "美妆", "selling\_points": ["SPF50+", "轻薄不油腻"], "target\_audience": "18-30岁都市女性" },  "material\_count": 5, "script\_count": 2, "video\_count": 1  }, "traceId": "..."  } |

## PUT /api/projects/:id 更新项目

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 项目 UUID |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **name** | String | 否 | 新项目名称，2–50 字符 |
| **description** | String | 否 | 新项目描述，≤200 字符 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "proj-001", "name": "新名称", "updated\_at": "2025-06-02T10:00:00Z" }, "traceId": "..." } |

## DELETE /api/projects/:id 删除项目

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 项目 UUID |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **confirm\_name** | String | 是 | 输入项目名称二次确认，防误操作 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": null, "traceId": "..." } |

|  |
| --- |
| 删除操作将级联删除该项目下所有素材文件（MinIO）、剧本、视频任务记录，且不可恢复。 |

# 4. M3 商品解析

## POST /api/products/parse-url AI 解析商品链接

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 所属项目 UUID |
| **url** | String | 是 | 商品详情页 URL（支持 TikTok Shop / 淘宝 / 亚马逊等主流平台） |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.name** | String | 商品名称 |
| **data.category** | String | 品类 |
| **data.selling\_points** | Array | 核心卖点列表，≤5 条 |
| **data.target\_audience** | String | 目标人群描述 |
| **data.usage\_scene** | String | 使用场景 |
| **data.price\_anchor** | String | 价格锚点（如 '原价¥299，现¥99'） |
| **data.cover\_url** | String | 商品主图 URL（从页面提取） |

**返回示例**

|  |
| --- |
| {  "code": 200, "msg": null, "total": 0,  "data": {  "name": "XX SPF50+ 防晒霜 50ml", "category": "美妆",  "selling\_points": ["SPF50+ PA++++", "轻薄不油腻", "防水防汗"],  "target\_audience": "18-30岁都市女性", "usage\_scene": "户外运动/日常出行",  "price\_anchor": "原价¥199，现¥89", "cover\_url": "https://..."  }, "traceId": "..."  } |

|  |
| --- |
| 解析调用 Doubao-Seed-2.0-pro Function Calling；超时阈值 15s，超时时返回 code: 408 并提示「解析超时，请尝试手动填写」。 |

## POST /api/products/parse-image AI 解析商品主图

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（multipart/form-data）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 所属项目 UUID |
| **image** | File | 是 | 商品主图，JPG/PNG/WEBP，≤10MB |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data** | Object | 同 parse-url 返回结构，字段一致 |
| **data.cover\_url** | String | 上传图片在 MinIO 中的访问 URL |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "name": "防晒霜", "category": "美妆", "selling\_points": ["SPF50+"], "target\_audience": "...", "usage\_scene": "...", "price\_anchor": "...", "cover\_url": "https://minio/.../image.jpg" }, "traceId": "..." } |

## PUT /api/products/:project\_id 手动填写 / 更新商品信息

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 项目 UUID |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **name** | String | 是 | 商品名称 |
| **category** | String | 是 | 品类，枚举值见附录 |
| **selling\_points** | Array<String> | 是 | 核心卖点，≤5 条 |
| **target\_audience** | String | 否 | 目标人群 |
| **usage\_scene** | String | 否 | 使用场景 |
| **price\_anchor** | String | 否 | 价格锚点 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "project\_id": "proj-001", "product\_info": { ... }, "updated\_at": "2025-06-01T12:00:00Z" }, "traceId": "..." } |

## POST /api/products/:project\_id/confirm 确认商品信息

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 项目 UUID |

**请求参数**

无（以当前保存的 product\_info 作为最终确认数据）。

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "project\_id": "proj-001", "status": "material\_pending" }, "traceId": "..." } |

## GET /api/products/:project\_id 获取商品信息

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "project\_id": "proj-001", "product\_info": { "name": "...", "category": "美妆", "selling\_points": [...], "target\_audience": "...", "usage\_scene": "...", "price\_anchor": "..." }, "confirmed": true }, "traceId": "..." } |

## POST /api/products/import 从历史项目导入商品信息

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **target\_project\_id** | String | 是 | 导入目标项目 UUID |
| **source\_project\_id** | String | 是 | 来源项目 UUID |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "project\_id": "proj-002", "product\_info": { ... } }, "traceId": "..." } |

# 5. M4 素材库

## POST /api/materials/upload 批量上传素材

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（multipart/form-data）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 所属项目 UUID |
| **files** | File[] | 是 | 素材文件列表，单次最多 20 个。图片：JPG/PNG/WEBP ≤20MB；视频：MP4/MOV/AVI ≤500MB 时长≤5min |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data[]** | Array | 上传结果列表 |
| **data[].id** | String | 素材 UUID |
| **data[].file\_type** | String | image / video |
| **data[].file\_url** | String | MinIO 访问 URL |
| **data[].status** | String | parsing（AI 解析中）/ ready |
| **data[].thumbnail\_url** | String | 缩略图 URL（视频取首帧） |

**返回示例**

|  |
| --- |
| {  "code": 200, "msg": null, "total": 2,  "data": [  { "id": "mat-001", "file\_type": "image", "file\_url": "https://...", "status": "parsing", "thumbnail\_url": "https://..." },  { "id": "mat-002", "file\_type": "video", "file\_url": "https://...", "status": "parsing", "thumbnail\_url": "https://..." }  ], "traceId": "..."  } |

|  |
| --- |
| 上传完成后异步触发 AI 解析流程：NestJS VolcanoApiService 调用 Doubao Vision 提取标签与描述，再调用 Doubao Embedding 进行 1024 维向量化（存入 pgvector）；视频素材同时触发 Python FastAPI 执行 FFmpeg 场景切片。 |

## GET /api/materials 获取素材列表

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（Query）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 项目 UUID |
| **type** | String | 否 | 文件类型筛选：image / video / all，默认 all |
| **page** | Integer | 否 | 页码，默认 1 |
| **limit** | Integer | 否 | 每页条数，默认 24 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **total** | Integer | 素材总数 |
| **data[].id** | String | 素材 UUID |
| **data[].file\_type** | String | image / video |
| **data[].thumbnail\_url** | String | 缩略图 URL |
| **data[].status** | String | parsing / ready / failed |
| **data[].tags** | Array | AI 提取的标签列表 |
| **data[].duration** | Float | 视频时长（秒），图片为 null |
| **data[].created\_at** | String | 上传时间 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 5, "data": [ { "id": "mat-001", "file\_type": "image", "thumbnail\_url": "https://...", "status": "ready", "tags": ["防晒霜", "美妆", "轻薄"], "duration": null, "created\_at": "2025-06-01T10:00:00Z" } ], "traceId": "..." } |

## GET /api/materials/search 多颗粒度素材检索

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（Query）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 项目 UUID |
| **q** | String | 否 | 关键词（全文检索，PostgreSQL GIN 索引） |
| **tags** | String | 否 | 标签筛选，逗号分隔，AND 逻辑 |
| **vector\_query** | String | 否 | 自然语言描述，后端向量化后做余弦相似度检索 |
| **mode** | String | 否 | 检索模式：keyword / tag / vector / hybrid，默认 hybrid |
| **level** | String | 否 | 检索粒度：material（整素材）/ slice（切片），默认 material |
| **top\_k** | Integer | 否 | 向量检索返回数量，默认 10，最大 50 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data[].id** | String | 素材或切片 UUID |
| **data[].type** | String | material / slice |
| **data[].thumbnail\_url** | String | 缩略图 URL |
| **data[].tags** | Array | 标签列表 |
| **data[].score** | Float | 向量相似度分数（0-1），关键词检索时为 null |
| **data[].start\_sec** | Float | 切片起始秒（仅 slice） |
| **data[].end\_sec** | Float | 切片结束秒（仅 slice） |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 8, "data": [ { "id": "slice-001", "type": "slice", "thumbnail\_url": "https://...", "tags": ["防晒霜特写", "质感"], "score": 0.92, "start\_sec": 3.5, "end\_sec": 8.2 } ], "traceId": "..." } |

## GET /api/materials/:id 获取素材详情

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 素材 UUID |
| **data.file\_url** | String | 原始文件 URL |
| **data.file\_type** | String | image / video |
| **data.analysis** | Object | AI 解析结果 JSONB（标签、描述、色调等） |
| **data.slices** | Array | 切片列表（仅视频素材） |
| **data.slices[].id** | String | 切片 UUID |
| **data.slices[].start\_sec** | Float | 起始秒 |
| **data.slices[].end\_sec** | Float | 结束秒 |
| **data.slices[].thumbnail\_url** | String | 切片缩略图 |
| **data.slices[].tags** | Array | 切片细粒度标签 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "mat-002", "file\_url": "https://...", "file\_type": "video", "analysis": { "summary": "商品展示视频", "tags": ["防晒霜", "美妆"], "duration": 45.2 }, "slices": [ { "id": "slice-001", "start\_sec": 0, "end\_sec": 5.5, "thumbnail\_url": "https://...", "tags": ["开场镜头", "产品外包装"] } ] }, "traceId": "..." } |

## PUT /api/materials/:id/tags 更新素材标签

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **tags** | Array<String> | 是 | 新标签列表，覆盖现有标签 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "mat-001", "tags": ["防晒霜", "SPF50+", "夏日"] }, "traceId": "..." } |

## DELETE /api/materials/:id 删除素材

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.referenced\_shots** | Integer | 该素材被引用的分镜数量，>0 时前端展示提示 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "deleted": true, "referenced\_shots": 0 }, "traceId": "..." } |

|  |
| --- |
| 删除执行软删除（DB 标记 deleted\_at）+ MinIO 文件异步清理，不影响已完成的视频文件。 |

# 6. M5 剧本生成

## POST /api/scripts/generate 生成剧本（SSE 流式输出）

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **project\_id** | String | 是 | 所属项目 UUID |
| **strategy\_type** | String | 是 | 创作策略：pain\_point（痛点共鸣）/ review（产品测评）/ story（情感故事）/ promotion（限时促销） |
| **mode** | String | 否 | 生产模式：default / viral\_copy（爆款仿写）/ template（灵感模板），默认 default |
| **reference\_id** | String | 否 | 参考视频 ID（mode=viral\_copy 时必填，来自 viral\_library 或 viral\_genes） |
| **template\_id** | String | 否 | 模板 ID（mode=template 时必填） |

|  |
| --- |
| 响应类型：text/event-stream（SSE）。前端通过 EventSource 接收流式数据，分镜逐条推送。 |

**SSE 事件格式**

|  |
| --- |
| // 分镜生成中（逐条推送）  data: { "event": "shot", "index": 0, "shot": { "description": "开场特写...", "camera\_motion": "push-in", "duration": 3, "voiceover": "你还在为...", "subtitle": "拒绝油腻感" } }  // 全部分镜生成完成  data: { "event": "done", "script\_id": "scrip-001", "total\_shots": 5, "total\_duration": 15 }  // 生成失败  data: { "event": "error", "msg": "API超时，请重试", "traceId": "..." } |

## GET /api/scripts/:id 获取剧本详情

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 剧本 UUID |
| **data.strategy\_type** | String | 创作策略类型 |
| **data.status** | String | draft / confirmed |
| **data.total\_duration** | Float | 总时长（秒） |
| **data.storyboard** | Array | 分镜列表 |
| **data.storyboard[].index** | Integer | 分镜序号（从 0 开始） |
| **data.storyboard[].description** | String | 画面描述 |
| **data.storyboard[].camera\_motion** | String | 镜头运动：push-in / pull-out / pan-left / static 等 |
| **data.storyboard[].duration** | Float | 时长（秒） |
| **data.storyboard[].voiceover** | String | 配音文案 |
| **data.storyboard[].subtitle** | String | 字幕文字 |
| **data.storyboard[].reference\_image\_url** | String | 参考图 URL（图生视频路径使用） |
| **data.factors** | Object | 当前剧本的因子快照 JSONB |
| **data.factor\_history** | Array | 因子替换操作历史 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "scrip-001", "strategy\_type": "pain\_point", "status": "draft", "total\_duration": 14.5, "storyboard": [ { "index": 0, "description": "特写防晒霜瓶身...", "camera\_motion": "push-in", "duration": 3.0, "voiceover": "夏天出门，你最怕什么？", "subtitle": "你最怕什么", "reference\_image\_url": null } ], "factors": { "visual\_style": "轻奢质感风", "hook\_type": "问题式Hook", "narration\_style": "活泼种草", "rhythm": "中速", "cta": "立即下单" }, "factor\_history": [] }, "traceId": "..." } |

## PUT /api/scripts/:id/storyboard 保存分镜编辑

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **storyboard** | Array | 是 | 完整分镜列表（顺序即为最终顺序），字段同 GET 返回的 storyboard[] |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "scrip-001", "updated\_at": "2025-06-01T15:00:00Z", "total\_duration": 13.5 }, "traceId": "..." } |

## POST /api/scripts/:id/regenerate-shot 单分镜重新生成

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **shot\_index** | Integer | 是 | 分镜序号（从 0 开始） |
| **new\_prompt** | String | 否 | 新的画面描述 Prompt；若为空则沿用原有描述重生成 |

|  |
| --- |
| 响应类型：text/event-stream（SSE），格式同 /generate 中的 shot 事件。 |

**返回示例（完成事件）**

|  |
| --- |
| data: { "event": "done", "shot\_index": 2, "shot": { "description": "新画面描述...", "duration": 3.0, "voiceover": "..." } } |

## POST /api/scripts/:id/replace-factor 因子局部替换

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **dimension** | String | 是 | 替换的因子维度，枚举：visual\_style / hook\_type / narration\_style / rhythm / cta |
| **new\_value** | String | 是 | 新的因子值（来自 GET /api/factors 返回的可选值） |
| **scope** | String | 否 | 重生成范围：affected（仅受影响的分镜）/ all（全部分镜重生成），默认 affected |

|  |
| --- |
| 响应类型：text/event-stream（SSE）。受影响的分镜流式推送更新，未受影响的分镜不重生成。完成后推送 done 事件，factor\_history 自动追加本次记录，支持撤销。 |

**返回示例（完成事件）**

|  |
| --- |
| data: { "event": "done", "script\_id": "scrip-001", "replaced\_dimension": "visual\_style", "new\_value": "夏日度假风", "affected\_shots": [0, 1, 2], "factor\_history\_id": "fh-001" } |

## GET /api/factors 获取因子库

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

无

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data[]** | Array | 因子维度列表 |
| **data[].dimension** | String | 维度 Key：visual\_style / hook\_type / narration\_style / rhythm / cta |
| **data[].label** | String | 维度中文名称 |
| **data[].description** | String | 维度说明 |
| **data[].values** | Array | 可选值列表 |
| **data[].values[].value** | String | 因子值 Key |
| **data[].values[].label** | String | 因子值中文描述 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 5, "data": [ { "dimension": "visual\_style", "label": "视觉风格", "description": "控制画面整体色调与构图偏好", "values": [ { "value": "minimalist\_black", "label": "黑风极简" }, { "value": "summer\_vacation", "label": "夏日度假风" }, { "value": "cyberpunk", "label": "赛博科技风" }, { "value": "luxury", "label": "轻奢质感风" } ] } ], "traceId": "..." } |

# 7. M6 视频创作

## POST /api/videos/generate 提交一键成片任务

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **script\_id** | String | 是 | 已确认的剧本 UUID |
| **project\_id** | String | 是 | 所属项目 UUID |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.video\_id** | String | 视频任务 UUID |
| **data.trace\_id** | String | 全局链路追踪 ID（贯穿整个生成流程） |
| **data.task\_count** | Integer | 总分镜任务数量 |
| **data.status** | String | 初始状态：queued |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "video\_id": "vid-001", "trace\_id": "tr-abc123", "task\_count": 5, "status": "queued" }, "traceId": "tr-abc123" } |

|  |
| --- |
| 配额不足时返回 code: 429，msg: '本月配额已耗尽，请升级套餐'。生成任务并发提交至 BullMQ 队列，每个分镜独立调用 Seedance API（携带 HMAC 签名的 callback\_url + traceId）。 |

## GET /api/videos/:id/status 获取视频生成状态

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 视频 UUID |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.video\_id** | String | 视频 UUID |
| **data.status** | String | 整体状态：queued / generating / composing / completed / failed |
| **data.progress** | Integer | 完成百分比（0-100） |
| **data.completed\_shots** | Integer | 已完成分镜数 |
| **data.total\_shots** | Integer | 总分镜数 |
| **data.estimated\_seconds** | Integer | 预计剩余秒数 |
| **data.shots[]** | Array | 各分镜状态列表 |
| **data.shots[].index** | Integer | 分镜序号 |
| **data.shots[].status** | String | queued / generating / completed / failed / retrying |
| **data.shots[].retry\_count** | Integer | 已重试次数（最多 3 次） |
| **data.shots[].error\_msg** | String | 失败原因（status=failed 时有值） |
| **data.shots[].thumbnail\_url** | String | 已完成分镜的视频截图 URL |
| **data.shots[].preview\_url** | String | 已完成分镜的视频预览 URL |
| **data.trace\_id** | String | 链路追踪 ID |

|  |
| --- |
| 建议同时通过 WebSocket 订阅实时推送（事件：shot:completed / shot:failed / video:composing / video:completed），此接口作为轮询兜底（每 5s 轮询一次）。 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "video\_id": "vid-001", "status": "generating", "progress": 40, "completed\_shots": 2, "total\_shots": 5, "estimated\_seconds": 90, "shots": [ { "index": 0, "status": "completed", "retry\_count": 0, "error\_msg": null, "thumbnail\_url": "https://...", "preview\_url": "https://..." }, { "index": 1, "status": "generating", "retry\_count": 0, "error\_msg": null, "thumbnail\_url": null, "preview\_url": null } ], "trace\_id": "tr-abc123" }, "traceId": "tr-abc123" } |

## POST /api/videos/:id/shots/:index/regenerate 单分镜重新生成

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 视频 UUID |
| **index** | Integer | 是 | 分镜序号（从 0 开始） |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **new\_prompt** | String | 否 | 新的画面描述 Prompt；若为空则沿用剧本中该分镜描述重生成 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "shot\_task\_id": "task-005", "status": "queued", "trace\_id": "tr-abc124" }, "traceId": "tr-abc124" } |

## PUT /api/videos/:id/settings 更新 TTS 配音 / BGM 设置

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **tts.language** | String | 否 | 配音语言：zh / en / ja / ko |
| **tts.voice** | String | 否 | 音色 ID，见附录音色列表 |
| **bgm.preset\_id** | String | 否 | 预置 BGM ID（来自 /api/videos/bgm-presets） |
| **bgm.custom\_url** | String | 否 | 自定义 BGM 的 MinIO URL（与 preset\_id 二选一） |
| **bgm.volume** | Float | 否 | BGM 音量比例，0.0–0.3，默认 0.15 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "video\_id": "vid-001", "tts": { "language": "zh", "voice": "female\_gentle" }, "bgm": { "preset\_id": "bgm-001", "volume": 0.15 } }, "traceId": "..." } |

## GET /api/videos/:id/download 获取视频下载链接

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 视频 UUID |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.download\_url** | String | MinIO 预签名下载 URL，有效期 24 小时 |
| **data.file\_size** | Integer | 文件大小（字节） |
| **data.duration** | Float | 视频时长（秒） |
| **data.resolution** | String | 分辨率，如 1920x1080 |
| **data.expires\_at** | String | 链接过期时间 ISO 8601 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "download\_url": "https://minio/.../vid-001.mp4?X-Amz-Expires=86400...", "file\_size": 25165824, "duration": 14.5, "resolution": "1080x1920", "expires\_at": "2025-06-02T12:00:00Z" }, "traceId": "..." } |

## POST /api/videos/:id/export 触发导出（指定画幅 / 分辨率）

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **aspect\_ratio** | String | 是 | 画幅比例：9:16（竖版）/ 16:9（横版）/ 1:1（方形） |
| **resolution** | String | 是 | 分辨率：720p / 1080p |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "export\_task\_id": "exp-001", "status": "queued", "estimated\_seconds": 60 }, "traceId": "..." } |

## POST /api/volcano/seedance-callback Seedance 回调接收（内部接口）

|  |
| --- |
| 🔓 无需鉴权（公开接口） |

|  |
| --- |
| ⚠️ 内部接口，不对外暴露于公共域名，仅供火山引擎 Seedance 服务回调使用。通过 Nginx location 配置限制访问路径。回调端点使用 HMAC-SHA256 签名验证，token 参数携带于 Query 中。 |

**请求参数（Query）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **token** | String | 是 | HMAC-SHA256 签名（基于 task\_id + 密钥计算），验证失败返回 403 |
| **trace\_id** | String | 是 | 链路追踪 ID（任务创建时传入） |

**请求 Body（Seedance 回调格式）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **task\_id** | String | 是 | Seedance 任务 ID |
| **status** | String | 是 | succeed / failed |
| **video\_url** | String | 否 | 生成视频 URL（status=succeed 时有值） |
| **error\_code** | String | 否 | 错误码（status=failed 时有值） |
| **error\_msg** | String | 否 | 错误描述 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "received": true }, "traceId": "tr-abc123" } |

# 8. M7 数据看板与 AI 诊断

|  |
| --- |
| 本模块数据为 Mock 演示数据，数据结构与真实电商后台对齐，支持接入真实 API 替换。 |

## GET /api/analytics/:video\_id 获取视频指标

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.video\_id** | String | 视频 UUID |
| **data.views** | Integer | 总播放量 |
| **data.three\_second\_rate** | Float | 3s 留存率（%） |
| **data.completion\_rate** | Float | 完播率（%） |
| **data.click\_rate** | Float | 点击率（%） |
| **data.conversion\_rate** | Float | 转化率（%） |
| **data.gmv** | Float | GMV（元） |
| **data.watch\_time\_distribution** | Array | 时间轴观看留存分布，每秒一个数据点 |
| **data.watch\_time\_distribution[].second** | Float | 视频秒数 |
| **data.watch\_time\_distribution[].retention** | Float | 该时刻留存率（%） |
| **data.shot\_boundaries** | Array | 各分镜时间边界（秒），用于时间轴标注 |
| **data.needs\_optimization** | Boolean | 是否建议优化（完播率<30%或转化率<0.1%） |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "video\_id": "vid-001", "views": 12500, "three\_second\_rate": 68.5, "completion\_rate": 28.3, "click\_rate": 4.2, "conversion\_rate": 0.08, "gmv": 1250.0, "watch\_time\_distribution": [ { "second": 0, "retention": 100 }, { "second": 3, "retention": 68.5 }, { "second": 8, "retention": 42.1 }, { "second": 14.5, "retention": 28.3 } ], "shot\_boundaries": [0, 3.0, 6.5, 10.0, 12.5, 14.5], "needs\_optimization": true }, "traceId": "..." } |

## POST /api/analytics/:video\_id/diagnose 触发 AI 诊断

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

无（使用该视频当前的指标数据自动诊断）。

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.diagnosis\_id** | String | 诊断报告 UUID |
| **data.status** | String | analyzing / completed |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "diagnosis\_id": "diag-001", "status": "analyzing" }, "traceId": "..." } |

|  |
| --- |
| 诊断调用 Analyst Agent（Doubao-Seed-2.0-pro），传入完播率数据 + 场景流失分布进行分析，结果通过 WebSocket 推送 diagnosis:completed 事件，或前端轮询 GET /api/analytics/:video\_id/diagnosis 获取。 |

## GET /api/analytics/:video\_id/diagnosis 获取诊断报告

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.diagnosis\_id** | String | 诊断报告 UUID |
| **data.status** | String | analyzing / completed |
| **data.issues[]** | Array | 问题列表 |
| **data.issues[].shot\_index** | Integer | 问题所在分镜序号 |
| **data.issues[].issue\_type** | String | 问题类型：hook\_weak / content\_drop / cta\_missing 等 |
| **data.issues[].severity** | String | 严重程度：high / medium / low |
| **data.issues[].description** | String | 具体问题描述 |
| **data.issues[].optimized\_prompt** | String | AI 给出的优化 Prompt 示例 |
| **data.created\_at** | String | 诊断时间 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "diagnosis\_id": "diag-001", "status": "completed", "issues": [ { "shot\_index": 0, "issue\_type": "hook\_weak", "severity": "high", "description": "开场 Hook 力度不足，3s 留存率仅 68.5%，建议增加痛点冲击感。", "optimized\_prompt": "开场3秒用特写镜头展示夏天皮肤晒伤的对比，画外音：你知道没做好防晒会怎样吗？" } ], "created\_at": "2025-06-01T16:00:00Z" }, "traceId": "..." } |

# 9. M8 爆款基因库

## GET /api/genes/search 检索爆款基因库

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（Query）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **category** | String | 否 | 品类筛选，枚举见附录 |
| **keyword** | String | 否 | 关键词搜索 |
| **vector\_query** | String | 否 | 自然语言语义检索 |
| **limit** | Integer | 否 | 返回数量，默认 10，最大 30 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data[].id** | String | 基因 UUID |
| **data[].category** | String | 品类 |
| **data[].strategy\_summary** | String | 策略摘要（视频创作的抽象方法） |
| **data[].factors** | Object | 因子组合快照 JSONB |
| **data[].storyboard\_structure** | Object | 分镜结构摘要 JSONB |
| **data[].performance\_score** | Float | 性能分（0-100），基于转化率等指标计算 |
| **data[].shot\_count** | Integer | 分镜数量 |
| **data[].source\_count** | Integer | 聚类来源视频数量 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 12, "data": [ { "id": "gene-001", "category": "美妆", "strategy\_summary": "第一人称BGM氛围沉浸：用轻柔BGM引入真实使用场景，强调质感体验", "factors": { "visual\_style": "轻奢质感风", "hook\_type": "问题式Hook", "narration\_style": "优雅知性", "rhythm": "慢镜强调", "cta": "品牌心智" }, "storyboard\_structure": { "shot\_count": 4, "rhythm": "慢-快-慢", "cta\_position": "last\_shot" }, "performance\_score": 88.5, "shot\_count": 4, "source\_count": 7 } ], "traceId": "..." } |

## GET /api/genes/:id 获取基因详情

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data** | Object | 基因完整信息，含 search 接口所有字段 |
| **data.source\_videos** | Array | 来源视频摘要列表（含 viral\_library 拆解报告引用） |
| **data.created\_at** | String | 入库时间 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "gene-001", "category": "美妆", "strategy\_summary": "...", "factors": { ... }, "storyboard\_structure": { ... }, "performance\_score": 88.5, "shot\_count": 4, "source\_count": 7, "source\_videos": [ { "viral\_library\_id": "vlib-001", "title": "防晒霜测评爆款视频", "platform": "TikTok" } ], "created\_at": "2025-06-01T08:00:00Z" }, "traceId": "..." } |

# 10. M9 优质视频库

|  |
| --- |
| 合规说明：本模块仅保存公开视频的结构化分析结果，不复刻、不存储原始视频本体。每条条目声明素材来源（source\_url + platform + declared\_at）。yt-dlp 仅获取公开元数据（标题/描述/封面图），不涉及版权内容下载。 |

## GET /api/viral-library/search 检索优质视频库

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（Query）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **category** | String | 否 | 品类筛选 |
| **keyword** | String | 否 | 关键词搜索（命中标题 / 拆解报告） |
| **platform** | String | 否 | 平台筛选：youtube / tiktok / instagram / local / all，默认 all |
| **sort\_by** | String | 否 | 排序字段：score（性能分）/ created\_at，默认 created\_at |
| **sort\_order** | String | 否 | asc / desc，默认 desc |
| **page** | Integer | 否 | 页码，默认 1 |
| **limit** | Integer | 否 | 每页条数，默认 12，最大 30 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **total** | Integer | 总数 |
| **data[].id** | String | 视频库条目 UUID |
| **data[].title** | String | 视频标题 |
| **data[].platform** | String | 来源平台 |
| **data[].source\_url** | String | 原始视频 URL（外部链接） |
| **data[].declared\_at** | String | 来源声明时间 |
| **data[].cover\_url** | String | 封面图 URL（从元数据或 Doubao Vision 提取） |
| **data[].status** | String | analyzing / completed / failed |
| **data[].performance\_score** | Float | 性能分（若有数据则展示，否则为 null） |
| **data[].analysis\_report.hook** | String | Hook 手法摘要 |
| **data[].analysis\_report.shot\_count** | Integer | 估计分镜数 |
| **data[].analysis\_report.rhythm** | String | 节奏特征 |
| **data[].analysis\_report.cta** | String | CTA 形式 |
| **data[].analysis\_report.style\_tags** | Array | 视觉风格标签列表 |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 28, "data": [ { "id": "vlib-001", "title": "防晒霜测评｜亲测4款SPF50防晒，谁更好用？", "platform": "tiktok", "source\_url": "https://www.tiktok.com/@xxx/video/xxx", "declared\_at": "2025-06-01T09:00:00Z", "cover\_url": "https://minio/.../cover.jpg", "status": "completed", "performance\_score": 91.5, "analysis\_report": { "hook": "开场3秒晒伤恐惧钩子", "shot\_count": 6, "rhythm": "快切节奏（0.5-1s/镜）", "cta": "限时优惠", "style\_tags": ["自然日系", "真实测评"] } } ], "traceId": "..." } |

## POST /api/viral-library/import-url 导入外部视频 URL

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **url** | String | 是 | 公开视频 URL，支持 YouTube / TikTok / Instagram 公开主页视频 |
| **category** | String | 否 | 人工标注品类（辅助分类），不填则由 AI 自动判断 |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 新建条目 UUID |
| **data.status** | String | analyzing（异步处理中） |
| **data.task\_id** | String | 后台拆解任务 ID |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "vlib-002", "status": "analyzing", "task\_id": "vl-task-001" }, "traceId": "..." } |

|  |
| --- |
| 异步拆解流程：① yt-dlp 获取公开元数据（标题/描述/封面图，不下载视频本体）→ ② Doubao Vision 分析封面图 → ③ Doubao 大模型生成结构化拆解报告 → ④ Doubao Embedding 向量化存入 pgvector。完成后通过 WebSocket 推送 viral\_library:analyzed 事件。URL 重复导入时返回 code: 409，data 包含已有条目信息。 |

## POST /api/viral-library/upload-analyze 上传自有视频做结构化拆解

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**请求参数（multipart/form-data）**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **video** | File | 是 | 视频文件，MP4/MOV，≤500MB |
| **category** | String | 否 | 品类标注 |
| **title** | String | 否 | 视频标题（可选，辅助拆解质量） |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 新建条目 UUID（来源标注为 local） |
| **data.status** | String | analyzing |
| **data.task\_id** | String | 后台拆解任务 ID |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "vlib-003", "status": "analyzing", "task\_id": "vl-task-002" }, "traceId": "..." } |

|  |
| --- |
| 拆解流程：① FFmpeg 切帧（每秒 1 帧抽样提取关键帧）→ ② Doubao Vision 分析关键帧 → ③ 汇总生成与 URL 导入同格式的拆解报告 → ④ Embedding 向量化存入 pgvector，支持后续语义检索。 |

## GET /api/viral-library/:id 获取视频拆解报告详情

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.id** | String | 条目 UUID |
| **data.title** | String | 视频标题 |
| **data.platform** | String | 来源平台 |
| **data.source\_url** | String | 原始 URL（local 来源为 null） |
| **data.declared\_at** | String | 来源声明时间 |
| **data.cover\_url** | String | 封面图 URL |
| **data.analysis\_report** | Object | 完整拆解报告 JSONB |
| **data.analysis\_report.hook** | String | Hook 手法详述 |
| **data.analysis\_report.selling\_points** | Array | 提炼卖点列表 |
| **data.analysis\_report.shot\_structure** | Array | 分镜结构描述列表 |
| **data.analysis\_report.visual\_style** | String | 视觉风格分析 |
| **data.analysis\_report.bgm\_style** | String | BGM 风格描述 |
| **data.analysis\_report.cta** | String | CTA 形式详述 |
| **data.analysis\_report.style\_tags** | Array | 风格标签 |
| **data.performance\_score** | Float | 性能分（若有） |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "id": "vlib-001", "title": "防晒霜测评", "platform": "tiktok", "source\_url": "https://...", "declared\_at": "2025-06-01T09:00:00Z", "cover\_url": "https://...", "analysis\_report": { "hook": "开场3秒特写皮肤晒伤后泛红，搭配文案：你知道不防晒有多可怕吗", "selling\_points": ["SPF50+防护", "轻薄不闷"], "shot\_structure": [ { "index": 0, "duration": 3, "description": "晒伤特写+恐惧Hook" }, { "index": 1, "duration": 2, "description": "产品出镜，质地展示" } ], "visual\_style": "自然日系，暖色调", "bgm\_style": "轻快流行，节奏感强", "cta": "最后1秒叠加优惠码文字", "style\_tags": ["自然日系", "真实测评", "快切"] }, "performance\_score": 91.5 }, "traceId": "..." } |

## POST /api/viral-library/:id/reference 一键借鉴（注入剧本编辑器）

|  |
| --- |
| 🔒 需要鉴权：请求头携带 Authorization: Bearer <access\_token> |

**路径参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **id** | String | 是 | 优质视频库条目 UUID |

**请求参数**

| **参数** | **类型** | **必填** | **备注** |
| --- | --- | --- | --- |
| **script\_id** | String | 是 | 目标剧本 UUID（将分镜结构注入该剧本） |

**返回参数**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **data.script\_id** | String | 目标剧本 UUID |
| **data.task\_id** | String | 后台重生成任务 ID（Director Agent 融合商品信息重生成） |
| **data.status** | String | generating（SSE 流式输出开始） |

**返回示例**

|  |
| --- |
| { "code": 200, "msg": null, "total": 0, "data": { "script\_id": "scrip-001", "task\_id": "ref-task-001", "status": "generating" }, "traceId": "..." } |

|  |
| --- |
| 借鉴操作触发 Director Agent，将该视频库条目的分镜结构作为参照，融合当前商品信息重生成完整剧本（SSE 流式输出，同 /api/scripts/generate 格式）。 |

# 附录

**A. 品类枚举值**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **fashion** | 服装配饰 |
| **beauty** | 美妆个护 |
| **home** | 家居家装 |
| **electronics** | 3C数码 |
| **food** | 食品饮料 |
| **sports** | 运动户外 |
| **mother\_baby** | 母婴用品 |
| **pet** | 宠物用品 |
| **other** | 其他 |

**B. 商品解析状态枚举**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **draft** | 草稿，商品信息未填写或未确认 |
| **confirmed** | 商品信息已确认 |
| **material\_pending** | 素材上传阶段 |
| **script\_pending** | 剧本生成阶段 |
| **in\_production** | 视频创作阶段 |
| **completed** | 视频已导出 |

**C. TTS 音色列表**

| **参数** | **类型** | **备注** |
| --- | --- | --- |
| **female\_gentle** | 女声-温柔 | 适合美妆、母婴、家居类目 |
| **female\_energetic** | 女声-活力 | 适合运动、食品、3C类目 |
| **male\_mature** | 男声-成熟 | 适合科技、汽车、金融类目 |
| **female\_professional** | 女声-专业 | 适合教育、医疗、B2B类目 |

**D. WebSocket 事件列表**

| **事件名称** | **触发时机** | **Payload 说明** |
| --- | --- | --- |
| **shot:completed** | 某分镜生成完成 | { shot\_index, preview\_url, thumbnail\_url, trace\_id } |
| **shot:failed** | 某分镜生成失败 | { shot\_index, retry\_count, error\_msg, trace\_id } |
| **shot:retrying** | 某分镜开始重试 | { shot\_index, retry\_count } |
| **video:composing** | 所有分镜完成开始合成 | { video\_id, trace\_id } |
| **video:completed** | 视频合成完成 | { video\_id, video\_url, duration, trace\_id } |
| **video:failed** | 视频合成失败 | { video\_id, error\_msg, trace\_id } |
| **diagnosis:completed** | AI 诊断完成 | { video\_id, diagnosis\_id } |
| **viral\_library:analyzed** | 视频库拆解完成 | { viral\_library\_id, status } |
| **material:parsed** | 素材 AI 解析完成 | { material\_id, tags } |

**E. 接口版本说明**

|  |
| --- |
| 当前版本 v1.0，所有接口路径以 /api 为前缀。后续版本变更将以 /api/v2 前缀区分，旧版本接口保持 6 个月兼容期。 |
