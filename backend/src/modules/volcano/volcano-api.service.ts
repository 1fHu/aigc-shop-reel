import { Injectable, Logger } from '@nestjs/common';

export type MaterialAnalysisResult = {
  analysis: Record<string, unknown>;
  tags: string[];
  embedding: string;
  duration: number | null;
};

@Injectable()
export class VolcanoApiService {
  private readonly logger = new Logger(VolcanoApiService.name);

  signCallback(taskId: string, secret: string) {
    this.logger.log(`Signing callback for ${taskId}`);
    return Buffer.from(`${taskId}:${secret}`).toString('hex');
  }

  /**
   * 素材多模态解析 + 向量化。
   * TODO: 接入火山引擎 Doubao Vision（多模态打标/描述）与 Doubao Embedding（1024 维向量化，存入 pgvector）；
   *       视频素材的场景切片由 Python FastAPI 的 FFmpeg 工作器完成（见 TDD 3.5.1）。
   * 当前为可降级桩：返回占位解析结果，供异步编排骨架端到端跑通状态流转。
   */
  async analyzeMaterial(input: { fileType: 'image' | 'video'; fileName: string }): Promise<MaterialAnalysisResult> {
    const isVideo = input.fileType === 'video';
    this.logger.log(`analyzeMaterial(stub) file=${input.fileName} type=${input.fileType}`);
    return {
      analysis: {
        summary: isVideo ? '视频素材（待接入 Doubao Vision 解析）' : '图片素材（待接入 Doubao Vision 解析）',
        tags: isVideo ? ['视频', '素材'] : ['图片', '素材'],
        duration: isVideo ? 45.2 : null,
      },
      tags: isVideo ? ['视频', '素材'] : ['图片', '素材'],
      embedding: '[]', // TODO: Doubao Embedding 1024 维
      duration: isVideo ? 45.2 : null,
    };
  }
}
