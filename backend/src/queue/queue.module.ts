import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideoGenerationProcessor } from './video-generation.processor';
import { MaterialAnalysisProcessor } from './material-analysis.processor';
import { Material } from '../database/entities/material.entity';
import { VolcanoModule } from '../modules/volcano/volcano.module';

@Module({
  imports: [
    VolcanoModule,
    TypeOrmModule.forFeature([Material]),
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
