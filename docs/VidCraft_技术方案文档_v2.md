**VidCraft**

AIGC 带货视频生成系统

技 术 方 案 文 档

  **赛题**           AI全栈挑战赛 · 电商场景AIGC带货视频生成系统

  **文档版本**       v2.0

  **技术栈**         React / Node.js / TypeScript / 火山引擎 OpenAPI

  **状态**           正式版（修订版，解决 v1.0 评审意见）

一、系统总体架构

1.1 架构概述

VidCraft 采用前后端分离架构，以「素材---剧本---创作」三大模块为核心领域模型，后端以 Node.js（NestJS）为主服务，Python（FastAPI）为视频处理专属补充服务（仅负责 FFmpeg 合成，不承载 AI 调用逻辑），通过 Redis BullMQ 队列解耦异步任务。

**关于双后端架构的职责划分（v1.0 问题4修订）：**

v1.0 将 Embedding 向量化归入 FastAPI、而剧本生成归入 NestJS，导致两个服务都在独立调用火山引擎 API，出现重复维护 API Client 的问题。v2.0 明确如下职责边界：

- NestJS（API 服务）：承载所有火山引擎 OpenAPI 调用（Doubao 大模型、TTS、Embedding），是唯一的 AI 调用出口；同时承载 BullMQ 任务调度与 Seedance 任务管理。

- Python FastAPI（视频合成工作器）：仅负责 FFmpeg 视频合成（拼接、字幕、BGM、转场），不直接调用 AI API。将 Python 独立为服务的理由是：FFmpeg Python 绑定（ffmpeg-python）远比 Node.js 侧以子进程调用 FFmpeg 更便于复杂滤镜链编排、错误处理与单元测试；且 Python 生态对音视频处理库的支持更成熟（moviepy、pydub 等）。

- 火山引擎 API Client 在 NestJS 侧统一封装为 VolcanoApiService，所有模块通过此 Service 调用，避免重复维护。

1.2 架构分层说明

  **层级**         **组件**                       **职责**

  前端层           React 18 + TypeScript + Vite   分镜编辑器、进度面板、预览播放器、数据看板、因子替换面板；WebSocket 实时通信

  API 网关层       Nginx + JWT 中间件             反向代理、限流、SSL 终止、统一鉴权

  业务服务层       NestJS 微服务模块              商品解析、剧本生成、素材管理、用户认证、Agent 编排、所有火山引擎 API 调用（统一出口）

  任务队列层       BullMQ + Redis                 视频生成异步任务、优先级调度、失败重试、进度事件；链路 Trace ID 随队列消息传播

  视频合成层       FastAPI（Python）              仅负责 FFmpeg 视频合成（拼接/字幕/BGM/转场），不调用 AI API

  数据层           PostgreSQL + Redis + MinIO     业务数据持久化、缓存、素材/视频文件存储

  外部依赖         火山引擎 OpenAPI               Doubao 大模型（脚本/诊断）、Seedance（视频生成）、TTS（配音）、Embedding（向量化）

1.3 核心数据流

| **用户输入商品信息**                                                                                               |
| ↓                                                                                                                  |
| NestJS ProductService [商品解析] ─── VolcanoApiService → Doubao API（Function Calling 提取卖点/人群/场景）       |
| ↓                                                                                                                  |
| NestJS ScriptService + Agent编排 [剧本生成] ─── VolcanoApiService → Doubao API（结合爆款基因库，生成分镜剧本）   |
| ↓                                                                                                                  |
| NestJS VideoService → BullMQ 队列 [任务入队] ─── 并发提交各分镜生成任务（携带 traceId）                          |
| ↓                                                                                                                  |
| VolcanoApiService → Seedance API [AI生成] ─── 文生视频/图生视频（回调模式+HMAC签名验证）                         |
| ↓                                                                                                                  |
| Python FastAPI Worker [视频合成] ─── FFmpeg（拼接 + 字幕 + BGM + 转场 + 分辨率适配），TTS 配音由 NestJS 预先生成 |
| ↓                                                                                                                  |
| MinIO / 火山引擎 TOS [存储导出] ─── 视频文件存储 → 生成下载链接 → WebSocket 推送前端                             |

