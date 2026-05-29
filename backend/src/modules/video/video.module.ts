import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VolcanoModule } from '../volcano/volcano.module';

@Module({
  imports: [VolcanoModule],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
