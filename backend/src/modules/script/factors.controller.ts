import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScriptService } from './script.service';
import { ok } from '../../common/api-response';

@Controller('api/factors')
export class FactorsController {
  constructor(private readonly scriptService: ScriptService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getFactors() {
    return ok(this.scriptService.listFactors(), this.scriptService.listFactors().length);
  }
}