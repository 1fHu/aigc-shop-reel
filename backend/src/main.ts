import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracing } from './tracing/tracing';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

async function bootstrap() {
  initTracing();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 提高 pg 连接池 EventEmitter 监听器上限（仅作用于该池）。并发查询会给池注册多个
  // 'release' 监听器，超过默认 10 会刷 MaxListenersExceededWarning；池容量已设为 20，
  // 这里放宽到 50 以容纳并发峰值，同时仍能暴露真正失控的泄漏（数百级）。
  const pgPool = (app.get(DataSource).driver as { master?: { setMaxListeners?: (n: number) => void } }).master;
  pgPool?.setMaxListeners?.(50);
  // Ensure JSON responses include UTF-8 charset to avoid encoding issues in some clients
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : 'http://localhost:5173';
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  // 全局强制所有响应 HTTP 200，业务码用 envelope code 表达
  app.use((req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode === 201) res.status(200);
      return originalSend(body);
    };
    next();
  });

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
