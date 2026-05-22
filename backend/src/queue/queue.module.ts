import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideoGenerationProcessor } from './video-generation.processor';
import { MaterialAnalysisProcessor } from './material-analysis.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('redis.url'),
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 30000 } },
      }),
    }),
    BullModule.registerQueue({ name: 'video-generation' }, { name: 'material-analysis' }),
  ],
  providers: [VideoGenerationProcessor, MaterialAnalysisProcessor],
  exports: [BullModule],
})
export class QueueModule {}
