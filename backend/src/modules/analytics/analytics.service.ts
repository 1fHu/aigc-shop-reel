import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';
import {
  getAnalyticsOverview,
  type AnalyticsTimeRange,
} from './data/analytics-overview.data';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly store: MockStoreService) {}

  /** 聚合概览（KPI / 因子热力图 / AI 诊断 / Top videos） */
  getOverview(range: AnalyticsTimeRange = '30d') {
    return getAnalyticsOverview(range);
  }

  getMetrics(videoId: string) {
    const metrics = this.store.getMetrics(videoId);
    if (!metrics) {
      throw new NotFoundException('指标不存在');
    }
    return metrics;
  }

  diagnose(videoId: string) {
    const diagnosis = this.store.diagnoseVideo(videoId);
    if (!diagnosis) {
      throw new NotFoundException('视频不存在');
    }
    return diagnosis;
  }

  getDiagnosis(videoId: string) {
    const diagnosis = this.store.getDiagnosis(videoId);
    if (!diagnosis) {
      throw new NotFoundException('诊断报告不存在');
    }
    return diagnosis;
  }
}
