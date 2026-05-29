import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MockStoreService } from '../../common/mock-store.service';

const MAX_FILES = 20;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/msvideo']);

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);

  constructor(
    private readonly store: MockStoreService,
    @InjectQueue('material-analysis') private readonly analysisQueue: Queue,
  ) {}

  upload(userId: string, projectId: string, files: Express.Multer.File[]) {
    const project = this.store.getProject(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    if (project.user_id !== userId) {
      throw new ForbiddenException('无权操作该项目');
    }
    if (files.length === 0) {
      throw new BadRequestException('请至少上传一个素材文件');
    }
    if (files.length > MAX_FILES) {
      throw new BadRequestException(`单次最多上传 ${MAX_FILES} 个文件`);
    }

    for (const file of files) {
      const mimetype = (file.mimetype || '').toLowerCase();
      const isImage = IMAGE_MIME.has(mimetype);
      const isVideo = VIDEO_MIME.has(mimetype);
      if (!isImage && !isVideo) {
        throw new BadRequestException(`文件「${file.originalname}」格式不支持，仅支持 JPG/PNG/WEBP 图片或 MP4/MOV/AVI 视频`);
      }
      const limit = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (file.size > limit) {
        const limitMb = Math.round(limit / 1024 / 1024);
        throw new BadRequestException(`文件「${file.originalname}」超出大小限制（${isImage ? '图片' : '视频'} ≤ ${limitMb}MB）`);
      }
    }

    const created = this.store.createMaterials(
      projectId,
      files.map((file) => ({ originalname: file.originalname, mimetype: file.mimetype, size: file.size })),
    );

    // 入库后异步触发 AI 解析：投递到 material-analysis 队列，由 processor 回填 analysis/tags 并把 status 翻成 ready。
    // 投递失败不应阻断上传（素材仍为 parsing，可后续重试），因此 fire-and-forget + 记录日志。
    for (const material of created) {
      this.analysisQueue
        .add({ materialId: material.id })
        .catch((err: Error) => this.logger.error(`素材 ${material.id} 解析任务入队失败：${err.message}`));
    }
    this.logger.log(`项目 ${projectId} 上传 ${created.length} 个素材，已触发异步 AI 解析`);
    return created;
  }

  list(userId: string, projectId: string, type = 'all', page = 1, limit = 24) {
    const project = this.store.getProject(projectId);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    if (project.user_id !== userId) {
      throw new ForbiddenException('无权访问该项目');
    }
    const all = this.store
      .listMaterials(projectId, type)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    const total = all.length;
    const offset = (page - 1) * limit;
    const items = all.slice(offset, offset + limit).map((material) => ({
      id: material.id,
      file_type: material.file_type,
      thumbnail_url: material.thumbnail_url,
      status: material.status,
      tags: material.tags,
      duration: material.duration,
      created_at: material.created_at,
    }));
    return { items, total };
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
