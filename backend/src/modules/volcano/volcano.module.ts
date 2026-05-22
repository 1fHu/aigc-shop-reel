import { Module } from '@nestjs/common';
import { VolcanoApiService } from './volcano-api.service';

@Module({
  imports: [],
  providers: [VolcanoApiService],
  exports: [VolcanoApiService],
})
export class VolcanoModule {}
