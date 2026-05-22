import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VolcanoConfigService {
  constructor(private configService: ConfigService) {}
  get accessKey(): string { return this.configService.get<string>('volcano.accessKey', ''); }
  get secretKey(): string { return this.configService.get<string>('volcano.secretKey', ''); }
  get region(): string { return this.configService.get<string>('volcano.region', 'cn-north-1'); }
}
