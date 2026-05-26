import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaterialService } from './material.service';
import { ok } from '../../common/api-response';

@Controller('api/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  upload(@Body() body: { project_id: string; files?: Array<{ originalname?: string; mimetype?: string; size?: number }> }) {
    return ok(this.materialService.upload(body.project_id, body.files || []), body.files?.length || 0);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Query('project_id') projectId: string, @Query('type') type = 'all') {
    const materials = this.materialService.list(projectId, type);
    return ok(materials, materials.length);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  search(@Query('project_id') projectId: string, @Query('q') q = '', @Query('tags') tags = '', @Query('level') level = 'material') {
    const results = this.materialService.search(projectId, q, tags, level);
    return ok(results, results.length);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Param('id') id: string) {
    return ok(this.materialService.getById(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/tags')
  updateTags(@Param('id') id: string, @Body() body: { tags: string[] }) {
    return ok(this.materialService.updateTags(id, body.tags));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Param('id') id: string) {
    return ok(this.materialService.delete(id));
  }
}
