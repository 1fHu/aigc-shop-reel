import type { RequestHandler } from 'msw';

import { authHandlers } from './handlers/auth';
import { projectHandlers } from './handlers/projects';
// 后续每个模块的 handlers 在这里聚合
// import { productHandlers } from './handlers/products';
// import { materialHandlers } from './handlers/materials';
// import { scriptHandlers } from './handlers/scripts';
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
 * 与《VidCraft API 接口规范文档 v1.0》0.3 节统一格式一致
 */
export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...projectHandlers,
];
