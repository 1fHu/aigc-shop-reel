import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { MaterialService } from './material.service';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UploadMaterialDto } from './dto/upload-material.dto';

@Controller('api/materials')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @UseGuards(AuthGuard('jwt'))
  // diskStorage：大文件（视频）逐个落临时盘而非全进内存；service 读回后落 MinIO 并清理临时文件
  @UseInterceptors(FilesInterceptor('files', 20, {
    storage: diskStorage({
      destination: tmpdir(),
      filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
    }),
  }))
  @Post('upload')
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadMaterialDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const items = await this.materialService.upload(user.id, dto.project_id, files);
    return ok(items, items.length);
  }

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
