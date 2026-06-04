import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { createReadStream, existsSync } from 'fs';
import { ViralAnalyzerService } from './viral-analyzer.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { ok } from '../../common/api-response';

@Controller('api/viral-analyzer')
export class ViralAnalyzerController {
  constructor(private readonly viralAnalyzerService: ViralAnalyzerService) {}

  /**
   * 上传视频并创建拆解任务
   * POST /api/viral-analyzer/upload
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: '../uploads/analyzed-videos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `video-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (req, file, cb) => {
        // 允许视频 MIME 类型或常见视频文件扩展名
        const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
        const allowedExts = ['.mp4', '.mov', '.avi', '.mpeg', '.mpg', '.mkv'];
        const ext = extname(file.originalname).toLowerCase();

        if (file.mimetype.startsWith('video/') || allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('只支持视频文件（mp4, mov, avi, mpeg）'), false);
        }
      },
    }),
  )
  async uploadVideo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const analyzedVideo = await this.viralAnalyzerService.createAnalysisTask(user.id, file);

    return ok({
      id: analyzedVideo.id,
      title: analyzedVideo.title,
      status: analyzedVideo.status,
      created_at: analyzedVideo.createdAt,
    });
  }

  /**
   * 获取拆解历史列表
   * GET /api/viral-analyzer/list?page=1&limit=20
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('list')
  async getList(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const { items, total } = await this.viralAnalyzerService.getList(user.id, page, limit);

    return ok({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        thumbnail_url: item.thumbnailPath
          ? `/api/viral-analyzer/videos/${item.id}/thumbnail`
          : null,
        status: item.status,
        duration: item.duration,
        created_at: item.createdAt,
      })),
      total,
      page,
      limit,
    });
  }

  /**
   * 获取拆解详情
   * GET /api/viral-analyzer/:id
   */
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getDetail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const video = await this.viralAnalyzerService.getDetail(id, user.id);

    return ok({
      id: video.id,
      title: video.title,
      video_url: `/api/viral-analyzer/videos/${video.id}/stream`,
      thumbnail_url: video.thumbnailPath
        ? `/api/viral-analyzer/videos/${video.id}/thumbnail`
        : null,
      duration: video.duration,
      status: video.status,
      error_message: video.errorMessage,
      analysis: video.analysis,
      creative_factors: video.creativeFactors,
      created_at: video.createdAt,
    });
  }

  /**
   * 删除拆解记录
   * DELETE /api/viral-analyzer/:id
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.viralAnalyzerService.delete(id, user.id);
    return ok({ message: '删除成功' });
  }

  /**
   * 视频流式播放
   * GET /api/viral-analyzer/videos/:id/stream
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('videos/:id/stream')
  async streamVideo(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const videoPath = await this.viralAnalyzerService.getVideoPath(id, user.id);

    if (!existsSync(videoPath)) {
      return res.status(404).json({ code: 404, msg: '视频文件不存在' });
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = createReadStream(videoPath);
    stream.pipe(res);
  }

  /**
   * 获取视频缩略图
   * GET /api/viral-analyzer/videos/:id/thumbnail
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('videos/:id/thumbnail')
  async getThumbnail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const video = await this.viralAnalyzerService.getDetail(id, user.id);

    if (!video.thumbnailPath || !existsSync(video.thumbnailPath)) {
      // 返回占位图
      return res.redirect('https://placehold.co/600x800/8B5CF6/fff?text=Video');
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = createReadStream(video.thumbnailPath);
    stream.pipe(res);
  }
}
