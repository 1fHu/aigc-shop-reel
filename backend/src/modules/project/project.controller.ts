import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateProjectDto) {
    return ok(await this.projectService.create(user.id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListProjectsDto) {
    const { items, total } = await this.projectService.list(
      user.id,
      query.keyword ?? '',
      query.page ?? 1,
      query.limit ?? 20,
      query.status ?? 'all',
    );
    return ok(items, total);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return ok(await this.projectService.getById(id, user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateProjectDto) {
    return ok(await this.projectService.update(id, user.id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return ok(await this.projectService.delete(id, user.id));
  }
}
