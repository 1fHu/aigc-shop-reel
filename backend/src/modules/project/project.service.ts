import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../database/entities/project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  async create(userId: string, input: { name: string; description?: string }) {
    const project = this.projectRepo.create({
      userId,
      name: input.name,
      description: input.description || '',
      status: 'material_pending',
    });
    const saved = await this.projectRepo.save(project);
    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      status: saved.status,
      created_at: saved.createdAt.toISOString(),
    };
  }

  async list(userId: string, keyword = '', page = 1, limit = 20, status = 'all') {
    const qb = this.projectRepo.createQueryBuilder('p')
      .where('p.userId = :userId', { userId });
    if (keyword) qb.andWhere('p.name ILIKE :kw', { kw: `%${keyword}%` });
    if (status !== 'all') qb.andWhere('p.status = :status', { status });
    qb.orderBy('p.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        cover_url: p.coverUrl,
        video_count: p.videoCount,
        status: p.status,
        views: p.views,
        render_progress: p.renderProgress,
        tiktok_ready: p.tiktokReady,
        updated_at: p.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async getById(id: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      product_url: project.productUrl,
      product_info: project.productInfo,
      cover_url: project.coverUrl,
      status: project.status,
      material_count: project.materialCount,
      video_count: project.videoCount,
      render_progress: project.renderProgress,
      tiktok_ready: project.tiktokReady,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    };
  }

  async update(id: string, userId: string, input: { name?: string; description?: string; status?: string; cover_url?: string; product_info?: unknown; material_count?: number; video_count?: number; render_progress?: number; tiktok_ready?: boolean }) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作该项目');
    // Map snake_case input to camelCase entity fields
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.cover_url !== undefined) updateData.coverUrl = input.cover_url;
    if (input.product_info !== undefined) updateData.productInfo = input.product_info;
    if (input.material_count !== undefined) updateData.materialCount = input.material_count;
    if (input.video_count !== undefined) updateData.videoCount = input.video_count;
    if (input.render_progress !== undefined) updateData.renderProgress = input.render_progress;
    if (input.tiktok_ready !== undefined) updateData.tiktokReady = input.tiktok_ready;
    await this.projectRepo.update(id, updateData as any);
    return { id };
  }

  async delete(id: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权操作该项目');
    await this.projectRepo.delete(id);
    return { deleted: true };
  }
}
