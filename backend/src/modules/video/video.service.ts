import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { VolcanoApiService, TTSResult } from '../volcano/volcano-api.service';
import { MinioStorageService } from '../../common/minio-storage.service';
import { wordsToASS, getTTSDuration } from '../../common/subtitle';
import { Video } from '../../database/entities/video.entity';
import { VideoTask } from '../../database/entities/video-task.entity';
import { Project } from '../../database/entities/project.entity';
import { Script } from '../../database/entities/script.entity';
import { Material } from '../../database/entities/material.entity';

const VIDEO_DIR = join(process.cwd(), '..', 'uploads', 'videos');
const MAX_SHOT_POLLS = 120;

type ScriptShot = {
  index: number; description: string; camera_motion: string; duration: number;
  voiceover: string; subtitle: string; reference_image_url: string | null;
};

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly volcano: VolcanoApiService,
    private readonly minio: MinioStorageService,
    @InjectRepository(Video) private readonly videoRepo: Repository<Video>,
    @InjectRepository(VideoTask) private readonly taskRepo: Repository<VideoTask>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Script) private readonly scriptRepo: Repository<Script>,
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
  ) {}

  /** GET /api/videos?project_id=xxx */
  async getLatestByProject(projectId: string, userId: string) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.userId !== userId) throw new ForbiddenException('无权访问该项目');
    const video = await this.videoRepo.findOne({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
    if (!video) return null;
    return {
      id: video.id, project_id: video.projectId, script_id: video.scriptId,
      video_url: video.videoUrl, status: video.status, trace_id: video.traceId,
      created_at: video.createdAt.toISOString(), updated_at: video.updatedAt.toISOString(),
    };
  }

  /** POST /api/videos/generate */
  async generate(projectId: string, scriptId: string) {
    let script = await this.scriptRepo.findOne({ where: { id: scriptId } });
    if (!script || !(script.storyboard as unknown[])?.length) {
      script = await this.scriptRepo.findOne({ where: { projectId }, order: { createdAt: 'DESC' } }) as Script;
      if (script) scriptId = script.id;
    }
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    const productInfo = (project?.productInfo || {}) as Record<string, unknown>;
    const productName = (productInfo.name as string) || '商品';

    // 获取项目的所有 ready 素材图片作为参考图
    const materials = await this.materialRepo.find({ where: { projectId, status: 'ready' } });
    const imageUrls = materials.map((m) => m.thumbnailUrl).filter(Boolean) as string[];

    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    const taskCount = storyboard.length;

    const video = this.videoRepo.create({
      projectId, scriptId,
      status: 'processing',
      traceId: `vid-${Date.now()}`,
    } as Video);
    // 临时存储 taskCount 供 status 查询
    (video as any)._taskCount = taskCount;
    const saved = await this.videoRepo.save(video);

    // 立即为每个分镜创建 task 记录（queued），前端轮询时可看到进度
    for (const shot of storyboard) {
      const task = this.taskRepo.create({ videoId: saved.id, shotIndex: shot.index, status: 'queued' });
      await this.taskRepo.save(task);
    }

    this.buildPromptAndSubmit(saved.id, script, productName, imageUrls);
    return { id: saved.id, video_id: saved.id, trace_id: saved.traceId, task_count: taskCount, total_shots: taskCount, status: saved.status };
  }

  /** GET /api/videos/:id/status */
  async getStatus(id: string) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');

    const tasks = await this.taskRepo.find({ where: { videoId: id }, order: { shotIndex: 'ASC' } });
    const script = v.scriptId ? await this.scriptRepo.findOne({ where: { id: v.scriptId } }) : null;
    const storyboard = (script?.storyboard as ScriptShot[]) || [];

    const shots = tasks.map((t) => {
      const shot = storyboard.find((s) => s.index === t.shotIndex);
      const shotProgress = t.status === 'completed' ? 100 : t.status === 'processing' ? 50 : t.status === 'failed' ? 0 : 0;
      return {
        index: t.shotIndex,
        label: `Scene ${String(t.shotIndex + 1).padStart(2, '0')}`,
        status: t.status,
        progress: shotProgress,
        thumb_url: t.previewUrl || `https://placehold.co/200x200/E2E8F0/94A3B8?text=Scene+${t.shotIndex + 1}`,
        description: shot?.description ?? '',
        camera_motion: shot?.camera_motion ?? '',
        voiceover: shot?.voiceover ?? '',
        subtitle: shot?.subtitle ?? '',
        error_msg: t.errorMsg,
      };
    });

    // 如果没有分镜任务但剧本有分镜，用剧本生成初始分镜列表
    if (shots.length === 0 && storyboard.length > 0) {
      storyboard.forEach((s) => {
        shots.push({
          index: s.index,
          label: `Scene ${String(s.index + 1).padStart(2, '0')}`,
          status: 'queued',
          progress: 0,
          thumb_url: `https://placehold.co/200x200/E2E8F0/94A3B8?text=Scene+${s.index + 1}`,
          description: s.description,
          camera_motion: s.camera_motion,
          voiceover: s.voiceover || '',
          subtitle: s.subtitle || '',
          error_msg: null as unknown as string,
        });
      });
    }

    const completedShots = shots.filter((s) => s.status === 'completed').length;
    const totalShots = shots.length || (v as any)._taskCount || 0;
    const progress = totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : v.status === 'completed' ? 100 : 0;

    return {
      id: v.id,
      project_id: v.projectId,
      script_id: v.scriptId,
      render_id: v.traceId,
      status: v.status,
      progress,
      estimated_remaining: totalShots - completedShots > 0 ? (totalShots - completedShots) * 15 : 0,
      completed_shots: completedShots,
      total_shots: totalShots,
      resolution: '1080x1920',
      quality: 'HD',
      ratio: '9:16',
      video_url: v.videoUrl,
      title: (script?.content as string)?.slice(0, 50) || 'AI 正在生成视频',
      shots,
      created_at: v.createdAt.toISOString(),
    };
  }

  /** GET /api/videos/:id/shots */
  async getShots(videoId: string) {
    const video = await this.videoRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('视频不存在');
    const tasks = await this.taskRepo.find({ where: { videoId }, order: { shotIndex: 'ASC' } });
    const script = video.scriptId ? await this.scriptRepo.findOne({ where: { id: video.scriptId } }) : null;
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    return tasks.map((t) => {
      const shot = storyboard.find((s) => s.index === t.shotIndex);
      return {
        index: t.shotIndex, status: t.status,
        description: shot?.description ?? '', duration: shot?.duration ?? 0,
        camera_motion: shot?.camera_motion ?? '', voiceover: shot?.voiceover ?? '',
        subtitle: shot?.subtitle ?? '', video_url: t.previewUrl,
        reference_image_url: shot?.reference_image_url ?? null, error_msg: t.errorMsg,
      };
    });
  }

  async regenerateShot(id: string, index: number, _newPrompt?: string) {
    return { video_id: id, shot_index: index };
  }

  async updateSettings(id: string, _body: unknown) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');
    return { id, updated: true };
  }

  async getDownload(id: string) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');
    return { id: v.id, video_url: v.videoUrl, status: v.status };
  }

  async export(id: string, aspectRatio: string, resolution: string) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');
    return { id: v.id, aspect_ratio: aspectRatio, resolution };
  }

  // ---- private: video generation (Seedance + ffmpeg) ----

  private async buildPromptAndSubmit(videoId: string, script: Script | null, productName: string, imageUrls: string[]) {
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    if (storyboard.length === 0) {
      await this.videoRepo.update(videoId, { status: 'failed' });
      return;
    }

    const refImages = await this.prepareReferenceImages(imageUrls);
    const useTTS = this.volcano.isTTSConfigured();

    try {
      // 阶段 1：并行 TTS（所有分镜同时跑）
      const ttsResults = new Map<number, TTSResult | null>();
      if (useTTS) {
        this.logger.log(`[TTS] Starting parallel TTS for ${storyboard.length} shots`);
        const ttsPromises = storyboard.map(async (s) => {
          const result = await this.volcano.synthesizeSpeech(s.voiceover || s.description || '');
          return { index: s.index, result };
        });
        const ttsAll = await Promise.all(ttsPromises);
        for (const { index, result } of ttsAll) {
          ttsResults.set(index, result);
        }
        this.logger.log(`[TTS] Completed: ${[...ttsResults.values()].filter(Boolean).length}/${storyboard.length}`);
      }

      // 阶段 2：顺序 Seedance + 逐镜合成
      const compositedClips: string[] = [];
      for (const shot of storyboard) {
        const tts = ttsResults.get(shot.index) || null;
        const targetDuration = tts ? getTTSDuration(tts) : (shot.duration || 3);

        // 生成 Seedance 视频
        await this.taskRepo.update({ videoId, shotIndex: shot.index }, { status: 'processing' });
        const shotPath = await this.generateShot(videoId, shot, productName, refImages, targetDuration);

        // 合成：画面 + TTS 音频 + 字幕
        if (shotPath) {
          const composited = await this.compositeShot(videoId, shot.index, shotPath, tts);
          if (composited) {
            compositedClips.push(composited);
            await this.taskRepo.update({ videoId, shotIndex: shot.index }, { status: 'completed', previewUrl: `/api/videos/${videoId}/shots/${shot.index}/file` });
          } else {
            compositedClips.push(shotPath); // 合成失败用原始片段
          }
        }
      }

      if (compositedClips.length === 0) {
        await this.videoRepo.update(videoId, { status: 'failed' });
        return;
      }

      // 阶段 3：拼接所有已合成片段
      const finalUrl = await this.composite(videoId, compositedClips);
      await this.videoRepo.update(videoId, { status: 'completed', videoUrl: finalUrl });
      this.logger.log(`Video ${videoId} completed: ${finalUrl}`);
    } catch (err) {
      this.logger.error(`buildPromptAndSubmit FAILED: ${(err as Error).message}`, (err as Error).stack);
      await this.videoRepo.update(videoId, { status: 'failed' });
    }
  }

  /**
   * 准备传给 Seedance 的参考图。
   * Seedance 在云端按 URL 下载参考图：
   *  - 公网可达的 URL（上线后 MinIO/CDN 为公网域名）→ 直接透传，云端自行下载，最高效；
   *  - 本地 / 内网地址（http://localhost:9000/... 等，云端拉不到，报 "resource download failed"）
   *    → 从 MinIO 取回字节内联成 base64 data URI，绕开公网可达性要求。
   * 下载失败的图片直接跳过（不阻断生成）。
   */
  private async prepareReferenceImages(imageUrls: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const url of imageUrls) {
      if (!url || url.includes('placehold.co')) continue;
      if (url.startsWith('data:')) { out.push(url); continue; }

      let host = '';
      try { host = new URL(url).hostname; } catch { /* 非标准 URL，按本地处理 */ }

      // 公网地址：直接透传
      if (host && !this.isLocalHost(host)) { out.push(url); continue; }

      // 本地 / 内网地址：下载后内联
      try {
        const buf = await this.minio.downloadFile(url);
        if (!buf?.length) continue;
        const lower = url.toLowerCase();
        const mime = lower.endsWith('.png') ? 'image/png'
          : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
        out.push(`data:${mime};base64,${buf.toString('base64')}`);
      } catch (err) {
        this.logger.warn(`参考图下载失败，跳过：${url} — ${(err as Error).message}`);
      }
    }
    return out;
  }

  /** 判断 host 是否为本地 / 内网地址（火山云端无法访问，需改为内联传图） */
  private isLocalHost(host: string): boolean {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  }

  private buildShotPrompt(shot: ScriptShot, productName: string, targetDuration?: number): string {
    const duration = targetDuration || shot.duration || 3;
    return `为TikTok电商带货生成一个约${duration.toFixed(1)}秒的竖屏短视频分镜（9:16比例）。商品：${productName}。画面内容：${shot.description}。${shot.camera_motion ? `运镜：${shot.camera_motion}。` : ''}要求：画面精美、节奏紧凑、无字幕无水印、适合社交媒体传播。`;
  }

  private async generateShot(videoId: string, shot: ScriptShot, productName: string, imageUrls: string[], targetDuration?: number) {
    const index = shot.index;
    const prompt = this.buildShotPrompt(shot, productName, targetDuration);
    this.logger.log(`Video ${videoId} shot#${index}: submitting to Seedance (duration=${(targetDuration || shot.duration).toFixed(1)}s)...`);
    const result = await this.volcano.generateVideo(prompt, imageUrls);
    if (!result) {
      await this.taskRepo.update({ videoId, shotIndex: index }, { status: 'failed', errorMsg: 'Seedance 未返回任务' });
      return '';
    }
    await this.taskRepo.update({ videoId, shotIndex: index }, { seedanceTaskId: result.taskId });
    const localPath = await this.waitForShot(videoId, index, result.taskId);
    return localPath;
  }

  private waitForShot(videoId: string, shotIndex: number, taskId: string): Promise<string> {
    return new Promise((resolve) => {
      let polls = 0;
      const interval = setInterval(async () => {
        if (++polls > MAX_SHOT_POLLS) {
          clearInterval(interval);
          await this.taskRepo.update({ videoId, shotIndex }, { status: 'failed', errorMsg: '生成超时' });
          resolve('');
          return;
        }
        const r = await this.volcano.getVideoTaskStatus(taskId);
        if (!r) return;
        if (r.status === 'succeeded' || r.status === 'completed' || r.status === 'done') {
          clearInterval(interval);
          const localPath = await this.downloadShot(videoId, shotIndex, r.videoUrl);
          if (localPath) {
            await this.taskRepo.update({ videoId, shotIndex }, { previewUrl: `/api/videos/${videoId}/shots/${shotIndex}/file` });
          } else {
            await this.taskRepo.update({ videoId, shotIndex }, { status: 'failed', errorMsg: '片段下载失败' });
          }
          resolve(localPath || '');
        } else if (r.status === 'failed') {
          clearInterval(interval);
          await this.taskRepo.update({ videoId, shotIndex }, { status: 'failed', errorMsg: '分镜生成失败' });
          resolve('');
        }
      }, 5000);
    });
  }

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
    } catch {
      return '';
    }
  }

  /** 单个分镜合成：Seedance 画面 + TTS 音频 + ASS 字幕 */
  private async compositeShot(videoId: string, shotIndex: number, videoPath: string, tts: TTSResult | null): Promise<string | null> {
    const outPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-composited.mp4`);
    const tempFiles: string[] = [];

    try {
      // 没有 TTS → 直接返回原始视频
      if (!tts) return videoPath;

      // 下载 TTS 音频到临时文件（TTS 返回的是临时 HTTP URL）
      const audioPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-audio.mp3`);
      const ttsRes = await fetch(tts.audioUrl);
      if (!ttsRes.ok) {
        this.logger.warn(`TTS audio download failed: ${ttsRes.status}`);
        return videoPath;
      }
      const ttsBuf = Buffer.from(await ttsRes.arrayBuffer());
      writeFileSync(audioPath, ttsBuf);
      tempFiles.push(audioPath);

      // 生成 ASS 字幕文件
      const assPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-sub.ass`);
      const assContent = wordsToASS(tts);
      writeFileSync(assPath, assContent, 'utf-8');
      tempFiles.push(assPath);

      // ffmpeg: 画面 + TTS 音轨 + 字幕烧录
      const filters = [`fps=30`, `ass=${assPath.replace(/\\/g, '/')}`];
      const padSec = 0.5; // 最多补 0.5s 尾帧
      if (padSec > 0) {
        filters.push(`tpad=stop_mode=clone:stop_duration=${padSec}`);
      }

      await new Promise<void>((resolve, reject) => {
        const args = [
          '-y',
          '-i', videoPath,
          '-i', audioPath,
          '-vf', filters.join(','),
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', '128k',
          '-map', '0:v:0', '-map', '1:a:0',
          '-shortest',
          '-movflags', '+faststart',
          outPath,
        ];
        const ff = spawn('ffmpeg', args);
        let stderr = '';
        ff.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-200)}`));
        });
      });

      return outPath;
    } catch (err) {
      this.logger.warn(`compositeShot #${shotIndex} failed: ${(err as Error).message}, using raw clip`);
      return videoPath;
    } finally {
      for (const f of tempFiles) {
        try { unlinkSync(f); } catch { /* ignore */ }
      }
    }
  }

  private async composite(videoId: string, clipPaths: string[]): Promise<string> {
    const finalPath = join(VIDEO_DIR, `${videoId}.mp4`);
    const fileUrl = `/api/videos/${videoId}/file`;
    if (clipPaths.length === 1) {
      try { copyFileSync(clipPaths[0], finalPath); return fileUrl; } catch { return `/api/videos/${videoId}/shots/0/file`; }
    }
    const listPath = join(VIDEO_DIR, `${videoId}-concat.txt`);
    writeFileSync(listPath, clipPaths.map((p) => `file '${p}'`).join('\n'));
    try {
      await new Promise<void>((resolve, reject) => {
        const ff = spawn('ffmpeg', ['-y','-f','concat','-safe','0','-i',listPath,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',finalPath]);
        let stderr = '';
        ff.stderr?.on('data', (d) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-300)}`))));
      });
      return fileUrl;
    } catch { return `/api/videos/${videoId}/shots/0/file`; }
  }
}
