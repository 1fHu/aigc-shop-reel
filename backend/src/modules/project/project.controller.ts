import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { ok } from '../../common/api-response';
import { CreateProjectDto } from './dto/create-project.dto';

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
  list(@Req() request: { user: { id: string } }, @Query('keyword') keyword = '') {
    const projects = this.projectService.list(request.user.id, keyword);
    return ok(projects, projects.length);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Param('id') id: string) {
    return ok(this.projectService.getById(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return ok(this.projectService.update(id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Param('id') id: string) {
    return ok(this.projectService.delete(id));
  }
}
