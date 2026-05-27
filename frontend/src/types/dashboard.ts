/**
 * Dashboard 相关类型
 *
 * ⚠️ TBD（待后端确认）：
 * 当前《VidCraft API 接口规范文档 v1.0》没有 dashboard 聚合端点。
 * 前端按 prototype 设计稿先定义本类型 + mock 数据。
 * 后端补 spec 时如有字段调整，需同步更新此文件。
 */

import type { ProjectListItem } from './project';

export type StatTrendDirection = 'up' | 'down' | 'flat';

export interface StatCardData {
  key: 'total_videos' | 'monthly_new' | 'completion_rate' | 'gmv_rate';
  label: string;
  value: string;          // 已格式化的展示值（"1,284" / "68.4%"）
  trend: string;          // "+12%" / "0%" / "-2.1%"
  trend_dir: StatTrendDirection;
  bars: number[];         // 0-100 的迷你条形图数据
}

export interface PerformanceTrendPoint {
  date: string;           // ISO date 字符串
  generated: number;
  views: number;
}

export interface DashboardHighlight {
  best_conversion: {
    rate: string;         // "8.2%"
    date: string;         // "01月24日"
  };
  viral_prediction: {
    category: string;     // "智能家居类目"
    level: 'low' | 'medium' | 'high';
  };
}

/**
 * GET /api/dashboard/overview 返回的整体结构
 */
export interface DashboardOverview {
  stats: StatCardData[];
  recent_projects: ProjectListItem[];
  performance_trend: PerformanceTrendPoint[];
  highlight: DashboardHighlight;
}
