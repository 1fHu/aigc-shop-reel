import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Material } from './entities/material.entity';
import { Script } from './entities/script.entity';
import { Video } from './entities/video.entity';
import { VideoTask } from './entities/video-task.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL', 'postgresql://vidcraft:vidcraft@localhost:5432/vidcraft'),
        entities: [User, Project, Material, Script, Video, VideoTask],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
        // 连接池：默认 pg pool max=10，前端轮询 + 视频生成并发查询时易排队。给点余量；
        // 连接获取超时后报错而非无限挂起，避免前端请求卡死（连不上时快速失败）。
        extra: { max: 20, connectionTimeoutMillis: 10000 },
      }),
    }),
    TypeOrmModule.forFeature([User, Project, Material, Script, Video, VideoTask]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
