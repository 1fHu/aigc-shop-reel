import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GeneBankService } from './gene-bank.service';
import { ok } from '../../common/api-response';

@Controller('api/genes')
export class GeneBankController {
  constructor(private readonly geneBankService: GeneBankService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  search(@Query('category') category?: string, @Query('keyword') keyword?: string, @Query('vector_query') vectorQuery?: string, @Query('limit') limit?: string) {
    const items = this.geneBankService.search(category, keyword, vectorQuery, limit ? Number(limit) : 10);
    return ok(items, items.length);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Param('id') id: string) {
    return ok(this.geneBankService.getById(id));
  }
}
