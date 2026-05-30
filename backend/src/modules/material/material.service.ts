import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../../database/entities/material.entity';
import { Project } from '../../database/entities/project.entity';

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async list(userId: string, projectId: string, type = 'all', page = 1, limit = 24) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');

    const qb = this.materialRepo.createQueryBuilder('m')
      .where('m.projectId = :projectId', { projectId });
    if (type !== 'all') qb.andWhere('m.fileType = :type', { type });
    qb.orderBy('m.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((m) => ({
        id: m.id,
        file_type: m.fileType,
        file_name: m.fileName,
        file_size: m.fileSize,
        thumbnail_url: m.thumbnailUrl,
        status: m.status,
        tags: m.tags,
        duration: m.duration,
        created_at: m.createdAt.toISOString(),
        analysis: m.analysis,
      })),
      total,
    };
  }

  async getById(id: string) {
    const material = await this.materialRepo.findOne({ where: { id } });
    if (!material) throw new NotFoundException('素材不存在');
    return {
      id: material.id,
      project_id: material.projectId,
      file_url: material.fileUrl,
      file_type: material.fileType,
      file_name: material.fileName,
      file_size: material.fileSize,
      analysis: material.analysis,
      embedding: material.embedding,
      tags: material.tags,
      thumbnail_url: material.thumbnailUrl,
      status: material.status,
      duration: material.duration,
      slices: material.slices,
      created_at: material.createdAt.toISOString(),
    };
  }

  async delete(id: string) {
    await this.materialRepo.delete(id);
    return { deleted: true, referenced_shots: 0 };
  }

  search(projectId: string, _q = '', _tags = '', _level = 'material') {
    return [];
  }

  updateTags(_id: string, _tags: string[]) {
    return { id: _id, tags: _tags };
  }
}
