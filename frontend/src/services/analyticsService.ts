import api from './api';
import type {
  AnalyticsOverview,
  AnalyticsTimeRange,
  DiagnoseResult,
  DiagnosisReport,
  VideoMetric,
} from '@/types';

/**
 * 数据分析（Analytics）模块 API
 * 端点对应 backend `analytics` 模块
 *
 * ⚠️ overview 端点为前端期望，后端 spec v1.0 未明示，
 * 联调前需要后端补 `GET /api/analytics/overview`。
 */
export const analyticsService = {
  /** 获取整体概览（KPI / 热力图 / 诊断 / Top videos） */
  getOverview(range: AnalyticsTimeRange = '30d'): Promise<AnalyticsOverview> {
    return api.get('/analytics/overview', { params: { range } });
  },

  /** 获取单个视频的指标 */
  getVideoMetrics(videoId: string): Promise<VideoMetric> {
    return api.get(`/analytics/${videoId}`);
  },

  /** 获取单个视频的最新诊断报告 */
  getDiagnosis(videoId: string): Promise<DiagnosisReport> {
    return api.get(`/analytics/${videoId}/diagnosis`);
  },

  /** 触发分析师 Agent 重新诊断 */
  triggerDiagnose(videoId: string): Promise<DiagnoseResult> {
    return api.post(`/analytics/${videoId}/diagnose`);
  },
};
