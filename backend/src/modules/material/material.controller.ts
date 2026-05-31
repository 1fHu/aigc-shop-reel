import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaterialService } from './material.service';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ListMaterialsDto } from './dto/list-materials.dto';

@Controller('api/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMaterialsDto) {
    const { items, total } = await this.materialService.list(
      user.id,
      query.project_id,
      query.type ?? 'all',
      query.page ?? 1,
      query.limit ?? 24,
    );
    return ok(items, total);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('search')
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query('project_id') projectId: string,
    @Query('q') q = '',
    @Query('tags') tags = '',
    @Query('level') level = 'material',
  ) {
    const results = await this.materialService.search(user.id, projectId, q, tags, level);
    return ok(results, results.length);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return ok(await this.materialService.getById(id, user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/tags')
  async updateTags(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { tags: string[] },
  ) {
    return ok(await this.materialService.updateTags(id, user.id, body.tags));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return ok(await this.materialService.delete(id, user.id));
  }
}
