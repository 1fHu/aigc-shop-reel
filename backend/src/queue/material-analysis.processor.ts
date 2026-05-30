import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MockStoreService } from '../common/mock-store.service';
import { VolcanoApiService } from '../modules/volcano/volcano-api.service';

type MaterialAnalysisJob = { materialId: string };

@Processor('material-analysis')
export class MaterialAnalysisProcessor {
  private readonly logger = new Logger(MaterialAnalysisProcessor.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly volcano: VolcanoApiService,
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
      const result = await this.volcano.analyzeMaterial({
        fileType: material.file_type as 'image' | 'video',
        fileName: material.file_name as string,
      });
      this.store.updateMaterialAnalysis(materialId, {
        status: 'ready',
        analysis: result.analysis,
        tags: result.tags,
        embedding: result.embedding,
        duration: result.duration,
      });
      // TODO(video): 视频素材交 Python FastAPI 做 FFmpeg 场景切片，回写 slices（见 TDD 3.5.1）。
      this.logger.log(`素材 ${materialId} AI 解析完成，status=ready`);
    } catch (err) {
      this.store.updateMaterialAnalysis(materialId, { status: 'failed' });
      this.logger.error(`素材 ${materialId} AI 解析失败：${(err as Error).message}`);
    }
  }
}
