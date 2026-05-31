import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { VolcanoApiService } from '../volcano/volcano-api.service';
import { MinioStorageService } from '../../common/minio-storage.service';
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
    console.log(`[VideoService] buildPromptAndSubmit START videoId=${videoId} shots=${(script?.storyboard as unknown[])?.length || 0} images=${imageUrls.length}`);
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    if (storyboard.length === 0) {
      console.log('[VideoService] No storyboard, marking failed');
      await this.videoRepo.update(videoId, { status: 'failed' });
      return;
    }
    // 参考图：公网 URL 直接透传；本地地址（localhost/内网，火山云端拉不到）才下载转 base64 内联
    const refImages = await this.prepareReferenceImages(imageUrls);
    console.log(`[VideoService] reference images prepared: ${imageUrls.length} -> ${refImages.length}`);
    try {
    const results: Array<{ index: number; localPath: string }> = [];
    for (const s of storyboard) {
      console.log(`[VideoService] Generating shot ${s.index}...`);
      const r = await this.generateShot(videoId, s, productName, refImages);
      results.push(r);
      console.log(`[VideoService] Shot ${s.index} result: ${r.localPath ? 'OK' : 'FAIL'}`);
    }
    const clips = results.filter((r) => r.localPath).sort((a, b) => a.index - b.index).map((r) => r.localPath);
    if (clips.length === 0) {
      await this.videoRepo.update(videoId, { status: 'failed' });
      return;
    }
    const finalUrl = await this.composite(videoId, clips);
    console.log(`[VideoService] Video ${videoId} completed: ${finalUrl}`);
    await this.videoRepo.update(videoId, { status: 'completed', videoUrl: finalUrl });
    } catch (err) {
      console.error(`[VideoService] buildPromptAndSubmit FAILED: ${(err as Error).message}`, (err as Error).stack);
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

  private buildShotPrompt(shot: ScriptShot, productName: string): string {
    return `为TikTok电商带货生成一个约${shot.duration || 3}秒的竖屏短视频分镜（9:16比例）。商品：${productName}。画面内容：${shot.description}。${shot.voiceover ? `口播：${shot.voiceover}。` : ''}${shot.subtitle ? `字幕：${shot.subtitle}。` : ''}${shot.camera_motion ? `运镜：${shot.camera_motion}。` : ''}要求：画面精美、节奏紧凑、适合社交媒体传播。`;
  }

  private async generateShot(videoId: string, shot: ScriptShot, productName: string, imageUrls: string[]) {
    const index = shot.index;
    const prompt = this.buildShotPrompt(shot, productName);
    // 更新已有的 task 状态为 processing
    await this.taskRepo.update({ videoId, shotIndex: index }, { status: 'processing' });
    this.logger.log(`Video ${videoId} shot#${index}: submitting to Seedance...`);
    const result = await this.volcano.generateVideo(prompt, imageUrls);
    if (!result) {
      await this.taskRepo.update({ videoId, shotIndex: index }, { status: 'failed', errorMsg: 'Seedance 未返回任务' });
      return { index, localPath: '' };
    }
    await this.taskRepo.update({ videoId, shotIndex: index }, { seedanceTaskId: result.taskId });
    const localPath = await this.waitForShot(videoId, index, result.taskId);
    return { index, localPath };
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
            await this.taskRepo.update({ videoId, shotIndex }, { status: 'completed', previewUrl: `/api/videos/${videoId}/shots/${shotIndex}/file` });
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
