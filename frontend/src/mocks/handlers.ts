import type { RequestHandler } from 'msw';

import { authHandlers } from './handlers/auth';
import { projectHandlers } from './handlers/projects';
import { dashboardHandlers } from './handlers/dashboard';
import { productHandlers } from './handlers/products';
import { scriptHandlers } from './handlers/scripts';
// 后续每个模块的 handlers 在这里聚合
// import { materialHandlers } from './handlers/materials';
// import { videoHandlers } from './handlers/videos';
// import { analyticsHandlers } from './handlers/analytics';
// import { viralHandlers } from './handlers/viral';
// import { geneHandlers } from './handlers/genes';

/**
 * 所有 mock 请求处理器
 *
 * 启用：仅在 VITE_USE_MOCK=true 时生效（见 main.tsx 初始化）
 *
 * 规范：每个 handler 返回的 JSON 必须遵循 ApiResponse 结构
 *   { code, msg, total, data, traceId }
 * 与《VidCraft API 接口规范文档 v1.0》0.3 节统一格式一致。
 *
 * ⚠️ 注意：dashboard handlers 对应的端点未在 v1.0 规范中定义，
 * 联调前需要后端补 spec。详见 mocks/handlers/dashboard.ts 顶部注释。
 */
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...projectHandlers,
  ...dashboardHandlers,
  ...productHandlers,
  ...scriptHandlers,
];
