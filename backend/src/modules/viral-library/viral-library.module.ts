import { Module } from '@nestjs/common';
import { ViralLibraryController } from './viral-library.controller';
import { ViralLibraryService } from './viral-library.service';

@Module({
  imports: [],
  controllers: [ViralLibraryController],
  providers: [ViralLibraryService],
  exports: [ViralLibraryService],
})
export class ViralLibraryModule {}
