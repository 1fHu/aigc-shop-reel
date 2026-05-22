import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisConfigService {
  constructor(private configService: ConfigService) {}
  get url(): string { return this.configService.get<string>('redis.url', 'redis://localhost:6379'); }
}
