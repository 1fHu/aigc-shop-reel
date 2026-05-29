import { Body, Controller, Get, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { VideoService } from './video.service';
import { ok } from '../../common/api-response';

@Controller('api/videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

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
