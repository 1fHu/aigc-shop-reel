import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly store: MockStoreService) {}

  create(userId: string, input: { name: string; description?: string }) {
    const project = this.store.createProject(userId, input);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      created_at: project.created_at,
    };
  }

  list(userId: string, keyword = '', page = 1, limit = 20) {
    const all = this.store.listProjects(userId, keyword);
    const total = all.length;
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit).map((project) => ({
      id: project.id,
      name: project.name,
      cover_url: project.cover_url,
      video_count: project.video_count,
      status: project.status,
      updated_at: project.updated_at,
    }));
    return { items, total };
  }

  getById(id: string) {
    const project = this.store.getProject(id);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      product_info: project.product_info,
      material_count: project.material_count,
      script_count: project.script_count,
      video_count: project.video_count,
    };
  }

  update(id: string, input: { name?: string; description?: string }) {
    const project = this.store.updateProject(id, input);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return { id: project.id, name: project.name, updated_at: project.updated_at };
  }

  delete(id: string) {
    const removed = this.store.deleteProject(id);
    if (!removed) {
      throw new NotFoundException('项目不存在');
    }
    return null;
  }
}
