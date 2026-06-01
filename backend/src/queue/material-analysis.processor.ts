import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../database/entities/material.entity';
import { MinioStorageService } from '../common/minio-storage.service';
import { VolcanoApiService } from '../modules/volcano/volcano-api.service';

type MaterialAnalysisJob = { materialId: string };

/**
 * 素材异步 AI 解析 processor（@nestjs/bull，底层 bull v4）。
 * 注：素材当前由 product.parseImage 同步解析并落库（status=ready），暂无人向本队列入队；
 * 本 processor 已对齐 Postgres，保留以备恢复「上传后异步解析」链路时直接复用。
 */
@Processor('material-analysis')
export class MaterialAnalysisProcessor {
  private readonly logger = new Logger(MaterialAnalysisProcessor.name);

  constructor(
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    private readonly volcano: VolcanoApiService,
    private readonly minio: MinioStorageService,
  ) {}

  @Process()
  async process(job: Job<MaterialAnalysisJob>): Promise<void> {
    const { materialId } = job.data;
    const material = await this.materialRepo.findOne({ where: { id: materialId } });
    if (!material) {
      this.logger.warn(`素材 ${materialId} 不存在，跳过解析`);
      return;
    }
    try {
      // 从 MinIO 取回文件 buffer
      let buffer: Buffer;
      try {
        buffer = await this.minio.downloadFile(material.fileUrl);
      } catch (err) {
        this.logger.warn(`MinIO download failed for ${material.fileUrl}, using empty buffer: ${(err as Error).message}`);
        buffer = Buffer.alloc(0);
      }

      const result = await this.volcano.analyzeMaterial({
        fileType: material.fileType as 'image' | 'video',
        fileName: material.fileName,
        buffer,
      });

      await this.materialRepo.update(materialId, {
        status: 'ready',
        analysis: result.analysis,
        tags: result.tags,
        embedding: result.embedding,
        duration: result.duration ?? undefined,
      });
      this.logger.log(`素材 ${materialId} AI 解析完成，status=ready`);
    } catch (err) {
      await this.materialRepo.update(materialId, { status: 'failed' });
      this.logger.error(`素材 ${materialId} AI 解析失败：${(err as Error).message}`);
    }
  }
}
