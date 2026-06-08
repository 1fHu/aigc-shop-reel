import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ok } from './common/api-response';

@Controller('api')
export class AppController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get('health')
  async health() {
    const checks: Record<string, string> = {};
    try {
      await this.ds.query('SELECT 1');
      checks.db = 'ok';
    } catch {
      checks.db = 'unreachable';
    }
    return ok({ status: 'ok', service: 'vidcraft-backend', checks });
  }
}