二、技术选型

2.1 完整技术栈

  **层级**      **技术**                                **版本**    **选型理由**

  前端框架      React 18 + TypeScript                   Latest      组件化、类型安全，赛题要求

  前端构建      Vite 5                                  5.x         极速 HMR，开发体验优秀

  UI 组件库     Ant Design 5                            Latest      企业级组件，表单/表格/上传开箱即用

  状态管理      Zustand                                 4.x         轻量，适合中型应用

  拖拽交互      \@dnd-kit/core                          Latest      分镜拖拽排序，无障碍支持好

  实时通信      Socket.io-client                        4.x         视频生成进度实时推送

  视频播放      Video.js                                8.x         支持自定义进度标注（分镜时间轴）

  图表可视化    Recharts                                Latest      数据看板完播率曲线、转化漏斗

  Node 后端     NestJS                                  10.x        模块化、装饰器风格、TypeScript 原生

  Python 后端   FastAPI                                 0.115+      仅用于 FFmpeg 合成工作器；异步高性能

  任务队列      BullMQ + Redis                          Redis 7.x   异步任务、优先级、进度追踪、失败重试

  关系数据库    PostgreSQL 16                           16.x        JSONB 支持灵活存分镜数据；pgvector 向量插件

  对象存储      MinIO（开发）/ TOS（生产）              ---         视频/素材文件存储；本地开发免云费用

  视频合成      FFmpeg                                  6.x         业界标准，配音/字幕/BGM/转场一体合成

  容器化        Docker + Docker Compose                 ---         统一开发/生产环境，一键启动全栈

  代码规范      ESLint + Prettier + Husky + StyleLint   ---         赛题要求；提交前自动 lint 校验

  链路追踪      OpenTelemetry SDK（轻量接入）           Latest      跨服务 Trace ID 传播，覆盖 NestJS→BullMQ→FastAPI→Seedance 回调全链路

2.2 AI 能力对接

  **能力**        **模型/服务**                **调用方式**                 **用途**

  文本大模型      Doubao-Seed-2.0-pro          统一经 VolcanoApiService     商品解析、剧本生成、AI诊断、剧本干预

  视频生成        Doubao-Seedance-1.5-pro      回调模式+HMAC签名（见2.3）   文生视频、图生视频，分镜级生成

  语音合成        火山引擎 TTS                 统一经 VolcanoApiService     多语种配音，覆盖中/英/日/韩

  向量化          Doubao-Embedding（1024维）   统一经 VolcanoApiService     素材/剧本向量化，存入 pgvector

注：Doubao Embedding 模型实际输出维度为 1024 维（v1.0 错误标注为 1536 维，已修正）。数据库 schema 中 embedding 字段类型已同步修正为 vector(1024)，HNSW 索引相应调整。pgvector HNSW 索引一旦建立维度不可修改，此修正在 DB 初始化脚本阶段完成，升级时需 DROP INDEX 重建。

2.3 Seedance 回调安全机制（v1.0 问题5修订）

v1.0 中 POST /api/volcano/seedance-callback 为公开端点，缺乏身份验证，存在伪造回调篡改任务状态的安全风险。v2.0 采用 HMAC-SHA256 签名验证方案：

- 创建 Seedance 任务时，在回调 URL 的 query 参数中携带 token（通过环境变量配置的密钥对 task_id 做 HMAC-SHA256 签名）。

- 回调接收端点收到请求后，从 query 取出 token，用相同密钥对 task_id 重新计算签名，与 token 做常量时间比较（crypto.timingSafeEqual），不匹配则返回 403 拒绝处理。

- 备选方案：如火山引擎提供固定出口 IP 段，可额外配置 Nginx IP 白名单作为第二道防线。

- 内部端点通过 Nginx location 配置，对外不暴露于公共域名路径前缀之外。

三、核心模块详细设计

3.1 优质视频库（v1.0 问题1修订）

