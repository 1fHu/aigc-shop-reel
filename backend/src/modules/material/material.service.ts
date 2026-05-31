import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async getById(id: string, userId: string) {
    const material = await this.loadOwned(id, userId);
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

  async delete(id: string, userId: string) {
    await this.loadOwned(id, userId);
    await this.materialRepo.delete(id);
    return { deleted: true, referenced_shots: 0 };
  }

  /** GET /api/materials/search 多颗粒度检索（当前实现 keyword + tag 过滤；vector/slice 待补） */
  async search(userId: string, projectId: string, q = '', tags = '', level = 'material') {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');

    // 切片检索依赖 material_slices（FFmpeg 场景切片，尚未生成），slice 粒度暂返回空
    if (level === 'slice') return [];

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const keyword = q.trim().toLowerCase();

    const materials = await this.materialRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });

    const filtered = materials.filter((m) => {
      const mtags = m.tags ?? [];
      // tags：AND 逻辑，须全部命中
      if (tagList.length && !tagList.every((t) => mtags.includes(t))) return false;
      // q：关键词命中 文件名 / 标签 / analysis 文本
      if (keyword) {
        const hay = [m.fileName ?? '', mtags.join(' '), JSON.stringify(m.analysis ?? {})]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(keyword)) return false;
      }
      return true;
    });

    // 关键词/标签检索 score 为 null（向量检索接入后再填余弦相似度）
    return filtered.map((m) => ({
      id: m.id,
      type: 'material' as const,
      thumbnail_url: m.thumbnailUrl,
      tags: m.tags ?? [],
      score: null,
    }));
  }

  /** PUT /api/materials/:id/tags 覆盖式更新标签 */
  async updateTags(id: string, userId: string, tags: string[]) {
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
      throw new BadRequestException('tags 必须是字符串数组');
    }
    await this.loadOwned(id, userId);
    await this.materialRepo.update(id, { tags });
    return { id, tags };
  }

  /** 取素材并校验归属（素材 → 项目 → user_id），否则 404 / 403 */
  private async loadOwned(id: string, userId: string): Promise<Material> {
    const material = await this.materialRepo.findOne({ where: { id } });
    if (!material) throw new NotFoundException('素材不存在');
    const project = await this.projectRepo.findOne({ where: { id: material.projectId } });
    if (!project || project.userId !== userId) throw new ForbiddenException('无权访问该素材');
    return material;
  }
}
