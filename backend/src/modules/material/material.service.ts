import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository } from 'typeorm';
import { Material } from '../../database/entities/material.entity';
import { Project } from '../../database/entities/project.entity';
import { MinioStorageService } from '../../common/minio-storage.service';

/** 上传约束（对齐 API 文档 M4：图片 JPG/PNG/WEBP ≤20MB，单次 ≤20 个） */
const MAX_FILES = 20;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectQueue('material-analysis') private readonly analysisQueue: Queue,
    private readonly minio: MinioStorageService,
  ) {}

  /**
   * POST /api/materials/upload 批量上传图片素材。
   * 同步落 MinIO + 建 status='parsing' 记录并入队，AI 解析（Vision 打标 + Embedding）由
   * material-analysis processor 后台异步完成（解析完置 status='ready'，失败置 'failed'）。
   */
  async upload(userId: string, projectId: string, files: Express.Multer.File[]) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');

    if (!files || files.length === 0) throw new BadRequestException('请至少上传一个素材文件');
    if (files.length > MAX_FILES) throw new BadRequestException(`单次最多上传 ${MAX_FILES} 个文件`);

    // 先整体校验，任一不合法即整批拒绝，避免部分落库
    for (const f of files) {
      if (!IMAGE_MIMES.includes(f.mimetype)) {
        throw new BadRequestException(`文件「${f.originalname}」格式不支持，仅支持 JPG/PNG/WEBP 图片`);
      }
      if (f.size > MAX_IMAGE_SIZE) {
        throw new BadRequestException(`图片「${f.originalname}」超过 20MB 大小限制`);
      }
    }

    const results: Array<{ id: string; file_type: string; file_url: string; status: string; thumbnail_url: string }> = [];
    for (const f of files) {
      const ext = (f.originalname.split('.').pop() || 'jpg').toLowerCase();
      const key = `projects/${projectId}/materials/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const fileUrl = await this.minio.uploadFile(key, f.buffer, f.mimetype);

      const material = this.materialRepo.create({
        projectId,
        fileUrl,
        fileType: 'image',
        fileName: f.originalname,
        fileSize: f.size,
        thumbnailUrl: fileUrl,
        status: 'parsing',
        tags: [],
        slices: [],
      });
      const saved = await this.materialRepo.save(material);

      // 入队，由 material-analysis processor 后台解析（Vision + Embedding）
      await this.analysisQueue.add({ materialId: saved.id });

      results.push({
        id: saved.id,
        file_type: saved.fileType,
        file_url: saved.fileUrl,
        status: saved.status,
        thumbnail_url: saved.thumbnailUrl,
      });
    }
    return results;
  }

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
