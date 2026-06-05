import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { GeneBankService } from './gene-bank.service';
import { ok } from '../../common/api-response';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

@Controller('api/gene-bank')
export class GeneBankController {
  constructor(private readonly geneBankService: GeneBankService) {}

  /**
   * 获取所有参考视频列表
   * GET /api/gene-bank/reference-videos
   * 公开接口，无需认证
   */
  @Get('reference-videos')
  async getAllReferenceVideos() {
    const videos = await this.geneBankService.getAllReferenceVideos();
    return ok(videos, videos.length);
  }

  /**
   * 获取参考视频详情
   * GET /api/gene-bank/reference-videos/:id
   * 公开接口，无需认证
   */
  @Get('reference-videos/:id')
  async getReferenceVideoById(@Param('id') id: string) {
    const video = await this.geneBankService.getReferenceVideoById(id);
    return ok(video);
  }

  /**
   * 获取参考视频的创作因子（带中文标签）
   * GET /api/gene-bank/reference-videos/:id/factors
   * 公开接口，无需认证
   */
  @Get('reference-videos/:id/factors')
  async getFactors(@Param('id') id: string) {
    const factors = await this.geneBankService.getFactorsWithLabels(id);
    return ok(factors);
  }

  /**
   * 流式传输视频文件
   * GET /api/gene-bank/videos/:filename/stream
   */
  @Get('videos/:filename/stream')
  streamVideo(@Param('filename') filename: string, @Res() res: Response) {
    const videoPath = join(process.cwd(), '..', 'uploads', 'reference-videos', `${filename}.mp4`);

    if (!existsSync(videoPath)) {
      return res.status(404).json({ code: 404, msg: '视频文件不存在' });
    }

    const stat = statSync(videoPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = createReadStream(videoPath);
    stream.pipe(res);
  }

  /**
   * 获取视频缩略图
   * GET /api/gene-bank/videos/:filename/thumbnail
   */
  @Get('videos/:filename/thumbnail')
  getThumbnail(@Param('filename') filename: string, @Res() res: Response) {
    const thumbnailPath = join(process.cwd(), '..', 'uploads', 'thumbnails', `${filename}.jpg`);

    if (!existsSync(thumbnailPath)) {
      // 如果缩略图不存在，返回 404
      return res.status(404).json({ code: 404, msg: '缩略图文件不存在' });
    }

    // 返回真实缩略图
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存 1 天

    const stream = createReadStream(thumbnailPath);
    stream.pipe(res);
  }
}
