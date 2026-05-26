import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ViralLibraryService } from './viral-library.service';
import { ok } from '../../common/api-response';

@Controller('api/viral-library')
export class ViralLibraryController {
  constructor(private readonly viralLibraryService: ViralLibraryService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  search(@Query('keyword') keyword = '', @Query('category') category?: string, @Query('platform') platform = 'all', @Query('sort_by') sortBy = 'created_at', @Query('sort_order') sortOrder: 'asc' | 'desc' = 'desc', @Query('limit') limit?: string) {
    const items = this.viralLibraryService.search(keyword, category, platform, sortBy, sortOrder, limit ? Number(limit) : 12);
    return ok(items, items.length);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('import-url')
  importUrl(@Body() body: { url: string; category?: string }) {
    return ok(this.viralLibraryService.importUrl(body.url, body.category));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-analyze')
  uploadAnalyze(@Body() body: { title?: string; category?: string }) {
    return ok(this.viralLibraryService.uploadAnalyze(body.title, body.category));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Param('id') id: string) {
    return ok(this.viralLibraryService.getById(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/reference')
  reference(@Param('id') id: string, @Body() body: { script_id: string }) {
    return ok(this.viralLibraryService.reference(id, body.script_id));
  }
}
