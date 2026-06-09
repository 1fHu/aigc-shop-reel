import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyzedVideo } from '../../database/entities/analyzed-video.entity';
import { ViralLibrary } from '../../database/entities/viral-library.entity';
import * as fs from 'fs';
import * as path from 'path';
import { VideoFrameExtractor } from './helpers/video-frame-extractor';
import { AIAnalyzerService } from './services/ai-analyzer.service';
import { normalizeCreativeFactors } from '../gene-bank/types/creative-factors.type';

@Injectable()
export class ViralAnalyzerService {
  private readonly logger = new Logger(ViralAnalyzerService.name);
  private readonly aiAnalyzer: AIAnalyzerService;

  constructor(
    @InjectRepository(AnalyzedVideo)
    private readonly analyzedVideoRepo: Repository<AnalyzedVideo>,
    @InjectRepository(ViralLibrary)
    private readonly viralLibraryRepo: Repository<ViralLibrary>,
  ) {
    this.aiAnalyzer = new AIAnalyzerService();
  }

  /**
   * 创建视频拆解任务
   */
  async createAnalysisTask(
    userId: string,
    file: Express.Multer.File,
  ): Promise<AnalyzedVideo> {
    this.logger.log(`创建视频拆解任务：${file.originalname}`);

    const analyzedVideo = this.analyzedVideoRepo.create({
      userId,
      title: this.extractTitle(file.originalname),
      originalFilename: file.originalname,
      videoPath: file.path,
      fileSize: file.size,
      status: 'pending',
    });

    const saved = await this.analyzedVideoRepo.save(analyzedVideo);

    // 异步触发分析（不阻塞响应）
    this.startAnalysis(saved.id).catch((err) => {
      this.logger.error(`分析失败: ${saved.id}`, err);
    });

    return saved;
  }

