import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards, NotFoundException } from '@nestjs/common';
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

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getLatestByProject(@CurrentUser() user: AuthenticatedUser, @Query() query: GetProjectVideoDto) {
    return ok(await this.videoService.getLatestByProject(query.project_id, user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate')
  async generate(@Body() body: { project_id: string; script_id: string; voice_id?: string; subtitle_enabled?: boolean; subtitle_style?: { font_size?: number; outline?: number; color?: string; font_family?: string }; custom_requirement?: string }) {
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
    const dir = join(process.cwd(), '..', 'uploads', 'videos');
    // 优先返回带 TTS 配音 + 烧录字幕的合成片段（与成片一致）；缺失再回退到无字幕/无配音的原始片段
    const composited = join(dir, `${id}-shot-${index}-composited.mp4`);
    const raw = join(dir, `${id}-shot-${index}.mp4`);
    const filePath = existsSync(composited) ? composited : raw;
    if (!existsSync(filePath)) throw new NotFoundException('分镜视频不存在');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/shots/:index/regenerate')
  async regenerateShot(@Param('id') id: string, @Param('index') index: string, @Body() body: { new_prompt?: string; keep_frames?: boolean }) {
    return ok(await this.videoService.regenerateShot(id, Number(index), body.new_prompt, body.keep_frames ?? false));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/regenerate-shots')
  async regenerateShots(@Param('id') id: string, @Body() body: { shot_indices: number[]; keep_frames?: boolean; voice_id?: string; subtitle_enabled?: boolean; subtitle_style?: { font_size?: number; outline?: number; color?: string; font_family?: string }; custom_requirement?: string }) {
    return ok(await this.videoService.regenerateShots(id, body.shot_indices, body.keep_frames ?? false, {
      voice_id: body.voice_id,
      subtitle_enabled: body.subtitle_enabled,
      subtitle_style: body.subtitle_style,
      custom_requirement: body.custom_requirement,
    }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/finalize')
  async finalize(@Param('id') id: string) {
    return ok(await this.videoService.finalize(id));
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
    if (!existsSync(filePath)) throw new NotFoundException('视频文件不存在');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(filePath);
  }
}
