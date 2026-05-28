import { Injectable } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class DashboardService {
  constructor(private readonly store: MockStoreService) {}

  getOverview(userId: string) {
    const projects = this.store.listProjects(userId);
    const recentProjects = projects.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      cover_url: p.cover_url,
      video_count: p.video_count,
      status: p.status,
      views: p.views,
      render_progress: p.render_progress,
      tiktok_ready: p.tiktok_ready,
      updated_at: p.updated_at,
    }));

    const totalVideos = projects.reduce((sum, p) => sum + p.video_count, 0);
    const totalViews = projects.reduce((sum, p) => sum + p.views, 0);

    const stats = [
      {
        key: 'total_videos',
        label: '总视频创作数',
        value: totalVideos.toLocaleString(),
        trend: '+12%',
        trend_dir: 'up' as const,
        bars: [40, 55, 45, 70, 60, 85, 95],
      },
      {
        key: 'monthly_new',
        label: '本月新增创作',
        value: String(Math.min(totalVideos, 142)),
        trend: '+8.5%',
        trend_dir: 'up' as const,
        bars: [30, 50, 40, 65, 55, 70, 80],
      },
      {
        key: 'completion_rate',
        label: '平均完播率',
        value: '68.4%',
        trend: '0%',
        trend_dir: 'flat' as const,
        bars: [55, 65, 60, 70, 68, 72, 75],
      },
      {
        key: 'gmv_rate',
        label: 'GMV 转化率',
        value: '4.2%',
        trend: '-2.1%',
        trend_dir: 'down' as const,
        bars: [50, 60, 55, 45, 40, 38, 35],
      },
    ];

    const performanceTrend = Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      return {
        date: `2026-05-${String(day).padStart(2, '0')}`,
        generated: Math.round(2000 + Math.sin(day / 3) * 500 + day * 100),
        views: Math.round(5000 + Math.cos(day / 4) * 1200 + day * 300 + totalViews / 30),
      };
    });

    return {
      stats,
      recent_projects: recentProjects,
      performance_trend: performanceTrend,
      highlight: {
        best_conversion: { rate: '8.2%', date: '01月24日' },
        viral_prediction: { category: '智能家居类目', level: 'high' },
      },
    };
  }
}
