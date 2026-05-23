import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracing } from './tracing/tracing';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  initTracing();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  // Ensure JSON responses include UTF-8 charset to avoid encoding issues in some clients
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle('VidCraft API')
    .setDescription('AIGC Video Creation Platform')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`VidCraft API running on http://localhost:${port}`);
}
bootstrap();
