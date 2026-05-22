import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoMetric } from '../../database/entities/video-metric.entity';
import { DiagnosisReport } from '../../database/entities/diagnosis-report.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalystAgentService } from './analyst-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([VideoMetric, DiagnosisReport])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalystAgentService],
  exports: [AnalyticsService, AnalystAgentService],
})
export class AnalyticsModule {}
