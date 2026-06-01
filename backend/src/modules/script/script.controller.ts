import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ScriptService } from './script.service';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { GetProjectScriptDto } from './dto/get-project-script.dto';

@Controller('api/scripts')
export class ScriptController {
  constructor(private readonly scriptService: ScriptService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getLatestByProject(@CurrentUser() user: AuthenticatedUser, @Query() query: GetProjectScriptDto) {
    return ok(await this.scriptService.getLatestByProject(query.project_id, user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate')
  async generate(@Body() body: { project_id: string; strategy_type: string }, @Res() response: Response) {
    const script = await this.scriptService.generate(body.project_id, body.strategy_type);
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    for (const shot of script.storyboard as Array<Record<string, unknown>>) {
      const scene = {
        id: `scene-${shot.index as number}`,
        index: shot.index,
        duration: (shot.duration as number) || 3,
        thumb_url: `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${(shot.index as number) + 1}`,
        description: shot.description,
        camera_motion: shot.camera_motion || 'static',
        bgm: (shot.bgm as string) || 'Modern Beat',
        voiceover: shot.voiceover || '',
        subtitle: shot.subtitle || '',
      };
      response.write(`data: ${JSON.stringify({ type: 'scene', scene })}\n\n`);
    }
    response.write(`data: ${JSON.stringify({ type: 'done', script_id: script.id, total_shots: (script.storyboard as Array<unknown>).length, total_duration: script.total_duration })}\n\n`);
    response.end();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getById(@Param('id') id: string) {
    return ok(await this.scriptService.getById(id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id/storyboard')
  async saveStoryboard(@Param('id') id: string, @Body() body: { storyboard: Array<{ index: number; description: string; camera_motion: string; duration: number; voiceover: string; subtitle: string; bgm: string; reference_image_url: string | null }> }) {
    return ok(await this.scriptService.saveStoryboard(id, body.storyboard));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/regenerate-shot')
  async regenerateShot(@Param('id') id: string, @Body() body: { shot_index: number; new_prompt?: string }, @Res() response: Response) {
    const result = await this.scriptService.regenerateShot(id, body.shot_index, body.new_prompt);
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.write(`data: ${JSON.stringify(result)}\n\n`);
    response.end();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/replace-factor')
  async replaceFactor(@Param('id') id: string, @Body() body: { dimension: string; new_value: string; scope?: 'affected' | 'all' }, @Res() response: Response) {
    const result = await this.scriptService.replaceFactor(id, body.dimension, body.new_value, body.scope);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.write(`data: ${JSON.stringify(result)}\n\n`);
    response.end();
  }
}
