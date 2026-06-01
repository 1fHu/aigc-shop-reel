import { http, HttpResponse } from 'msw';
import type { AnalyticsOverview, DiagnosisReport } from '@/types';

/**
 * Analytics 模块 Mock
 *
 * ⚠️ TBD：`overview` 端点未在 v1.0 spec 中定义，前端先 mock 出来
 * 联调前需后端补 spec 并实现该聚合端点。
 */

const mockDiagnosis: DiagnosisReport = {
  video_id: 'video-001',
  core_issue: {
    title: 'Hook 时长过长导致前 3 秒流失',
    severity: 'high',
    description:
      'Hook 时长 4.2s，与平均水平 1.5s 相比偏长，导致前 3 秒流失率 41%（平均 22%）。建议压缩 Hook 时长，用单帧大特写定开场。',
  },
  suggestions: [
    {
      title: '缩短 Hook 至 1.5 秒以内',
      description: '用单色背景 + 产品大特写 + 重低音 sting，将开场从 4.2s 压缩至 1.5s 以内。',
    },
    {
      title: '3-5 秒处加入对比帧',
      description: '在第 3-5 秒插入「使用前 vs 使用后」对比画面，强化产品差异化认知，提升中段留存。',
    },
    {
      title: '结尾增加 GMV CTA 卡',
      description: '在最后 2-3 秒加入价格锚点 + 限时折扣信息卡，触发更明确的下单引导。',
    },
  ],
  generated_at: new Date(Date.now() - 600_000).toISOString(),
};

const mockOverview: AnalyticsOverview = {
  kpis: [
    {
      key: 'views',
      label: '观看数',
      value: '1,284,500',
      trend: '+18.5%',
      trend_dir: 'up',
      bars: [60, 70, 55, 80, 75, 90, 95],
    },
    {
      key: 'completion_rate',
      label: '完播率',
      value: '68.4%',
      trend: '+8.2%',
      trend_dir: 'up',
      bars: [50, 55, 60, 58, 65, 68, 70],
    },
    {
      key: 'engagement_rate',
      label: '互动率',
      value: '15.2%',
      trend: '+6.1%',
      trend_dir: 'up',
      bars: [40, 55, 45, 60, 52, 68, 72],
    },
    {
      key: 'conversion_rate',
      label: '转化率',
      value: '4.2%',
      trend: '-2.1%',
      trend_dir: 'down',
      bars: [60, 55, 50, 45, 42, 40, 38],
    },
    {
      key: 'gmv',
      label: 'GMV',
      value: '¥54,200',
      trend: '+24%',
      trend_dir: 'up',
      bars: [40, 50, 55, 65, 75, 85, 92],
    },
  ],
  factor_impact_matrix: [
    {
      factor: 'visual_style',
      factor_label: '视觉风格',
      values: { views: 0.82, ctr: 0.45, gmv: 0.21, shares: 0.65 },
    },
    {
      factor: 'opener',
      factor_label: '开场手法 (Hook)',
      values: { views: 0.55, ctr: 0.96, gmv: 0.38, shares: 0.88 },
    },
    {
      factor: 'narration',
      factor_label: '旁白风格',
      values: { views: 0.78, ctr: 0.30, gmv: 0.10, shares: 0.45 },
    },
    {
      factor: 'pacing',
      factor_label: '节奏密度',
      values: { views: 0.32, ctr: 0.71, gmv: 0.42, shares: 0.55 },
    },
    {
      factor: 'cta',
      factor_label: 'CTA 形式',
      values: { views: 0.41, ctr: 0.88, gmv: 0.65, shares: 0.75 },
    },
  ],
  diagnosis: mockDiagnosis,
  top_videos: [
    {
      id: 'video-001',
      name: 'Summer Skin Glow',
      cover_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120&h=120&fit=crop',
      published_at: '2026-05-21T08:00:00Z',
      views: 45200,
      completion_rate: 72.4,
      ctr: 18.5,
      gmv: 12400,
      status: 'completed',
    },
    {
      id: 'video-002',
      name: 'Tech Gear Pro',
      cover_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&h=120&fit=crop',
      published_at: '2026-05-20T08:00:00Z',
      views: 128800,
      completion_rate: 65.1,
      ctr: 12.2,
      gmv: 24500,
      status: 'completed',
    },
    {
      id: 'video-003',
      name: 'Kitchen Essentials',
      cover_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=120&h=120&fit=crop',
      published_at: '2026-05-20T10:00:00Z',
      views: 82500,
      completion_rate: 58.2,
      ctr: 14.1,
      gmv: 21800,
      status: 'completed',
    },
    {
      id: 'video-004',
      name: 'Urban Style Edit',
      cover_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop',
      published_at: '2026-05-18T12:00:00Z',
      views: 92100,
      completion_rate: 70.8,
      ctr: 11.4,
      gmv: 18300,
      status: 'completed',
    },
    {
      id: 'video-005',
      name: 'Yoga Mat Reveal',
      cover_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=120&h=120&fit=crop',
      published_at: '2026-05-17T14:00:00Z',
      views: 31400,
      completion_rate: 51.3,
      ctr: 8.7,
      gmv: 5600,
      status: 'completed',
    },
    {
      id: 'video-006',
      name: 'Pet Treats',
      cover_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=120&h=120&fit=crop',
      published_at: '2026-05-16T09:00:00Z',
      views: 28200,
      completion_rate: 62.8,
      ctr: 15.6,
      gmv: 7900,
      status: 'completed',
    },
  ],
};

export const analyticsHandlers = [
  // GET /api/analytics/overview
  http.get('/api/analytics/overview', () => {
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: mockOverview, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/analytics/:video_id
  http.get('/api/analytics/:video_id', ({ params }) => {
    const video = mockOverview.top_videos.find((v) => v.id === String(params.video_id));
    if (!video) {
      return HttpResponse.json(
        { code: 404, msg: '视频指标不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: video, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/analytics/:video_id/diagnosis
  http.get('/api/analytics/:video_id/diagnosis', ({ params }) => {
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: { ...mockDiagnosis, video_id: String(params.video_id) },
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/analytics/:video_id/diagnose
  http.post('/api/analytics/:video_id/diagnose', () => {
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: { task_id: `diag-${Date.now()}`, status: 'completed' },
      traceId: `mock-${Date.now()}`,
    });
  }),
];
