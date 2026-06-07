import { http, HttpResponse } from 'msw';
import type { DashboardOverview } from '@/types';

/**
 * Dashboard 模块 Mock
 *
 * ⚠️ TBD：此端点未在《API 规范 v1.0》中定义，前端先 mock 出来供页面联调。
 * 等后端确认 spec 后再校验字段名 / 结构是否需要调整。
 */

const mockOverview: DashboardOverview = {
  stats: [
    {
      key: 'total_videos',
      label: '总视频创作数',
      value: '1,284',
      trend: '+12%',
      trend_dir: 'up',
      bars: [40, 55, 45, 70, 60, 85, 95],
    },
    {
      key: 'monthly_new',
      label: '本月新增创作',
      value: '142',
      trend: '+8.5%',
      trend_dir: 'up',
      bars: [30, 50, 40, 65, 55, 70, 80],
    },
    {
      key: 'completion_rate',
      label: '平均完播率',
      value: '68.4%',
      trend: '0%',
      trend_dir: 'flat',
      bars: [55, 65, 60, 70, 68, 72, 75],
    },
    {
      key: 'gmv_rate',
      label: 'GMV 转化率',
      value: '4.2%',
      trend: '-2.1%',
      trend_dir: 'down',
      bars: [50, 60, 55, 45, 40, 38, 35],
    },
  ],
  recent_projects: [
    {
      id: 'proj-001',
      name: 'Summer Skin Glow',
      cover_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=375&fit=crop',
      video_count: 1,
      status: 'finished',
      updated_at: '2026-05-25T10:00:00Z',
    },
    {
      id: 'proj-002',
      name: 'Tech Gear Pro',
      cover_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=375&fit=crop',
      video_count: 0,
      status: 'video_pending',
      updated_at: '2026-05-25T11:45:00Z',
    },
    {
      id: 'proj-003',
      name: 'Kitchen Essentials',
      cover_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=375&fit=crop',
      video_count: 2,
      status: 'finished',
      updated_at: '2026-05-24T09:00:00Z',
    },
    {
      id: 'proj-004',
      name: 'Urban Style Edit',
      cover_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=375&fit=crop',
      video_count: 1,
      status: 'finished',
      updated_at: '2026-05-23T16:00:00Z',
    },
  ],
  performance_trend: Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    return {
      date: `2026-05-${String(day).padStart(2, '0')}`,
      generated: Math.round(2000 + Math.sin(day / 3) * 500 + day * 100),
      views: Math.round(5000 + Math.cos(day / 4) * 1200 + day * 300),
    };
  }),
  highlight: {
    best_conversion: { rate: '8.2%', date: '01月24日' },
    viral_prediction: { category: '智能家居类目', level: 'high' },
  },
};

export const dashboardHandlers = [
  http.get('/api/dashboard/overview', () => {
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: mockOverview,
      traceId: `mock-${Date.now()}`,
    });
  }),
];
