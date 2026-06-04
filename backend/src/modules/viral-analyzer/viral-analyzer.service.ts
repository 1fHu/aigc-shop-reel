import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyzedVideo } from '../../database/entities/analyzed-video.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ViralAnalyzerService {
  private readonly logger = new Logger(ViralAnalyzerService.name);

  constructor(
    @InjectRepository(AnalyzedVideo)
    private readonly analyzedVideoRepo: Repository<AnalyzedVideo>,
  ) {}

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

      // TODO: 实现实际的 AI 分析逻辑
      // 1. 提取视频关键帧
      // 2. 调用 LLM 分析
      // 3. 提取创作因子

      // 模拟分析过程
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 模拟分析结果
      const mockAnalysis = {
        hook: {
          time_range: '00:00 — 00:03',
          content: '大特写产品在光下旋转，伴 0.5s 重低音 sting，瞬间锁定注意力。',
        },
        selling_points: [
          '40dB 主动降噪 · 直接 demo 对比',
          '14 小时续航 · 数字翻牌动效',
          '3 麦克风通话降噪 · 真人示范',
        ],
        pacing: '9 个分镜 / 30 秒，平均 3.3s 一镜，高密度叙事，符合 Z 世代节奏。',
        style: '冷色调 + 局部金色暖光，质感工业风，与产品科技感高度协调。',
      };

      const mockFactors = {
        visual_style: '极简主义',
        opener: '悬念诱导',
        narration: '冷静知性',
        pacing: '快节奏（3s/镜）',
        cta: '限时优惠',
      };

      // 更新分析结果
      await this.analyzedVideoRepo.update(videoId, {
        status: 'completed',
        analysis: mockAnalysis,
        creativeFactors: mockFactors,
      });

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
   * 从文件名提取标题
   */
  private extractTitle(filename: string): string {
    // 移除扩展名
    const nameWithoutExt = path.parse(filename).name;
    // 限制长度
    return nameWithoutExt.slice(0, 100);
  }
}
