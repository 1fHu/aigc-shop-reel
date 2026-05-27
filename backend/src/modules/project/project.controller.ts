import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { ok } from '../../common/api-response';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { DeleteProjectDto } from './dto/delete-project.dto';

@Controller('api/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() request: { user: { id: string } }, @Body() body: CreateProjectDto) {
    return ok(this.projectService.create(request.user.id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Req() request: { user: { id: string } }, @Query() query: ListProjectsDto) {
    const { items, total } = this.projectService.list(
      request.user.id,
      query.keyword ?? '',
      query.page ?? 1,
      query.limit ?? 20,
      query.status ?? 'all',
    );
    return ok(items, total);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Req() request: { user: { id: string } }, @Param('id') id: string) {
    return ok(this.projectService.getById(id, request.user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Req() request: { user: { id: string } }, @Param('id') id: string, @Body() body: UpdateProjectDto) {
    return ok(this.projectService.update(id, request.user.id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Req() request: { user: { id: string } }, @Param('id') id: string, @Body() body: DeleteProjectDto) {
    return ok(this.projectService.delete(id, request.user.id, body.confirm_name));
  }
}
