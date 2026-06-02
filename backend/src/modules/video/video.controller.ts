import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { VideoService } from './video.service';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { GetProjectVideoDto } from './dto/get-project-video.dto';

@Controller('api/videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getLatestByProject(@CurrentUser() user: AuthenticatedUser, @Query() query: GetProjectVideoDto) {
    return ok(await this.videoService.getLatestByProject(query.project_id, user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate')
  async generate(@Body() body: { project_id: string; script_id: string; voice_id?: string; subtitle_enabled?: boolean; subtitle_style?: { font_size?: number; outline?: number }; custom_requirement?: string }) {
    return ok(await this.videoService.generate(body.project_id, body.script_id, { voice_id: body.voice_id, subtitle_enabled: body.subtitle_enabled, subtitle_style: body.subtitle_style, custom_requirement: body.custom_requirement }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return ok(await this.videoService.getStatus(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/shots')
  async getShots(@Param('id') id: string) {
    return ok(await this.videoService.getShots(id));
  }

  @Get(':id/shots/:index/file')
  getShotFile(@Param('id') id: string, @Param('index') index: string, @Res() res: Response) {
    const filePath = join(process.cwd(), '..', 'uploads', 'videos', `${id}-shot-${index}.mp4`);
    if (!existsSync(filePath)) return res.status(404).json({ code: 404, msg: '分镜视频不存在' });
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/shots/:index/regenerate')
  async regenerateShot(@Param('id') id: string, @Param('index') index: string, @Body() body: { new_prompt?: string }) {
    return ok(await this.videoService.regenerateShot(id, Number(index), body.new_prompt));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/settings')
  async updateSettings(@Param('id') id: string, @Body() body: { tts?: { language?: string; voice?: string }; bgm?: { preset_id?: string; custom_url?: string; volume?: number } }) {
    return ok(await this.videoService.updateSettings(id, body));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/download')
  async getDownload(@Param('id') id: string) {
    return ok(await this.videoService.getDownload(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/export')
  async export(@Param('id') id: string, @Body() body: { aspect_ratio: string; resolution: string }) {
    return ok(await this.videoService.export(id, body.aspect_ratio, body.resolution));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return ok(await this.videoService.cancel(id));
  }

  @Get(':id/file')
  getFile(@Param('id') id: string, @Res() res: Response) {
    const filePath = join(process.cwd(), '..', 'uploads', 'videos', `${id}.mp4`);
    if (!existsSync(filePath)) return res.status(404).json({ code: 404, msg: '视频文件不存在' });
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  }
}
