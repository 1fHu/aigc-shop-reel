import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { ok } from '../../common/api-response';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
