import { Controller, Get } from '@nestjs/common';
import { ok } from './common/api-response';

@Controller('api')
export class AppController {
  @Get('health')
  health() {
    return ok({ status: 'ok', service: 'vidcraft-backend' });
  }
}