import type { RequestHandler } from 'msw';

import { dashboardHandlers } from './handlers/dashboard';
// 后续每个模块的 handlers 在这里聚合
// import { projectHandlers } from './handlers/projects';
// import { productHandlers } from './handlers/products';
// import { scriptHandlers } from './handlers/scripts';

/**
 * 所有 mock 请求处理器
 * 启用规则：只在 VITE_USE_MOCK=true 时生效（见 main.tsx 初始化）
 */
export const handlers: RequestHandler[] = [
  ...dashboardHandlers,
  // ...projectHandlers,
  // ...productHandlers,
  // ...scriptHandlers,
];
