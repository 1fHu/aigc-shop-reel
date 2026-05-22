import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViralLibrary } from '../../database/entities/viral-library.entity';
import { ViralLibraryController } from './viral-library.controller';
import { ViralLibraryService } from './viral-library.service';

@Module({
  imports: [TypeOrmModule.forFeature([ViralLibrary])],
  controllers: [ViralLibraryController],
  providers: [ViralLibraryService],
  exports: [ViralLibraryService],
})
export class ViralLibraryModule {}
