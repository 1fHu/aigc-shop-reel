import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(private readonly store: MockStoreService) {}

  upload(projectId: string, files: Array<{ originalname?: string; mimetype?: string; size?: number }>) {
    return this.store.createMaterials(projectId, files);
  }

  list(projectId: string, type = 'all') {
    return this.store.listMaterials(projectId, type);
  }

  search(projectId: string, q = '', tags = '', level = 'material') {
    return this.store.searchMaterials(projectId, q, tags, level);
  }

  getById(id: string) {
    const material = this.store.getMaterial(id);
    if (!material) {
      throw new NotFoundException('素材不存在');
    }
    return material;
  }

  updateTags(id: string, tags: string[]) {
    const material = this.store.updateMaterialTags(id, tags);
    if (!material) {
      throw new NotFoundException('素材不存在');
    }
    return material;
  }

  delete(id: string) {
    return { deleted: this.store.deleteMaterial(id), referenced_shots: 0 };
  }
}