  /**
   * 开始分析视频
   */
  private async startAnalysis(videoId: string): Promise<void> {
    this.logger.log(`开始分析视频: ${videoId}`);

    try {
      // 更新状态为 analyzing
      await this.analyzedVideoRepo.update(videoId, { status: 'analyzing' });

      const video = await this.analyzedVideoRepo.findOne({ where: { id: videoId } });
      if (!video) {
        throw new NotFoundException('视频记录不存在');
      }

      // 1. 提取视频关键帧
      const framesDir = path.join(process.cwd(), '../uploads/temp-frames', videoId);
      this.logger.log(`提取关键帧到: ${framesDir}`);

      const frames = await VideoFrameExtractor.extractKeyFrames(
        video.videoPath,
        framesDir,
        10, // 提取10帧
      );
      this.logger.log(`提取了 ${frames.length} 个关键帧`);

      // 2. 生成缩略图
      const thumbnailDir = path.join(process.cwd(), '../uploads/analyzed-videos/thumbnails');
      fs.mkdirSync(thumbnailDir, { recursive: true });
      const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);

      try {
        await VideoFrameExtractor.extractThumbnail(video.videoPath, thumbnailPath);
        this.logger.log(`生成缩略图: ${thumbnailPath}`);
      } catch (err) {
        this.logger.warn('缩略图生成失败，继续分析', err);
      }

      // 3. AI 分析
      this.logger.log('调用 AI 分析...');
      const result = await this.aiAnalyzer.analyzeVideo(frames);

      // 4. 更新数据库
      //    创作因子归一成标准 CreativeFactors 枚举码后落库，保证与基因库/剧本生成同一套枚举对齐。
      //    （展示时由 controller 经 creativeFactorsToLabels 映射回中文）
      await this.analyzedVideoRepo.update(videoId, {
        status: 'completed',
        analysis: {
          hook: result.hook,
          selling_points: result.selling_points,
          pacing: result.pacing,
          style: result.style,
        },
        creativeFactors: normalizeCreativeFactors(result.creative_factors),
        thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : undefined,
      });

      // 5. 清理临时文件
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true });
        this.logger.log('已清理临时帧文件');
      }

      this.logger.log(`视频分析完成: ${videoId}`);
    } catch (error) {
      this.logger.error(`视频分析失败: ${videoId}`, error);
      await this.analyzedVideoRepo.update(videoId, {
        status: 'failed',
        errorMessage: error.message,
      });
    }
  }

  /**
   * 获取用户的拆解历史列表
   */
  async getList(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: AnalyzedVideo[]; total: number }> {
    const [items, total] = await this.analyzedVideoRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  /**
   * 获取拆解详情
   */
  async getDetail(id: string, userId: string): Promise<AnalyzedVideo> {
    const video = await this.analyzedVideoRepo.findOne({
      where: { id, userId },
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    // 添加虚拟字段（使用下划线命名）
    (video as any).video_url = `/api/viral-analyzer/videos/${video.id}/stream`;
    (video as any).thumbnail_url = video.thumbnailPath
      ? `/api/viral-analyzer/videos/${video.id}/thumbnail`
      : null;

    return video;
  }

  /**
   * 删除拆解记录
   */
  async delete(id: string, userId: string): Promise<void> {
    const video = await this.getDetail(id, userId);

    // 删除视频文件
    if (video.videoPath && fs.existsSync(video.videoPath)) {
      fs.unlinkSync(video.videoPath);
    }

    // 删除缩略图
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    // 删除数据库记录
    await this.analyzedVideoRepo.delete(id);

    this.logger.log(`删除视频: ${id}`);
  }

  /**
   * 获取视频文件路径
   */
  async getVideoPath(id: string, userId: string): Promise<string> {
    const video = await this.getDetail(id, userId);

    if (!fs.existsSync(video.videoPath)) {
      throw new NotFoundException('视频文件不存在');
    }

    return video.videoPath;
  }

  /**
   * 公开获取视频（用于视频流和缩略图，不需要用户认证）
   */
  async getVideoByIdPublic(id: string): Promise<AnalyzedVideo> {
    const video = await this.analyzedVideoRepo.findOne({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('视频不存在');
    }

    return video;
  }

  /**
   * 从文件名提取标题
   */
  private extractTitle(filename: string): string {
    // 移除扩展名
    const nameWithoutExt = path.parse(filename).name;
    // 限制长度
    return nameWithoutExt.slice(0, 100);
  }

  /**
   * 同步到 GeneBank（病毒基因库）
   */
  async syncToGenebank(videoId: string, userId: string): Promise<ViralLibrary> {
    this.logger.log(`同步视频到基因库: ${videoId}`);

    const video = await this.getDetail(videoId, userId);

    // 检查是否已完成分析
    if (video.status !== 'completed') {
      throw new BadRequestException('视频尚未完成分析');
    }

    if (!video.analysis || !video.creativeFactors) {
      throw new BadRequestException('视频分析结果不完整');
    }

    // 复制视频文件到 GeneBank 目录
    const genebankVideoDir = path.join(process.cwd(), '../uploads/genebank-videos');
    if (!fs.existsSync(genebankVideoDir)) {
      fs.mkdirSync(genebankVideoDir, { recursive: true });
    }

    const newVideoPath = path.join(genebankVideoDir, `${video.id}${path.extname(video.videoPath)}`);
    if (!fs.existsSync(newVideoPath)) {
      fs.copyFileSync(video.videoPath, newVideoPath);
    }

    // 复制缩略图
    let thumbnailUrl = null;
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      const genebankThumbnailDir = path.join(process.cwd(), '../uploads/genebank-thumbnails');
      if (!fs.existsSync(genebankThumbnailDir)) {
        fs.mkdirSync(genebankThumbnailDir, { recursive: true });
      }

      const newThumbnailPath = path.join(genebankThumbnailDir, `${video.id}.jpg`);
      fs.copyFileSync(video.thumbnailPath, newThumbnailPath);
      thumbnailUrl = `/api/gene-bank/thumbnails/${video.id}.jpg`;
    }

    // 构建分析报告（GeneBank 格式）
    const analysisReport = {
      hook: video.analysis.hook,
      selling_points: video.analysis.selling_points,
      pacing: video.analysis.pacing,
      style: video.analysis.style,
      // 幂等归一：新记录已是枚举码原样返回，历史中文记录也会被纠正为枚举码
      creative_factors: normalizeCreativeFactors(video.creativeFactors),
      analyzed_at: new Date().toISOString(),
      source: 'viral-analyzer',
    };

    // 创建 GeneBank 记录
    const genebankEntry = new ViralLibrary();
    genebankEntry.sourceUrl = `/api/viral-analyzer/videos/${video.id}/stream`;
    genebankEntry.platform = 'user-upload';
    genebankEntry.title = video.title;
    genebankEntry.thumbnailUrl = thumbnailUrl;
    genebankEntry.analysisReport = analysisReport;
    genebankEntry.status = 'completed';

    const saved = await this.viralLibraryRepo.save(genebankEntry);

    this.logger.log(`视频已同步到基因库: ${saved.id}`);

    return saved;
  }
}
