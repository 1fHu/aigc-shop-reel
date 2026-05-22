import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioConfigService {
  constructor(private configService: ConfigService) {}
  createClient(): Minio.Client {
    return new Minio.Client({
      endPoint: this.configService.get<string>('minio.endPoint', 'localhost'),
      port: this.configService.get<number>('minio.port', 9000),
      useSSL: false,
      accessKey: this.configService.get<string>('minio.accessKey', 'minioadmin'),
      secretKey: this.configService.get<string>('minio.secretKey', 'minioadmin'),
    });
  }
  get bucket(): string { return this.configService.get<string>('minio.bucket', 'vidcraft-media'); }
}
