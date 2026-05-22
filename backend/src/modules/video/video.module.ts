import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from '../../database/entities/video.entity';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoGateway } from './video.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Video])],
  controllers: [VideoController],
  providers: [VideoService, VideoGateway],
  exports: [VideoService],
})
export class VideoModule {}