v1.0 将「优质视频库」简化为预置30条爆款基因的静态数据库，未实现赛题要求的「按类目/关键词检索站外爆款视频 + 结构化拆解报告 + 自有视频上传拆解」功能，且文档未做说明。v2.0 完整补充如下设计：

3.1.1 外部视频检索与拆解链路

由于直接爬取 Facebook/Instagram 视频存在法律与技术壁垒，v2.0 采用以下可落地方案：

- URL 导入模式：商家粘贴公开视频 URL（支持 YouTube、TikTok、Instagram 公开主页视频），后端调用 yt-dlp（开源工具，合规使用公开内容）下载视频元数据与封面图，不下载视频本体（仅保存结构化分析结果，不复刻、不存储原始视频，符合赛题合规要求）。

- AI 拆解：将视频封面图 + 标题/描述文本传入 Doubao Vision + Doubao 大模型，提取结构化拆解报告（Hook 手法、卖点、分镜节奏、风格标签、CTA 位置）。

- 自有视频上传拆解：商家上传本地视频，系统按场景切帧（每秒1帧抽样），调用 Doubao Vision 对关键帧做多模态理解，生成同等格式的拆解报告。

- 声明来源：每条视频库条目记录 source_url、platform、declared_at 字段，前端展示时标注「来源：[平台] [URL]」。

前端交互：

- 「优质视频库」独立页面，提供搜索框（类目 + 关键词）+ URL 导入入口 + 本地视频上传入口。

- 每条条目展示：封面图、标题、平台标签、拆解报告摘要（Hook手法/分镜数/节奏特征）、性能评分（若有数据则展示，否则显示「待评分」）。

- 「一键借鉴」：将该条目的分镜结构导入当前剧本，触发 AI 融合商品信息重生成。

3.1.2 爆款基因库（沉淀层）

优质视频库拆解结果经聚类后沉淀为爆款基因（viral_genes），供导演 Agent 检索参考。预置30条各品类示例基因保证冷启动可演示。两者关系：优质视频库（1:1 拆解）→ 基因库（n:1 聚类提炼）。

3.2 剧本干预：因子局部替换（v1.0 问题2修订）

v1.0 的 SCRP-007 仅覆盖 Prompt 编辑和文案改写，未设计「因子局部替换」的用户操作界面与后端逻辑。v2.0 补充完整设计：

3.2.1 因子库数据结构

  **因子维度**    **示例因子值**                                                **说明**

  视觉风格        黑风极简 / 夏日度假风 / 赛博科技风 / 轻奢质感风               控制画面整体色调、构图偏好

  开场手法        问题式Hook / 价格锚点Hook / 悬念式Hook / 数据震撼Hook         控制前3秒吸引力方式

  旁白风格        优雅知性 / 活泼种草 / 专业测评 / 亲切日常                     控制配音文案的语气与措辞

  节奏密度        快切节奏（0.5-1s/镜）/ 中速（1-2s/镜）/ 慢镜强调（2-3s/镜）   控制分镜时长分配策略

  CTA 形式        立即下单 / 点击购物车 / 限时优惠 / 品牌心智                   控制结尾行动号召方式

3.2.2 前端因子替换面板

- 剧本页右侧侧边栏新增「创作因子」面板，展示当前剧本使用的所有因子（每个维度一个标签 + 当前值）。

- 点击任意因子标签，弹出该维度的可选值列表（来自因子库），用户选择后点击「替换并重生成」。

- 替换触发：前端将新因子值发送至 POST /api/scripts/:id/replace-factor，后端更新 scripts.storyboard 中的因子字段，重新调用 Director Agent 基于新因子生成对应分镜（支持全局重生成或仅影响相关分镜）。

- 替换历史：因子替换操作记录在 scripts.factor_history（JSONB 数组），支持撤销/重做。

3.2.3 新增 API 接口

  **方法**   **路径**                            **功能说明**

  POST       /api/scripts/:id/replace-factor     替换剧本中指定因子维度的值，触发局部/全局重生成

  GET        /api/factors                        获取因子库全量数据（维度 + 可选值列表）

  GET        /api/viral-library/search           检索优质视频库（类目 + 关键词）

  POST       /api/viral-library/import-url       导入外部视频 URL，触发异步拆解

  POST       /api/viral-library/upload-analyze   上传自有视频，触发结构化拆解分析

