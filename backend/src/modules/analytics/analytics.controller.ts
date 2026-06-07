import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { ok } from '../../common/api-response';
import type { AnalyticsTimeRange } from './data/analytics-overview.data';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ⚠️ 静态路由 'overview' 必须声明在 ':video_id' 之前，否则会被参数路由吞掉
  @UseGuards(AuthGuard('jwt'))
  @Get('overview')
  getOverview(@Query('range') range?: AnalyticsTimeRange) {
    return ok(this.analyticsService.getOverview(range ?? '30d'));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':video_id')
  getMetrics(@Param('video_id') videoId: string) {
    return ok(this.analyticsService.getMetrics(videoId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':video_id/diagnose')
  diagnose(@Param('video_id') videoId: string) {
    return ok(this.analyticsService.diagnose(videoId));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':video_id/diagnosis')
  getDiagnosis(@Param('video_id') videoId: string) {
    return ok(this.analyticsService.getDiagnosis(videoId));
  }
}
