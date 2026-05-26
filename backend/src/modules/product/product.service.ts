import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly store: MockStoreService) {}

  parseUrl(projectId: string, url: string) {
    const parsed = this.store.parseProductUrl(url);
    const project = this.store.upsertProduct(projectId, parsed);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return parsed;
  }

  parseImage(projectId: string, imageName: string) {
    const parsed = this.store.parseProductImage(imageName);
    const project = this.store.upsertProduct(projectId, parsed);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return parsed;
  }

  updateProjectProduct(projectId: string, productInfo: Record<string, unknown>) {
    const project = this.store.upsertProduct(projectId, productInfo);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return { project_id: project.id, product_info: project.product_info, updated_at: project.updated_at };
  }

  confirm(projectId: string) {
    const project = this.store.updateProject(projectId, { status: 'material_pending' });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return { project_id: project.id, status: project.status };
  }

  getByProjectId(projectId: string) {
    const project = this.store.getProject(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return { project_id: project.id, product_info: project.product_info, confirmed: project.status !== 'draft' };
  }

  importFromProject(targetProjectId: string, sourceProjectId: string) {
    const source = this.store.getProject(sourceProjectId);
    if (!source) {
      throw new NotFoundException('来源项目不存在');
    }
    const target = this.store.upsertProduct(targetProjectId, source.product_info || {});
    if (!target) {
      throw new NotFoundException('目标项目不存在');
    }
    return { project_id: target.id, product_info: target.product_info };
  }
}
