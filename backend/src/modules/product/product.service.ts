import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VolcanoApiService } from '../volcano/volcano-api.service';
import { MinioStorageService } from '../../common/minio-storage.service';
import { Project } from '../../database/entities/project.entity';
import { Material } from '../../database/entities/material.entity';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly volcano: VolcanoApiService,
    private readonly minio: MinioStorageService,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
  ) {}

  private toFlatProduct(project: Project) {
    const info = (project.productInfo ?? {}) as Record<string, unknown>;
    return {
      project_id: project.id,
      name: (info.name as string) ?? null,
      category: (info.category as string) ?? null,
      selling_points: (info.selling_points as string[]) ?? [],
      target_audience: (info.target_audience as string) ?? null,
      usage_scene: (info.usage_scene as string) ?? null,
      price_anchor: (info.price_anchor as string) ?? null,
      cover_url: project.coverUrl ?? (info.cover_url as string) ?? null,
      updated_at: project.updatedAt.toISOString(),
    };
  }

  parseUrl(projectId: string, _url: string) {
    return { name: '待解析商品', category: 'other', selling_points: [], target_audience: '', usage_scene: '', price_anchor: '', cover_url: '' };
  }

  async parseImage(projectId: string, imageName: string, imageBuffer?: Buffer) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');

    // Vision 解析与 MinIO 上传互不依赖，并行跑（MinIO 上传时间被 Vision 调用覆盖）
    const uploadPromise = (async (): Promise<string> => {
      if (!imageBuffer) return '';
      const fileExt = imageName.split('.').pop() || 'jpg';
      const key = `projects/${projectId}/products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      try { return await this.minio.uploadFile(key, imageBuffer, 'image/jpeg'); }
      catch (err) { this.logger.warn(`MinIO upload failed: ${(err as Error).message}`); return ''; }
    })();
    const [aiResult, fileUrl] = await Promise.all([
      this.volcano.analyzeProductImage(imageName, imageBuffer),
      uploadPromise,
    ]);

    const coverUrl = fileUrl || `https://placehold.co/400x600/E2E8F0/475569?text=${encodeURIComponent(aiResult.name)}`;
    const productInfo = { ...aiResult, cover_url: coverUrl };

    const analysis = { name: aiResult.name, category: aiResult.category, selling_points: aiResult.selling_points, target_audience: aiResult.target_audience, usage_scene: aiResult.usage_scene, price_anchor: aiResult.price_anchor, cover_url: coverUrl };

    // 让主图素材也进向量检索空间：analysis 已含 name/category/卖点等，直接据此生成 embedding
    const embedding = await this.volcano.generateEmbedding(JSON.stringify(analysis));

    // Create material record in materials table
    const material = this.materialRepo.create({
      projectId,
      fileUrl,
      fileType: 'image',
      fileName: imageName,
      fileSize: imageBuffer?.length || 0,
      analysis,
      embedding: embedding || null,
      tags: aiResult.selling_points?.slice(0, 5) || [],
      thumbnailUrl: coverUrl,
      status: 'ready',
      slices: [],
    } as Material);

    // 更新项目 product_info 与建素材记录互不依赖，并行写
    const [, savedMaterial] = await Promise.all([
      this.projectRepo.update(projectId, { productInfo, coverUrl, status: 'material_pending' }),
      this.materialRepo.save(material),
    ]);

    return { ...productInfo, material_id: savedMaterial.id };
  }

  async updateProjectProduct(projectId: string, productInfo: UpdateProductDto) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    const existing = (project.productInfo ?? {}) as Record<string, unknown>;
    const merged = { ...existing, ...productInfo };
    await this.projectRepo.update(projectId, { productInfo: merged, status: 'material_pending' });
    const updated = await this.projectRepo.findOne({ where: { id: projectId } });
    return this.toFlatProduct(updated!);
  }

  async confirm(projectId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    await this.projectRepo.update(projectId, { status: 'material_pending' });
    return { project_id: projectId, status: 'material_pending' };
  }

  async getByProjectId(projectId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    return { ...this.toFlatProduct(project), confirmed: project.status !== 'draft' };
  }

  async importFromProject(targetProjectId: string, sourceProjectId: string) {
    const source = await this.projectRepo.findOne({ where: { id: sourceProjectId } });
    if (!source) throw new NotFoundException('来源项目不存在');
    await this.projectRepo.update(targetProjectId, { productInfo: source.productInfo });
    const target = await this.projectRepo.findOne({ where: { id: targetProjectId } });
    if (!target) throw new NotFoundException('目标项目不存在');
    return { project_id: target.id, product_info: target.productInfo };
  }
}
