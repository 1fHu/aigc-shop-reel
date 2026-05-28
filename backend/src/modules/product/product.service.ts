import { Injectable, NotFoundException } from '@nestjs/common';
import { MockStoreService, ProjectRecord } from '../../common/mock-store.service';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {

  constructor(private readonly store: MockStoreService) {}

  /** flat 商品结构（spec v1.2：与 parse-url / parse-image 返回结构一致） */
  private toFlatProduct(project: ProjectRecord) {
    const info = (project.product_info ?? {}) as Record<string, unknown>;
    return {
      project_id: project.id,
      name: (info.name as string) ?? null,
      category: (info.category as string) ?? null,
      selling_points: (info.selling_points as string[]) ?? [],
      target_audience: (info.target_audience as string) ?? null,
      usage_scene: (info.usage_scene as string) ?? null,
      price_anchor: (info.price_anchor as string) ?? null,
      cover_url: project.cover_url ?? (info.cover_url as string) ?? null,
      updated_at: project.updated_at,
    };
  }

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

  updateProjectProduct(projectId: string, productInfo: UpdateProductDto) {
    const project = this.store.upsertProduct(projectId, { ...productInfo });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    return this.toFlatProduct(project);
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
    return { ...this.toFlatProduct(project), confirmed: project.status !== 'draft' };
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
