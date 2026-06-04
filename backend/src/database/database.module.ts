import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Material } from './entities/material.entity';
import { Script } from './entities/script.entity';
import { Video } from './entities/video.entity';
import { VideoTask } from './entities/video-task.entity';
import { AnalyzedVideo } from './entities/analyzed-video.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL', 'postgresql://vidcraft:vidcraft@localhost:5432/vidcraft'),
        entities: [User, Project, Material, Script, Video, VideoTask, AnalyzedVideo],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    TypeOrmModule.forFeature([User, Project, Material, Script, Video, VideoTask, AnalyzedVideo]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
