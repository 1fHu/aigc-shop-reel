import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MockStoreService } from '../common/mock-store.service';
import { MinioStorageService } from '../common/minio-storage.service';
import { VolcanoApiService } from '../modules/volcano/volcano-api.service';

type MaterialAnalysisJob = { materialId: string };

@Processor('material-analysis')
export class MaterialAnalysisProcessor {
  private readonly logger = new Logger(MaterialAnalysisProcessor.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly volcano: VolcanoApiService,
    private readonly minio: MinioStorageService,
  ) {}

  @Process()
  async process(job: Job<MaterialAnalysisJob>): Promise<void> {
    const { materialId } = job.data;
    const material = this.store.getMaterial(materialId);
    if (!material) {
      this.logger.warn(`素材 ${materialId} 不存在，跳过解析`);
      return;
    }
    try {
      // Download file buffer from MinIO
      let buffer: Buffer;
      try {
        buffer = await this.minio.downloadFile(material.file_url);
      } catch (err) {
        this.logger.warn(`MinIO download failed for ${material.file_url}, using empty buffer: ${(err as Error).message}`);
        buffer = Buffer.alloc(0);
      }

      const result = await this.volcano.analyzeMaterial({
        fileType: material.file_type as 'image' | 'video',
        fileName: material.file_name as string,
        buffer,
      });

      this.store.updateMaterialAnalysis(materialId, {
        status: 'ready',
        analysis: result.analysis,
        tags: result.tags,
        embedding: result.embedding,
        duration: result.duration,
      });
      this.logger.log(`素材 ${materialId} AI 解析完成，status=ready`);
    } catch (err) {
      this.store.updateMaterialAnalysis(materialId, { status: 'failed' });
      this.logger.error(`素材 ${materialId} AI 解析失败：${(err as Error).message}`);
    }
  }
}
