import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { ProductModule } from './modules/product/product.module';
import { MaterialModule } from './modules/material/material.module';
import { ScriptModule } from './modules/script/script.module';
import { VideoModule } from './modules/video/video.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ViralLibraryModule } from './modules/viral-library/viral-library.module';
import { GeneBankModule } from './modules/gene-bank/gene-bank.module';
import { VolcanoModule } from './modules/volcano/volcano.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: path.resolve(__dirname, '../../.env'), load: [configuration] }),
    DatabaseModule,
    QueueModule,
    AuthModule,
    UserModule,
    ProjectModule,
    ProductModule,
    MaterialModule,
    ScriptModule,
    VideoModule,
    AnalyticsModule,
    ViralLibraryModule,
    GeneBankModule,
    VolcanoModule,
  ],
})
export class AppModule {}
