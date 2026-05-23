import { Module } from '@nestjs/common';
import { VolcanoApiService } from './volcano-api.service';
import { VolcanoController } from './volcano.controller';

@Module({
  imports: [],
  controllers: [VolcanoController],
  providers: [VolcanoApiService],
  exports: [VolcanoApiService],
})
export class VolcanoModule {}