3.3 生成过程链路追踪（v1.0 问题3修订）

v1.0 的可观测性设计仅停留在「NestJS Logger + BullMQ Dashboard」，没有跨服务 Trace ID 传播机制，无法真正实现 P1 要求的「生成过程 trace」。v2.0 补充完整的链路追踪设计：

3.3.1 Trace ID 传播链路

- 生成：视频生成任务创建时，NestJS 生成全局唯一 traceId（UUID v4），写入 videos 表和 BullMQ 任务元数据。

- NestJS → BullMQ：traceId 随队列消息 data 字段传递。

- BullMQ → FastAPI Worker：Worker 收到任务后，将 traceId 通过 HTTP Header（X-Trace-Id）传入 FastAPI 合成服务。

- Seedance 回调：创建 Seedance 任务时在 callback_url query 参数中携带 traceId，回调时原路返回，NestJS 回调处理器从 query 读取并写入日志。

- 日志关联：所有层级日志均包含 traceId 字段，NestJS 使用 AsyncLocalStorage 在请求生命周期内自动注入，无需手动传参。

3.3.2 轻量 OpenTelemetry 接入

- 引入 \@opentelemetry/sdk-node 和 \@opentelemetry/auto-instrumentations-node，对 NestJS HTTP 请求、BullMQ 任务、PostgreSQL 查询自动生成 Span。

- FastAPI 侧接入 opentelemetry-sdk-python，对 FFmpeg 合成过程关键步骤手动创建 Span（拼接/字幕/BGM/上传）。

- Trace 数据导出到本地 Jaeger（Docker Compose 集成），演示环境可通过 http://localhost:16686 查看完整链路瀑布图。

- 生产环境可替换为火山引擎 APM 或其他兼容 OTLP 协议的后端，无需修改业务代码。

3.4 Agent 编排层

3.4.1 导演 Agent（Director Agent）

职责：商品解析 → 优质视频库检索 → 爆款基因检索 → 因子组合 → 多版本剧本生成 → 分镜规划

3.4.2 分析师 Agent（Analyst Agent）

职责：读取视频指标 → 场景级流失归因 → 生成优化 Prompt 报告

- 当完播率 < 30% 或转化率 < 0.1% 时自动触发。

- 通过时间轴切割识别每个分镜对应的观众流失节点（精确到秒）。

- 输出结构化诊断报告：{ scene_index, issue_type, severity, optimized_prompt }

3.5 素材模块

3.5.1 素材入库与结构化

素材上传后，NestJS VolcanoApiService 负责调用 Doubao Vision 进行多模态理解和 Doubao Embedding 进行向量化（不再由 Python Worker 调用），Python FastAPI 仅负责 FFmpeg 场景检测切片。这解决了 v1.0 的双后端 AI 调用混乱问题。

3.6 视频生成流程

| **POST /api/videos/generate → VideoService.submitGeneration()**                        |
| ├── 1. 生成全局 traceId，写入 videos 表                                                |
| ├── 2. 将所有分镜任务并发推入 BullMQ 队列（携带 traceId）                              |
| ├── 3. VolcanoApiService 调用 Seedance API（携带 callback_url + HMAC token + traceId） |
| ├── 4. 回调接收：HMAC 验证 → 解析状态 → WebSocket 推送 shot:completed                  |
| ├── 5. NestJS 预先调用 TTS 生成各分镜配音文件                                          |
| ├── 6. 所有分镜完成后，NestJS 向 FastAPI 发起 FFmpeg 合成请求（携带 X-Trace-Id）       |
| │ ├── FastAPI：视频拼接 + 字幕 + BGM + 转场 + 分辨率统一                               |
| │ └── 上传成品至 MinIO，返回 video_url                                                 |
| └── 7. NestJS 推送 WebSocket video:completed 事件，更新 videos.status = \'completed\'  |

