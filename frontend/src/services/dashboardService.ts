import api from './api';
import type { DashboardOverview } from '@/types';

/**
 * Dashboard 模块 API
 *
 * ⚠️ TBD：当前《API 规范 v1.0》没有此端点。
 * 联调前需要后端确认：
 *   1) 是否提供单端点 GET /api/dashboard/overview 直接返回聚合数据
 *   2) 还是前端从 /api/projects + /api/analytics/* 拼装
 *
 * Mock 阶段我们假定方案 1（更高效）。
 */
export const dashboardService = {
  /** 获取首页聚合数据 */
  getOverview(): Promise<DashboardOverview> {
    return api.get('/dashboard/overview');
  },
};
