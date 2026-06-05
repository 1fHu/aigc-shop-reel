import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneBankController } from './gene-bank.controller';
import { GeneBankService } from './gene-bank.service';
import { ViralLibrary } from '../../database/entities/viral-library.entity';
import { AnalyzedVideo } from '../../database/entities/analyzed-video.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ViralLibrary, AnalyzedVideo])],
  controllers: [GeneBankController],
  providers: [GeneBankService],
  exports: [GeneBankService],
})
export class GeneBankModule {}
