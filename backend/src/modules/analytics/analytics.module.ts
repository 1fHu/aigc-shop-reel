import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalystAgentService } from './analyst-agent.service';

@Module({
  imports: [],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalystAgentService],
  exports: [AnalyticsService, AnalystAgentService],
})
export class AnalyticsModule {}
