import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { MockStoreService, ScriptShot } from '../../common/mock-store.service';
import { VolcanoApiService } from '../volcano/volcano-api.service';

const VIDEO_DIR = join(process.cwd(), '..', 'uploads', 'videos');

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly store: MockStoreService,
    private readonly volcano: VolcanoApiService,
  ) {}

  generate(projectId: string, scriptId: string) {
    // 解析真实剧本：优先用传入的 scriptId；无效（不存在/无分镜）则回退到项目最新剧本。
    // 这样视频脚本严格来自「前一步 ScriptStudio 生成的剧本」，而非临时由商品信息重编。
    let script = this.store.getScript(scriptId);
    if (!script || !script.storyboard?.length) {
      const latest = this.store.getLatestScriptByProject(projectId);
      if (latest) {
        script = latest;
        scriptId = latest.id;
      }
    }

    const video = this.store.createVideo(projectId, scriptId);
    const project = this.store.getProject(projectId);

    const productInfo = (project?.product_info || {}) as Record<string, unknown>;
    const productName = (productInfo.name as string) || '商品';
    const coverUrl = (project?.cover_url || (productInfo as any).cover_url || '') as string;

    // 后台异步：基于真实剧本分镜 → 提交 Seedance
    this.buildPromptAndSubmit(video.id, script, productName, coverUrl);

    return { video_id: video.id, trace_id: video.trace_id, task_count: 1, status: video.status };
  }

  /**
   * 第一步：只生成「单个分镜」的视频。
   * 取剧本的第一个分镜，用其真实内容（画面/口播/字幕/运镜）构建 prompt 提交 Seedance。
   * 后续步骤会扩展为遍历全部分镜并合成成片。
   */
  private async buildPromptAndSubmit(
    videoId: string,
    script: ReturnType<MockStoreService['getScript']>,
    productName: string,
    coverUrl: string,
  ) {
    const storyboard = (script?.storyboard ?? []) as ScriptShot[];
    if (storyboard.length === 0) {
      this.logger.warn(`Video ${videoId}: 关联剧本无分镜，无法生成视频`);
      this.store.updateVideo(videoId, { status: 'failed' });
      return;
    }

    const shot = storyboard[0];
    const prompt = this.buildShotPrompt(shot, productName);
    this.logger.log(`Video ${videoId} 分镜#${shot.index} prompt: ${prompt.slice(0, 150)}...`);

    // 提交 Seedance（只传真实图片 URL，过滤占位图）
    const realCover = coverUrl && !coverUrl.includes('placehold.co') ? coverUrl : undefined;
    const result = await this.volcano.generateVideo(prompt, realCover);
    if (result) {
      this.store.updateVideo(videoId, { trace_id: result.taskId, status: 'generating' });
      this.poll(videoId, shot.index, result.taskId);
    } else {
      this.store.updateVideo(videoId, { status: 'completed', video_url: 'https://placehold.co/1080x1920/0B1C30/fff?text=VidCraft' });
    }
  }

  /** 用单个分镜的真实剧本内容构建 Seedance 视频 prompt */
  private buildShotPrompt(shot: ScriptShot, productName: string): string {
    const parts = [
      `为TikTok电商带货生成一个约${shot.duration || 3}秒的竖屏短视频分镜（9:16比例）。`,
      `商品：${productName}。`,
      `画面内容：${shot.description}。`,
    ];
    if (shot.voiceover) parts.push(`口播文案：${shot.voiceover}。`);
    if (shot.subtitle) parts.push(`字幕：${shot.subtitle}。`);
    if (shot.camera_motion) parts.push(`运镜：${shot.camera_motion}。`);
    parts.push('要求：画面精美、节奏紧凑、适合社交媒体传播，中文配音与中文字幕风格。');
    return parts.join('');
  }

  private poll(videoId: string, shotIndex: number, taskId: string) {
    const interval = setInterval(async () => {
      const r = await this.volcano.getVideoTaskStatus(taskId);
      if (!r) return;
      if (r.status === 'succeeded' || r.status === 'completed' || r.status === 'done') {
        clearInterval(interval);
        const localUrl = await this.downloadVideo(videoId, r.videoUrl);
        this.store.updateVideo(videoId, { status: 'completed', video_url: localUrl, generation_cost: 0 });
        this.markShotTask(videoId, shotIndex, { status: 'completed', preview_url: localUrl });
        this.logger.log(`Video ${videoId} 分镜#${shotIndex} done, local: ${localUrl}`);
      } else if (r.status === 'failed') {
        clearInterval(interval);
        this.store.updateVideo(videoId, { status: 'failed' });
        this.markShotTask(videoId, shotIndex, { status: 'failed', error_msg: '分镜生成失败' });
      }
    }, 5000);
  }

  /** 把分镜生成结果写回对应的分镜 task（为后续多分镜成片铺垫） */
  private markShotTask(videoId: string, shotIndex: number, patch: { status: 'completed' | 'failed'; preview_url?: string; error_msg?: string }) {
    const task = this.store.getVideoTasks(videoId).find((t) => t.shot_index === shotIndex);
    if (task) this.store.updateVideoTask(task.id, patch);
  }

  private async downloadVideo(videoId: string, remoteUrl?: string): Promise<string> {
    if (!remoteUrl) return '';
    try {
      if (!existsSync(VIDEO_DIR)) mkdirSync(VIDEO_DIR, { recursive: true });
      const localPath = join(VIDEO_DIR, `${videoId}.mp4`);
      const res = await fetch(remoteUrl);
      if (!res.ok || !res.body) return remoteUrl;
      const writer = createWriteStream(localPath);
      const reader = res.body as unknown as NodeJS.ReadableStream;
      await pipeline(reader, writer);
      this.logger.log(`Downloaded video to ${localPath}`);
      return `/api/videos/${videoId}/file`;
    } catch (err) {
      this.logger.error(`Download failed: ${(err as Error).message}, keeping remote URL`);
      return remoteUrl;
    }
  }

  getStatus(id: string) {
    const s = this.store.getVideoStatus(id);
    if (!s) throw new NotFoundException('视频不存在');
    return s;
  }

  /**
   * 取某项目「已有的最新视频」（前端进视频页判断是否可直接播放）。
   * 项目不存在 → 404；非本人项目 → 403；项目暂无视频 → 返回 null。
   */
  getLatestByProject(projectId: string, userId: string) {
    const project = this.store.getProject(projectId);
    if (!project) throw new NotFoundException('项目不存在');
    if (project.user_id !== userId) throw new ForbiddenException('无权访问该项目');
    return this.store.getLatestVideoByProject(projectId) ?? null;
  }

  regenerateShot(id: string, index: number, newPrompt?: string) {
    const r = this.store.regenerateVideoShot(id, index, newPrompt);
    if (!r) throw new NotFoundException('分镜不存在');
    return r;
  }

  updateSettings(id: string, body: { tts?: { language?: string; voice?: string }; bgm?: { preset_id?: string; custom_url?: string; volume?: number } }) {
    const r = this.store.updateVideoSettings(id, body.tts?.language, body.tts?.voice, body.bgm?.preset_id, body.bgm?.custom_url, body.bgm?.volume);
    if (!r) throw new NotFoundException('视频不存在');
    return r;
  }

  getDownload(id: string) {
    const r = this.store.getVideoDownload(id);
    if (!r) throw new NotFoundException('视频不存在');
    return r;
  }

  export(id: string, aspectRatio: string, resolution: string) {
    const r = this.store.exportVideo(id, aspectRatio, resolution);
    if (!r) throw new NotFoundException('视频不存在');
    return r;
  }
}
