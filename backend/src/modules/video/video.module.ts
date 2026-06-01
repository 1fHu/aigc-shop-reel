import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VolcanoModule } from '../volcano/volcano.module';
import { Video } from '../../database/entities/video.entity';
import { VideoTask } from '../../database/entities/video-task.entity';
import { Project } from '../../database/entities/project.entity';
import { Script } from '../../database/entities/script.entity';
import { Material } from '../../database/entities/material.entity';

@Module({
  imports: [VolcanoModule, TypeOrmModule.forFeature([Video, VideoTask, Project, Script, Material])],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
