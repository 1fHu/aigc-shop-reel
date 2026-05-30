import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { MockStoreService } from '../../common/mock-store.service';
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
    const video = this.store.createVideo(projectId, scriptId);
    const script = this.store.getScript(scriptId);
    const project = this.store.getProject(projectId);

    const productInfo = (project?.product_info || {}) as Record<string, unknown>;
    const productName = (productInfo.name as string) || '商品';
    const coverUrl = (project?.cover_url || (productInfo as any).cover_url || '') as string;

    // 后台异步：AI 生成分镜 → 提交 Seedance
    this.buildPromptAndSubmit(video.id, script, productName, productInfo, coverUrl);

    return { video_id: video.id, trace_id: video.trace_id, task_count: 1, status: video.status };
  }

  private async buildPromptAndSubmit(
    videoId: string,
    script: ReturnType<MockStoreService['getScript']>,
    productName: string,
    productInfo: Record<string, unknown>,
    coverUrl: string,
  ) {
    // 1. AI 生成真实分镜描述
    const shotDescriptions = await this.volcano.generateShotScript(productInfo);
    const sceneDesc = shotDescriptions.length > 0
      ? shotDescriptions.join('；')
      : (script?.storyboard || []).map((s: { description: string }) => s.description).join('；');

    // 2. 构建 prompt（商品信息 + AI 分镜 + 商品图）
    const prompt = `为TikTok电商带货生成一条15秒以内的竖屏短视频（9:16比例）。商品：${productName}。分镜脚本：${sceneDesc}。要求：画面精美、节奏紧凑、适合社交媒体传播，开头3秒内抓住用户注意力，结尾有明确的行动号召。中文配音，中文字幕风格。`;

    this.logger.log(`Video ${videoId} prompt: ${prompt.slice(0, 150)}...`);

    // 3. 提交 Seedance（只传真实图片 URL，过滤占位图）
    const realCover = coverUrl && !coverUrl.includes('placehold.co') ? coverUrl : undefined;
    const result = await this.volcano.generateVideo(prompt, realCover);
    if (result) {
      this.store.updateVideo(videoId, { trace_id: result.taskId, status: 'generating' });
      this.poll(videoId, result.taskId);
    } else {
      this.store.updateVideo(videoId, { status: 'completed', video_url: 'https://placehold.co/1080x1920/0B1C30/fff?text=VidCraft' });
    }
  }

  private poll(videoId: string, taskId: string) {
    const interval = setInterval(async () => {
      const r = await this.volcano.getVideoTaskStatus(taskId);
      if (!r) return;
      if (r.status === 'succeeded' || r.status === 'completed' || r.status === 'done') {
        clearInterval(interval);
        const localUrl = await this.downloadVideo(videoId, r.videoUrl);
        this.store.updateVideo(videoId, { status: 'completed', video_url: localUrl, generation_cost: 0 });
        this.logger.log(`Video ${videoId} done, local: ${localUrl}`);
      } else if (r.status === 'failed') {
        clearInterval(interval);
        this.store.updateVideo(videoId, { status: 'failed' });
      }
    }, 5000);
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
