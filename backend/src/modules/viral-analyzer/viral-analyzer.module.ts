import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViralAnalyzerService } from './viral-analyzer.service';
import { ViralAnalyzerController } from './viral-analyzer.controller';
import { AnalyzedVideo } from '../../database/entities/analyzed-video.entity';
import { ViralLibrary } from '../../database/entities/viral-library.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyzedVideo, ViralLibrary])],
  providers: [ViralAnalyzerService],
  controllers: [ViralAnalyzerController],
  exports: [ViralAnalyzerService],
})
export class ViralAnalyzerModule {}
