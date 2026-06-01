/**
 * 数据分析（Analytics）相关类型
 *
 * ⚠️ TBD：
 * - `GET /api/analytics/overview` 端点未在 v1.0 spec 中明示
 * - 当前 backend 只有 per-video 端点（`/api/analytics/:video_id`、`/diagnose`）
 * - 前端 mock 出聚合 overview，等后端补 endpoint 后再校验字段
 */

import type { ProjectStatus } from './project';

/** 趋势方向 */
export type TrendDirection = 'up' | 'down' | 'flat';

/** 5 个 KPI 卡片的 key */
export type AnalyticsKpiKey = 'views' | 'completion_rate' | 'engagement_rate' | 'conversion_rate' | 'gmv';

/** 单张 KPI 卡（复用 StatCard 渲染） */
export interface AnalyticsKpi {
  key: AnalyticsKpiKey;
  label: string;
  value: string;           // 已格式化：'1,284,500' / '68.4%' / '¥54,200'
  trend: string;           // '+18.5%'
  trend_dir: TrendDirection;
  bars: number[];          // 7 个值（迷你条形图）
}

/** 因子维度（与 ScriptStudio 的 FactorKey 对齐） */
export type AnalyticsFactor = 'visual_style' | 'opener' | 'narration' | 'pacing' | 'cta';

/** 指标维度（热力图列） */
export type AnalyticsMetric = 'views' | 'ctr' | 'gmv' | 'shares';

/** 因子 → 各指标的相关性强度（0-1） */
export interface FactorImpactRow {
  factor: AnalyticsFactor;
  factor_label: string;        // 中文展示名 "视觉风格"
  values: Record<AnalyticsMetric, number>;  // 0-1 关联度
}

/** AI 诊断报告（GET /api/analytics/:video_id/diagnosis） */
export interface DiagnosisReport {
  video_id: string;
  core_issue: {
    title: string;             // 简短标题 "Hook 时长过长"
    severity: 'high' | 'medium' | 'low';
    description: string;       // 详细描述
  };
  suggestions: Array<{
    title: string;             // 优化建议标题
    description: string;       // 详细做法
  }>;
  generated_at: string;
}

/** 单条视频效果指标 */
export interface VideoMetric {
  id: string;
  name: string;
  cover_url: string;
  published_at: string;
  views: number;
  completion_rate: number;     // 0-100
  ctr: number;                 // 0-100
  gmv: number;                 // 元
  status?: ProjectStatus;
}

/** 整体 Analytics 概览（GET /api/analytics/overview） */
export interface AnalyticsOverview {
  kpis: AnalyticsKpi[];
  factor_impact_matrix: FactorImpactRow[];
  diagnosis: DiagnosisReport;
  top_videos: VideoMetric[];
}

/** 时间范围 */
export type AnalyticsTimeRange = '7d' | '30d' | '90d' | 'all';

/** 触发诊断响应 */
export interface DiagnoseResult {
  task_id: string;
  status: 'queued' | 'analyzing' | 'completed';
}
