import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { VolcanoApiService } from './volcano-api.service';
import { ok } from '../../common/api-response';

@Controller('api/volcano')
export class VolcanoController {
  constructor(private readonly volcanoApiService: VolcanoApiService) {}

  @Post('seedance-callback')
  seedanceCallback(@Query('token') token: string | undefined, @Query('trace_id') traceId: string | undefined, @Body() body: Record<string, unknown>) {
    if (!token) {
      return { code: 403, msg: '签名缺失', total: 0, data: null, traceId: traceId || 'trace-missing' };
    }
    return ok({ received: true, token, trace_id: traceId || null, body });
  }

  @Get('ping')
  ping() {
    return ok({ status: 'ok' });
  }
}