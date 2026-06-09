import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
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

  // 剧本生成就绪检查：素材全部解析完成（无 parsing）才允许生成。前端轮询置灰生成按钮。
  // 注意：静态路由须先于 @Get(':id') 声明，避免被参数路由吞掉。
  @UseGuards(AuthGuard('jwt'))
  @Get('readiness')
  async readiness(@CurrentUser() user: AuthenticatedUser, @Query() query: GetProjectScriptDto) {
    return ok(await this.scriptService.getReadiness(query.project_id, user.id));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('generate')
  async generate(
    @Body()
    body: {
      project_id: string;
      strategy_type: string;
      reference_video_id?: string;
      factors?: { visual_style?: string; opener?: string; narration?: string; pacing?: string; cta?: string };
    },
    @Res() response: Response,
  ) {
    const script = await this.scriptService.generate(
      body.project_id,
      body.strategy_type,
      body.reference_video_id,
      body.factors,
    );
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    for (const shot of script.storyboard as Array<Record<string, unknown>>) {
      // 召回到素材时缩略图用素材图/适配图（预览本幕首帧），否则占位图
      const thumb = (shot.adapted_image_url as string) || (shot.reference_image_url as string)
        || `https://placehold.co/400x240/8B5CF6/fff?text=Scene+${(shot.index as number) + 1}`;
      const scene = {
        id: `scene-${shot.index as number}`,
        index: shot.index,
        duration: (shot.duration as number) || 3,
        thumb_url: thumb,
        description: shot.description,
        camera_motion: shot.camera_motion || 'static',
        bgm: (shot.bgm as string) || 'Modern Beat',
        voiceover: shot.voiceover || '',
        subtitle: shot.subtitle || '',
        // 素材绑定（前端只读展示，C=不允许手动改）
        material_id: shot.material_id ?? null,
        material_use_mode: shot.material_use_mode ?? 'none',
        material_score: shot.material_score ?? null,
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

  // 删除某一幕召回到的图片素材 → 回退默认紫色占位图（前端剧本编辑页）
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/shots/:shotIndex/material')
  async clearShotMaterial(@Param('id') id: string, @Param('shotIndex') shotIndex: string) {
    return ok(await this.scriptService.clearShotMaterial(id, Number(shotIndex)));
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/regenerate-shot')
  async regenerateShot(
    @Param('id') id: string,
    @Body()
    body: {
      shot_index: number;
      new_prompt?: string;
      factors?: { visual_style?: string; opener?: string; narration?: string; pacing?: string; cta?: string };
    },
    @Res() response: Response,
  ) {
    const result = await this.scriptService.regenerateShot(id, body.shot_index, body.factors, body.new_prompt);
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