四、数据库设计

4.1 核心数据表

  **表名**             **主键类型**   **核心字段说明**

  users                UUID           email, password_hash, plan_type, video_quota

  projects             UUID           user_id, name, product_url, product_info（JSONB）, status

  materials            UUID           project_id, file_url, file_type, analysis（JSONB）, embedding（vector(1024)）

  material_slices      UUID           material_id, start_sec, end_sec, tags（JSONB）, embedding（vector(1024)）

  scripts              UUID           project_id, strategy_type, content, storyboard（JSONB分镜+因子快照）, factor_history（JSONB）, status

  videos               UUID           project_id, script_id, video_url, duration, resolution, status, trace_id, generation_cost

  video_tasks          UUID           video_id, shot_index, seedance_task_id, status, retry_count, error_msg, trace_id

  video_metrics        UUID           video_id, views, completion_rate, click_rate, conversion_rate, gmv, watch_time_distribution（JSONB）

  viral_genes          UUID           category, storyboard_structure（JSONB）, performance_score, embedding（vector(1024)）

  viral_library        UUID           source_url, platform, declared_at, analysis_report（JSONB拆解报告）, embedding（vector(1024)）, status

  factor_definitions   UUID           dimension（维度名）, values（JSONB可选值列表）, description

  diagnosis_reports    UUID           video_id, issues（JSONB分镜问题列表）, suggestions（JSONB优化Prompt建议）

注：所有含 embedding 字段的表，向量维度统一为 vector(1024)（匹配 Doubao Embedding 模型实际输出），HNSW 索引在数据库初始化脚本中创建，不可事后修改维度。

五、API 接口设计

5.1 核心接口清单

  **方法**           **路径**                            **功能说明**

  ── 商品与素材 ──

  POST               /api/products/analyze               输入商品链接或图片，AI 解析商品结构化信息

  POST               /api/materials/upload               上传素材文件，触发异步入库与向量化（NestJS 统一调用 AI）

  GET                /api/materials/search               多颗粒度素材检索（query/tags/embedding）

  ── 优质视频库 ──

  GET                /api/viral-library/search           按类目/关键词检索优质视频库

  POST               /api/viral-library/import-url       导入外部视频 URL，触发异步拆解分析

  POST               /api/viral-library/upload-analyze   上传自有视频做结构化拆解

  ── 剧本生成 ──

  POST               /api/scripts/generate               生成剧本（传入 product_id、strategy_type）

  PUT                /api/scripts/:id/storyboard         保存分镜编辑（用户干预后更新）

  POST               /api/scripts/:id/regenerate-shot    单分镜重新生成（传入 shot_index + new_prompt）

  POST               /api/scripts/:id/replace-factor     替换因子维度值，触发局部/全局重生成

  GET                /api/factors                        获取因子库（维度 + 可选值）

  ── 视频创作 ──

  POST               /api/videos/generate                提交一键成片任务，返回 task_id + traceId

  GET                /api/videos/:id/status              轮询任务状态（WebSocket 兜底）

  POST               /api/volcano/seedance-callback      Seedance 回调接收（HMAC 验证，内部端点）

  GET                /api/videos/:id/download            获取视频临时下载链接

  ── 数据分析 ──

  GET                /api/analytics/:video_id            获取视频指标（Mock 数据）+ 分镜流失分布

  POST               /api/analytics/:video_id/diagnose   手动触发分析师 Agent，返回诊断报告

  GET                /api/genes/search                   检索爆款基因库（category, limit）

六、工程规范与可观测性

6.1 代码规范

- ESLint + Prettier：统一代码风格，Husky pre-commit 自动格式化。

- StyleLint：CSS/Tailwind 样式规范检查。

- TypeScript 严格模式（strict: true），禁止 any 类型滥用。

- Git 分支策略：main（生产）/ develop（集成）/ feature/\* / fix/\*。

- Commit 规范：Conventional Commits（feat/fix/refactor/docs/chore）。

