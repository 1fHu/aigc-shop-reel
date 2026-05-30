import { Body, Controller, Get, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { VideoService } from './video.service';
import { ok } from '../../common/api-response';
import { GetProjectVideoDto } from './dto/get-project-video.dto';

@Controller('api/videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getLatestByProject(@Req() request: { user: { id: string } }, @Query() query: GetProjectVideoDto) {
    return ok(this.videoService.getLatestByProject(query.project_id, request.user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate')
  generate(@Body() body: { project_id: string; script_id: string }) {
    return ok(this.videoService.generate(body.project_id, body.script_id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/status')
  getStatus(@Param('id') id: string) {
    return ok(this.videoService.getStatus(id));
  }

  // 分镜列表（真实每分镜状态 + 各分镜视频 URL + 剧本内容），供分镜编辑器
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/shots')
  getShots(@Param('id') id: string) {
    return ok(this.videoService.getShots(id));
  }

  // 单个分镜片段文件（公开，供 <video> 直接加载；与 :id/file 一致不加鉴权）
  @Get(':id/shots/:index/file')
  getShotFile(@Param('id') id: string, @Param('index') index: string, @Res() res: Response) {
    const filePath = join(process.cwd(), '..', 'uploads', 'videos', `${id}-shot-${index}.mp4`);
    if (!existsSync(filePath)) {
      return res.status(404).json({ code: 404, msg: '分镜视频不存在' });
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/shots/:index/regenerate')
  regenerateShot(@Param('id') id: string, @Param('index') index: string, @Body() body: { new_prompt?: string }) {
    return ok(this.videoService.regenerateShot(id, Number(index), body.new_prompt));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/settings')
  updateSettings(@Param('id') id: string, @Body() body: { tts?: { language?: string; voice?: string }; bgm?: { preset_id?: string; custom_url?: string; volume?: number } }) {
    return ok(this.videoService.updateSettings(id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/download')
  getDownload(@Param('id') id: string) {
    return ok(this.videoService.getDownload(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/export')
  export(@Param('id') id: string, @Body() body: { aspect_ratio: string; resolution: string }) {
    return ok(this.videoService.export(id, body.aspect_ratio, body.resolution));
  }

  @Get(':id/file')
  getFile(@Param('id') id: string, @Res() res: Response) {
    const filePath = join(process.cwd(), '..', 'uploads', 'videos', `${id}.mp4`);
    if (!existsSync(filePath)) {
      return res.status(404).json({ code: 404, msg: '视频文件不存在' });
    }
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  }
}
