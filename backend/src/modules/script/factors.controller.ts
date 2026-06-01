import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScriptService } from './script.service';
import { ok } from '../../common/api-response';

@Controller('api/factors')
export class FactorsController {
  constructor(private readonly scriptService: ScriptService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFactors() {
    const factors = await this.scriptService.listFactors();
    return ok(factors, factors.length);
  }
}
