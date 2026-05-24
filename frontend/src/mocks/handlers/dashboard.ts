import { http, HttpResponse } from 'msw';

/**
 * Dashboard 模块的 mock handlers
 *
 * 约定：返回结构 { code: 0, data: ..., message: 'ok' }
 * 与 services/api.ts 中的响应拦截器解包逻辑对齐
 */
export const dashboardHandlers = [
  http.get('/api/dashboard/stats', () => {
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        totalVideos: 1284,
        monthlyNew: 142,
        avgCompletionRate: 0.684,
        gmvConversionRate: 0.042,
        trend: {
          videos: '+12%',
          monthly: '+8.5%',
          completion: '0%',
          gmv: '-2.1%',
        },
        miniChart: {
          videos: [12, 18, 15, 22, 19, 28, 32],
          monthly: [8, 11, 9, 14, 12, 16, 20],
          completion: [60, 65, 62, 68, 66, 70, 68],
          gmv: [5.2, 4.8, 4.5, 4.3, 4.1, 4.0, 4.2],
        },
      },
    });
  }),

  http.get('/api/dashboard/recent-projects', () => {
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: [
        {
          id: 'p1',
          name: 'Summer Skin Glow',
          status: 'completed',
          views: 4200,
          updatedAt: '2026-05-25T10:00:00Z',
          cover: 'https://picsum.photos/seed/skin/600/360',
          tag: 'TIKTOK READY',
        },
        {
          id: 'p2',
          name: 'Tech Gear Pro',
          status: 'generating',
          progress: 85,
          updatedAt: '2026-05-25T11:45:00Z',
          cover: 'https://picsum.photos/seed/tech/600/360',
        },
        {
          id: 'p3',
          name: 'Kitchen Essentials',
          status: 'completed',
          views: 12800,
          updatedAt: '2026-05-24T09:00:00Z',
          cover: 'https://picsum.photos/seed/kitchen/600/360',
        },
        {
          id: 'p4',
          name: 'Urban Style Edit',
          status: 'completed',
          views: 8500,
          updatedAt: '2026-05-23T16:00:00Z',
          cover: 'https://picsum.photos/seed/urban/600/360',
        },
      ],
    });
  }),

  http.get('/api/dashboard/performance-trend', () => {
    // 30 天生成数 / 观看量趋势
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    return HttpResponse.json({
      code: 0,
      message: 'ok',
      data: {
        days,
        generated: days.map((d) => Math.round(2000 + Math.sin(d / 3) * 500 + d * 100)),
        views: days.map((d) => Math.round(5000 + Math.cos(d / 4) * 1200 + d * 300)),
      },
    });
  }),
];
