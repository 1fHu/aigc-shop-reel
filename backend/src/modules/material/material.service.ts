import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository } from 'typeorm';
import { readFile, unlink } from 'fs/promises';
import { Material } from '../../database/entities/material.entity';
import { Project } from '../../database/entities/project.entity';
import { MinioStorageService } from '../../common/minio-storage.service';

/**
 * 上传约束：
 * - 图片 JPG/PNG/WEBP ≤20MB（API 文档 M4）。
 * - 视频 MP4/MOV/AVI ≤200MB（时长 ≤30s 在 processor 用 ffprobe 校验，上传时取不到）。
 * - 单次 ≤20 个文件。
 */
const MAX_FILES = 20;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectQueue('material-analysis') private readonly analysisQueue: Queue,
    private readonly minio: MinioStorageService,
  ) {}

  /**
   * POST /api/materials/upload 批量上传素材（图片 + 视频）。
   * 文件经 multer diskStorage 落临时盘（`file.path`），本方法读回后落 MinIO + 建 status='parsing'
   * 记录并入队；AI 解析由 material-analysis processor 后台异步完成：
   * - 图片：Doubao Vision 打标 + Embedding；
   * - 视频：ffprobe 取时长（>30s 置 failed）+ ffmpeg 抽 1 帧做缩略图与打标。
   * 解析完置 status='ready'，失败置 'failed'。
   */
  async upload(userId: string, projectId: string, files: Express.Multer.File[]) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');

    if (!files || files.length === 0) throw new BadRequestException('请至少上传一个素材文件');
    if (files.length > MAX_FILES) throw new BadRequestException(`单次最多上传 ${MAX_FILES} 个文件`);

    // diskStorage 落的临时文件，无论成功失败都在 finally 清理
    const tempPaths = files.map((f) => f.path).filter(Boolean);
    try {
      // 先整体校验，任一不合法即整批拒绝，避免部分落库
      for (const f of files) {
        const isImage = IMAGE_MIMES.includes(f.mimetype);
        const isVideo = VIDEO_MIMES.includes(f.mimetype);
        if (!isImage && !isVideo) {
          throw new BadRequestException(`文件「${f.originalname}」格式不支持，仅支持 JPG/PNG/WEBP 图片或 MP4/MOV/AVI 视频`);
        }
        if (isImage && f.size > MAX_IMAGE_SIZE) {
          throw new BadRequestException(`图片「${f.originalname}」超过 20MB 大小限制`);
        }
        if (isVideo && f.size > MAX_VIDEO_SIZE) {
          throw new BadRequestException(`视频「${f.originalname}」超过 200MB 大小限制`);
        }
      }

      const results: Array<{ id: string; file_type: string; file_url: string; status: string; thumbnail_url: string | null }> = [];
      for (const f of files) {
        const fileType = IMAGE_MIMES.includes(f.mimetype) ? 'image' : 'video';
        const ext = (f.originalname.split('.').pop() || (fileType === 'video' ? 'mp4' : 'jpg')).toLowerCase();
        const key = `projects/${projectId}/materials/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        // diskStorage 时 buffer 为空，从临时盘读回；兼容 memoryStorage
        const buffer = f.buffer ?? (await readFile(f.path));
        const fileUrl = await this.minio.uploadFile(key, buffer, f.mimetype);

        const material = this.materialRepo.create({
          projectId,
          fileUrl,
          fileType,
          fileName: f.originalname,
          fileSize: f.size,
          // 图片缩略图即自身；视频缩略图由 processor 抽首帧后回填（此处留空）
          thumbnailUrl: fileType === 'image' ? fileUrl : undefined,
          status: 'parsing',
          tags: [],
          slices: [],
        });
        const saved = await this.materialRepo.save(material);

        // 入队，由 material-analysis processor 后台解析
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
    } finally {
      await Promise.all(tempPaths.map((p) => unlink(p).catch(() => undefined)));
    }
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