6.2 可观测性（v1.0 问题3完整修订）

  **维度**           **实现方案**

  结构化日志         NestJS Logger 输出 JSON 格式，每条日志携带 traceId / videoId / taskId；AsyncLocalStorage 自动注入 traceId

  跨服务链路追踪     OpenTelemetry SDK 自动埋点（NestJS + FastAPI），Trace 数据写入 Jaeger；覆盖 NestJS→BullMQ→FastAPI→Seedance回调 完整链路

  任务队列可视化     bull-board 可视化 BullMQ 队列状态（排队/处理中/完成/失败/重试）

  错误监控           ExceptionFilter 统一捕获，记录错误类型 + traceId + 上下文

  API 性能           请求拦截器记录响应时间，>5s 打印告警日志（含 traceId）

6.3 CI/CD 方案

- GitHub Actions：push/PR 触发自动 lint + type-check + build。

- Docker 镜像构建：前端 Nginx 镜像 + NestJS API 镜像 + FastAPI Worker 镜像 + Jaeger 镜像。

- 环境变量通过 GitHub Secrets 注入，不在代码库中存储。火山引擎 API Key 严禁提交 Git。

- 部署目标：Docker Compose（演示环境）/ 火山引擎云服务器（生产）。

七、MVP 开发路线图（4 周）

本路线图基于 2-3 人团队制定，明确标注「真实实现」与「Mock 演示」边界，确保承诺可信度（v1.0 问题8修订）：

  **周次**   **目标**                 **关键任务（真实实现）**                                                                                                                                                                                                   **Mock/简化说明**

  Week 1     跑通核心生成闭环         ① 项目脚手架（React+NestJS+FastAPI+Docker Compose）② VolcanoApiService 统一封装（商品解析+剧本生成+Embedding）③ Seedance 接入（HMAC回调验证）④ FFmpeg 基础合成（视频+配音）⑤ Socket.io 进度推送 ⑥ OpenTelemetry 基础接入   Jaeger 暂用 All-in-One 镜像；数据库初始化脚本含 vector(1024) 索引

  Week 2     分镜干预+素材+因子替换   ① 可视化分镜编辑面板（拖拽+Prompt编辑+参考图）② 因子替换面板（UI+API）③ 素材上传与切片入库（FFmpeg场景检测）④ 素材向量检索 ⑤ 优质视频库页面（URL导入+自有视频上传+AI拆解）                                                 优质视频库初期仅支持文本描述导入，URL 自动下载 Week 3 补充

  Week 3     数据飞轮+游客模式        ① 数据看板界面 ② 分析师Agent（诊断+优化建议）③ 场景级流失归因 ④ 爆款基因库（pgvector检索）⑤ 游客演示模式（预置账号自动登录或 token）                                                                                       数据看板全程 Mock 数据（3-5组典型场景）；游客模式无需注册

  Week 4     打磨与演示准备           ① UI/UX全面优化 ② 多平台导出（9:16/1:1/16:9）③ 多语言TTS ④ CI/CD完整流水线 ⑤ Demo视频录制+架构文档                                                                                                                         性能指标在 Week 4 压测验证后写入文档（不预设不可信数字）

八、关键实施注意事项

- Seedance 必须走回调模式：创建任务时配置 callback_url（含 HMAC token + traceId），避免轮询消耗 API 额度。

- 单镜预览走低清模式：Prompt 末尾追加低分辨率参数，成本降低约 60%。

- Embedding 维度确认：Doubao Embedding 输出 1024 维，数据库 schema 使用 vector(1024)，HNSW 索引在初始化脚本中创建，禁止事后修改维度。

- 优质视频库合规：yt-dlp 仅下载公开视频元数据与封面图，不存储视频本体；每条条目声明来源 URL 与平台。

- 火山引擎 API Key 严禁提交到 Git，仅通过环境变量注入，统一经 VolcanoApiService 调用。

- 游客/预置账号：演示环境提供预置 demo 账号（或 URL 携带 token 自动登录），确保评委无需注册即可体验核心功能。

- 性能指标（FFmpeg 合成 ≤60s 等）在 Week 4 压测后以实测数据更新文档，不在设计阶段预设不可验证数字。
