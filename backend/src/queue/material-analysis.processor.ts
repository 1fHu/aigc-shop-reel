import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { writeFile, readFile, unlink } from 'fs/promises';
import { Material } from '../database/entities/material.entity';
import { MinioStorageService } from '../common/minio-storage.service';
import { VolcanoApiService } from '../modules/volcano/volcano-api.service';

type MaterialAnalysisJob = { materialId: string };

/** 视频时长上限（秒）：超过即判失败 */
const MAX_VIDEO_DURATION = 30;

/**
 * 素材异步 AI 解析 processor（@nestjs/bull，底层 bull v4）。
 * 由 MaterialService.upload() 入队驱动：
 * - 图片：Doubao Vision 打标 + Embedding；
 * - 视频：ffprobe 取时长（>30s 置 failed）+ ffmpeg 抽首帧做缩略图与打标（Phase 1：取 1 帧，不切片）。
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
      if (material.fileType === 'video') {
        await this.processVideo(material);
      } else {
        await this.processImage(material);
      }
    } catch (err) {
      await this.materialRepo.update(materialId, { status: 'failed' });
      this.logger.error(`素材 ${materialId} AI 解析失败：${(err as Error).message}`);
    }
  }

  /** 图片素材：直接拿原图做 Vision 打标 + Embedding */
  private async processImage(material: Material): Promise<void> {
    let buffer: Buffer;
    try {
      buffer = await this.minio.downloadFile(material.fileUrl);
    } catch (err) {
      this.logger.warn(`MinIO download failed for ${material.fileUrl}, using empty buffer: ${(err as Error).message}`);
      buffer = Buffer.alloc(0);
    }

    const result = await this.volcano.analyzeMaterial({
      fileType: 'image',
      fileName: material.fileName,
      buffer,
    });

    await this.materialRepo.update(material.id, {
      status: 'ready',
      analysis: result.analysis,
      tags: result.tags,
      embedding: result.embedding,
    });
    this.logger.log(`图片素材 ${material.id} AI 解析完成，status=ready`);
  }

  /**
   * 视频素材（Phase 1）：
   * 1) 落临时盘 → ffprobe 取时长（>30s 判 failed）；
   * 2) ffmpeg 抽 1 帧 → 上传 MinIO 作缩略图；
   * 3) 该帧走 Vision 打标 + Embedding（复用 analyzeMaterial，传帧即当图片处理）。
   */
  private async processVideo(material: Material): Promise<void> {
    const buffer = await this.minio.downloadFile(material.fileUrl);
    const videoPath = join(tmpdir(), `mat-${material.id}-${randomUUID()}.video`);
    await writeFile(videoPath, buffer);

    try {
      const duration = await this.probeDuration(videoPath);
      if (duration !== null && duration > MAX_VIDEO_DURATION) {
        await this.materialRepo.update(material.id, {
          status: 'failed',
          duration,
          analysis: { error: `视频时长 ${duration.toFixed(1)}s 超过 ${MAX_VIDEO_DURATION}s 限制` },
        });
        this.logger.warn(`视频素材 ${material.id} 时长 ${duration.toFixed(1)}s 超限，status=failed`);
        return;
      }

      // 抽帧时间点：时长一半（封顶 1s），取不到时长时退回 1s
      const at = duration !== null ? Math.min(1, duration / 2) : 1;
      const frame = await this.extractFrame(videoPath, at);

      const thumbKey = `projects/${material.projectId}/materials/thumbs/${material.id}.jpg`;
      const thumbnailUrl = await this.minio.uploadFile(thumbKey, frame, 'image/jpeg');

      const result = await this.volcano.analyzeMaterial({
        fileType: 'video',
        fileName: material.fileName,
        buffer: frame,
      });

      await this.materialRepo.update(material.id, {
        status: 'ready',
        thumbnailUrl,
        duration: duration ?? undefined,
        analysis: result.analysis,
        tags: result.tags,
        embedding: result.embedding,
      });
      this.logger.log(`视频素材 ${material.id} AI 解析完成，duration=${duration ?? '?'}s，status=ready`);
    } finally {
      await unlink(videoPath).catch(() => undefined);
    }
  }

  /** ffprobe 读时长（秒）；失败返回 null */
  private probeDuration(videoPath: string): Promise<number | null> {
    return new Promise((resolve) => {
      const p = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ]);
      let out = '';
      p.stdout.on('data', (d) => (out += d.toString()));
      p.on('error', () => resolve(null));
      p.on('close', () => {
        const n = parseFloat(out.trim());
        resolve(Number.isFinite(n) ? n : null);
      });
    });
  }

  /** ffmpeg 在指定秒抽 1 帧 jpg，返回其 buffer */
  private async extractFrame(videoPath: string, atSec: number): Promise<Buffer> {
    const framePath = join(tmpdir(), `frame-${randomUUID()}.jpg`);
    await new Promise<void>((resolve, reject) => {
      const p = spawn('ffmpeg', [
        '-y',
        '-ss', String(atSec),
        '-i', videoPath,
        '-frames:v', '1',
        '-q:v', '3',
        framePath,
      ]);
      let stderr = '';
      p.stderr.on('data', (d) => (stderr += d.toString()));
      p.on('error', reject);
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg 抽帧失败 exit ${code}: ${stderr.slice(-200)}`))));
    });
    try {
      return await readFile(framePath);
    } finally {
      await unlink(framePath).catch(() => undefined);
    }
  }
}
