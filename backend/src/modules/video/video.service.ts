import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { MockStoreService, ScriptShot } from '../../common/mock-store.service';
import { VolcanoApiService } from '../volcano/volcano-api.service';

const VIDEO_DIR = join(process.cwd(), '..', 'uploads', 'videos');
// 单分镜轮询安全上限：5s × 120 ≈ 10 分钟
const MAX_SHOT_POLLS = 120;

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

    // 后台异步：基于真实剧本逐分镜生成 → 合成
    this.buildPromptAndSubmit(video.id, script, productName, coverUrl);

    return { video_id: video.id, trace_id: video.trace_id, task_count: script?.storyboard?.length ?? 0, status: video.status };
  }

  /**
   * 第二步：逐个分镜生成 + 合成成片。
   * 对剧本每个分镜各提交一个 Seedance 任务（并行），分别下载为
   * uploads/videos/{videoId}-shot-{index}.mp4，并把片段 URL/状态写回对应分镜 task；
   * 全部完成后用 ffmpeg 合成为 {videoId}.mp4 作为最终成片。
   * 每个分镜的视频/状态供分镜编辑器经 GET /api/videos/:id/shots 取得。
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

    const realCover = coverUrl && !coverUrl.includes('placehold.co') ? coverUrl : undefined;

    // 各分镜并行生成（每个分镜独立的 Seedance 任务 + 轮询 + 下载）
    const results = await Promise.all(
      storyboard.map((shot) => this.generateShot(videoId, shot, productName, realCover)),
    );

    const clips = results
      .filter((r) => r.localPath)
      .sort((a, b) => a.index - b.index)
      .map((r) => r.localPath);

    if (clips.length === 0) {
      this.logger.warn(`Video ${videoId}: 所有分镜生成失败`);
      this.store.updateVideo(videoId, { status: 'failed' });
      return;
    }

    // 合成成片
    const finalUrl = await this.composite(videoId, clips);
    this.store.updateVideo(videoId, { status: 'completed', video_url: finalUrl, generation_cost: 0 });
    this.logger.log(`Video ${videoId} 合成完成：${clips.length}/${storyboard.length} 个分镜 → ${finalUrl}`);
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

  /** 生成单个分镜：提交 Seedance → 轮询 → 下载本地。返回本地片段路径（失败为空串） */
  private async generateShot(
    videoId: string,
    shot: ScriptShot,
    productName: string,
    cover?: string,
  ): Promise<{ index: number; localPath: string }> {
    const reference = shot.reference_image_url || cover;
    const prompt = this.buildShotPrompt(shot, productName);
    this.markShotTask(videoId, shot.index, { status: 'processing' });
    this.logger.log(`Video ${videoId} 分镜#${shot.index} 提交: ${prompt.slice(0, 100)}...`);

    const result = await this.volcano.generateVideo(prompt, reference);
    if (!result) {
      this.markShotTask(videoId, shot.index, { status: 'failed', error_msg: 'Seedance 未返回任务' });
      return { index: shot.index, localPath: '' };
    }
    this.markShotTask(videoId, shot.index, { seedance_task_id: result.taskId });
    const localPath = await this.waitForShot(videoId, shot.index, result.taskId);
    return { index: shot.index, localPath };
  }

  /** 轮询单个分镜的 Seedance 任务直至完成/失败/超时；成功则下载并返回本地路径 */
  private waitForShot(videoId: string, shotIndex: number, taskId: string): Promise<string> {
    return new Promise((resolve) => {
      let polls = 0;
      const interval = setInterval(async () => {
        if (++polls > MAX_SHOT_POLLS) {
          clearInterval(interval);
          this.markShotTask(videoId, shotIndex, { status: 'failed', error_msg: '生成超时' });
          resolve('');
          return;
        }
        const r = await this.volcano.getVideoTaskStatus(taskId);
        if (!r) return;
        if (r.status === 'succeeded' || r.status === 'completed' || r.status === 'done') {
          clearInterval(interval);
          const localPath = await this.downloadShot(videoId, shotIndex, r.videoUrl);
          if (localPath) {
            this.markShotTask(videoId, shotIndex, {
              status: 'completed',
              preview_url: `/api/videos/${videoId}/shots/${shotIndex}/file`,
            });
            resolve(localPath);
          } else {
            this.markShotTask(videoId, shotIndex, { status: 'failed', error_msg: '片段下载失败' });
            resolve('');
          }
        } else if (r.status === 'failed') {
          clearInterval(interval);
          this.markShotTask(videoId, shotIndex, { status: 'failed', error_msg: '分镜生成失败' });
          resolve('');
        }
      }, 5000);
    });
  }

  /** 下载单个分镜片段到 uploads/videos/{videoId}-shot-{index}.mp4，返回本地路径（失败为空串） */
  private async downloadShot(videoId: string, shotIndex: number, remoteUrl?: string): Promise<string> {
    if (!remoteUrl) return '';
    try {
      if (!existsSync(VIDEO_DIR)) mkdirSync(VIDEO_DIR, { recursive: true });
      const localPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}.mp4`);
      const res = await fetch(remoteUrl);
      if (!res.ok || !res.body) return '';
      const writer = createWriteStream(localPath);
      await pipeline(res.body as unknown as NodeJS.ReadableStream, writer);
      return localPath;
    } catch (err) {
      this.logger.error(`分镜#${shotIndex} 下载失败: ${(err as Error).message}`);
      return '';
    }
  }

  /** 用 ffmpeg 把多个分镜片段按顺序合成为成片 {videoId}.mp4，返回可播放 URL */
  private async composite(videoId: string, clipPaths: string[]): Promise<string> {
    const finalPath = join(VIDEO_DIR, `${videoId}.mp4`);
    const fileUrl = `/api/videos/${videoId}/file`;

    // 仅一个分镜：直接作为成片
    if (clipPaths.length === 1) {
      try { copyFileSync(clipPaths[0], finalPath); return fileUrl; }
      catch { return `/api/videos/${videoId}/shots/0/file`; }
    }

    // concat demuxer 需要列表文件（绝对路径）
    const listPath = join(VIDEO_DIR, `${videoId}-concat.txt`);
    writeFileSync(listPath, clipPaths.map((p) => `file '${p}'`).join('\n'));
    try {
      await this.runFfmpeg([
        '-y', '-f', 'concat', '-safe', '0', '-i', listPath,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',  // 保留并重编码各分镜音轨，避免成片静音
        '-movflags', '+faststart',
        finalPath,
      ]);
      return fileUrl;
    } catch (err) {
      this.logger.error(`ffmpeg 合成失败: ${(err as Error).message}，回退到首个分镜`);
      return `/api/videos/${videoId}/shots/0/file`;
    }
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', args);
      let stderr = '';
      ff.stderr?.on('data', (d) => { stderr += d.toString(); });
      ff.on('error', reject);
      ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`))));
    });
  }

  /** 把分镜生成进度/结果写回对应的分镜 task（供 GET /api/videos/:id/shots 与分镜编辑器） */
  private markShotTask(
    videoId: string,
    shotIndex: number,
    patch: {
      status?: 'queued' | 'processing' | 'retrying' | 'completed' | 'failed';
      preview_url?: string | null;
      thumbnail_url?: string | null;
      error_msg?: string | null;
      seedance_task_id?: string;
    },
  ) {
    const task = this.store.getVideoTasks(videoId).find((t) => t.shot_index === shotIndex);
    if (task) this.store.updateVideoTask(task.id, patch);
  }

  /**
   * 取某视频的全部分镜（真实 task 状态 + 各分镜视频 URL + 剧本内容），供分镜编辑器使用。
   * 与 getStatus 不同：这里的 status/preview_url 是分镜的真实状态，不做时间模拟。
   */
  getShots(videoId: string) {
    const video = this.store.getVideo(videoId);
    if (!video) {
      throw new NotFoundException('视频不存在');
    }
    const tasks = this.store.getVideoTasks(videoId).sort((a, b) => a.shot_index - b.shot_index);
    const script = video.script_id ? this.store.getScript(video.script_id) : undefined;
    return tasks.map((t) => {
      const shot = script?.storyboard.find((s) => s.index === t.shot_index);
      return {
        index: t.shot_index,
        status: t.status,
        description: shot?.description ?? '',
        duration: shot?.duration ?? 0,
        camera_motion: shot?.camera_motion ?? '',
        voiceover: shot?.voiceover ?? '',
        subtitle: shot?.subtitle ?? '',
        video_url: t.preview_url,
        thumbnail_url: t.thumbnail_url,
        reference_image_url: shot?.reference_image_url ?? null,
        error_msg: t.error_msg,
      };
    });
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
