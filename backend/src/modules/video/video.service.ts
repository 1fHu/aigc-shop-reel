import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, writeFileSync, unlinkSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
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
import { promoteProjectStatus } from '../../common/project-status';
import { FFMPEG_PATH } from '../../common/ffmpeg-path';

const VIDEO_DIR = join(process.cwd(), '..', 'uploads', 'videos');
const MAX_SHOT_POLLS = 240;
const MAX_SHOT_RETRIES = 2;
// Seedance 1.5 Pro 视频时长生成范围 [4,12]s；意图时长 <4s 时由 trimClipInPlace 裁回。
const SEEDANCE_MIN_DURATION = 4;

/** TTS 字级时间戳 → SRT 字幕（按句子边界 + 自然断点分组） */
function ttsWordsToSRT(tts: TTSResult): string {
  const allRaw = tts.sentences.flatMap((s) => s.words);
  const maxEnd = allRaw.length ? Math.max(...allRaw.map((w) => w.endTime)) : 0;
  const timeScale = maxEnd > 300 ? 0.001 : 1;

  const PUNCT_RE = /[，。！？、,\.!\?\s]/;
  // 自然断点字符：这些字后面换行看起来比较自然
  const BREAK_CHARS = /[的了在是和这对把被让到与跟向从/，。！？、,\.!\?\s]/;

  const groups: Array<{ text: string; start: number; end: number }> = [];
  const MAX_LINE = 12;  // 一行最多 12 字
  const MIN_LINE = 6;   // 换成多行时，每行不少于 6 字

  for (const sentence of tts.sentences) {
    const words = sentence.words
      .map((w) => ({
        word: w.word,
        startTime: w.startTime * timeScale,
        endTime: w.endTime * timeScale,
      }))
      .filter((w) => w.endTime > w.startTime);

    if (!words.length) continue;

    // 先按标点粗切
    const segments: Array<typeof words> = [];
    let buf: typeof words = [];
    for (const w of words) {
      if (PUNCT_RE.test(w.word)) {
        if (buf.length) { segments.push(buf); buf = []; }
        continue;
      }
      buf.push(w);
    }
    if (buf.length) segments.push(buf);

    // 每个段如果太长再切
    for (const seg of segments) {
      const total = seg.length;
      if (total <= MAX_LINE) {
        groups.push({ text: seg.map((w) => w.word).join(''), start: seg[0].startTime, end: seg[seg.length - 1].endTime });
        continue;
      }

      // 长段：找自然断点切成两行
      const half = Math.floor(total / 2);
      let splitAt = half;
      // 在 half±3 范围内找自然断点字符
      for (let d = 0; d <= 3; d++) {
        const candidates = [half - d, half + d].filter((p) => p > MIN_LINE && p < total - MIN_LINE);
        const found = candidates.find((p) => BREAK_CHARS.test(seg[p]?.word || ''));
        if (found !== undefined) { splitAt = found; break; }
      }

      const first = seg.slice(0, splitAt);
      const second = seg.slice(splitAt);
      if (first.length) {
        groups.push({ text: first.map((w) => w.word).join(''), start: first[0].startTime, end: first[first.length - 1].endTime });
      }
      if (second.length) {
        groups.push({ text: second.map((w) => w.word).join(''), start: second[0].startTime, end: second[second.length - 1].endTime });
      }
    }
  }

  if (!groups.length && tts.text) {
    const text = tts.text.trim();
    const duration = Math.max((tts.duration || 3) * timeScale, 0.8);
    const chars = Array.from(text).filter((c) => !PUNCT_RE.test(c) && !/\s/.test(c));
    if (chars.length > 0) {
      const perChar = duration / chars.length;
      let idx = 0;
      const fallback: Array<{ word: string; startTime: number; endTime: number }> = [];
      for (const ch of text) {
        if (/\s/.test(ch) || PUNCT_RE.test(ch)) continue;
        const start = idx * perChar;
        const end = (idx + 1) * perChar;
        fallback.push({ word: ch, startTime: start, endTime: end });
        idx += 1;
      }
      if (fallback.length) {
        groups.push({ text: fallback.map((w) => w.word).join(''), start: fallback[0].startTime, end: fallback[fallback.length - 1].endTime });
      }
    }
  }

  if (!groups.length) return '';

  // 相邻字幕组之间保持间隙，双向避让避免播放器渲染残留
  const MIN_GAP = 0.16;
  const finalGroups: Array<{ text: string; start: number; end: number }> = [];
  for (const g of groups) {
    const prev = finalGroups[finalGroups.length - 1];
    if (prev) {
      // 前一条往前收紧，但不能短于自身 start + MIN_GAP
      prev.end = Math.max(prev.start + MIN_GAP, Math.min(prev.end, g.start - MIN_GAP));
    }
    const start = prev ? Math.max(g.start, prev.end + MIN_GAP) : g.start;
    const end = Math.max(g.end, start + MIN_GAP);
    finalGroups.push({ ...g, start, end });
  }

  return finalGroups.map((g, i) => {
    const ss = (t: number) => {
      const safe = Math.max(t, 0);
      const hh = Math.floor(safe / 3600);
      const mm = Math.floor((safe % 3600) / 60);
      const sec = Math.floor(safe % 60);
      const ms = Math.floor((safe % 1) * 1000);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };
    return `${i + 1}\n${ss(g.start)} --> ${ss(g.end)}\n${g.text}\n`;
  }).join('\n');
}

type ScriptShot = {
  index: number; description: string; camera_motion: string; duration: number;
  voiceover: string; subtitle: string; reference_image_url: string | null;
  // 剧本阶段向量召回写入的素材绑定（可选，老剧本无此字段）
  material_id?: string | null;
  material_use_mode?: 'none' | 'direct' | 'adapted';
  adapted_image_url?: string | null;
};

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  /** ffmpeg 是否带 libass（subtitles 滤镜）。null=未检测，检测一次后缓存 */
  private subtitlesSupported: boolean | null = null;

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
      // 本次视频所用字幕/配音设置，前端回填面板用
      settings: video.settings || null,
      created_at: video.createdAt.toISOString(), updated_at: video.updatedAt.toISOString(),
    };
  }

  /** POST /api/videos/generate */
  async generate(projectId: string, scriptId: string, opts?: { voice_id?: string; subtitle_enabled?: boolean; subtitle_style?: { font_size?: number; outline?: number; color?: string; font_family?: string }; custom_requirement?: string }) {
    let script = await this.scriptRepo.findOne({ where: { id: scriptId } });
    if (!script || !(script.storyboard as unknown[])?.length) {
      script = await this.scriptRepo.findOne({ where: { projectId }, order: { createdAt: 'DESC' } }) as Script;
      if (script) scriptId = script.id;
    }
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    const productInfo = (project?.productInfo || {}) as Record<string, unknown>;
    const productName = (productInfo.name as string) || '商品';

    // 获取项目的所有 ready 素材作为参考图 + 构建素材库描述
    const materials = await this.materialRepo.find({ where: { projectId, status: 'ready' } });
    const imageUrls = materials.map((m) => m.thumbnailUrl).filter(Boolean) as string[];
    const materialContext = materials.length > 0
      ? materials.map((m) => {
          const analysis = (m.analysis || {}) as Record<string, unknown>;
          const desc = (analysis.description as string) || m.fileName || '';
          const category = (analysis.category as string) || m.fileType || '';
          const tags = (m.tags || []).slice(0, 5).join('、');
          return `[${category}] ${desc}${tags ? ` (标签: ${tags})` : ''}`;
        }).join('\n')
      : '';

    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    const normalizedStoryboard = storyboard.map((shot, idx) => ({
      ...shot,
      index: Number.isFinite(shot.index) ? shot.index : idx,
    }));
    const taskCount = normalizedStoryboard.length;

    const video = this.videoRepo.create({
      projectId, scriptId,
      status: 'processing',
      traceId: `vid-${Date.now()}`,
      // 持久化本次生成所用的全部字幕/配音设置，供「返回分镜编辑页」按项目回填面板
      settings: {
        tts: { voice: opts?.voice_id || 'zh_female_qingxin' },
        voice_id: opts?.voice_id || null,
        subtitle_enabled: opts?.subtitle_enabled !== false,
        subtitle_style: opts?.subtitle_style || {},
        custom_requirement: opts?.custom_requirement || '',
      },
    });
    // 临时存储 taskCount 供 status 查询
    (video as any)._taskCount = taskCount;
    const saved = await this.videoRepo.save(video);
    
    await this.projectRepo.increment({ id: projectId }, 'videoCount', 1);
    await this.projectRepo.update(projectId, {
      status: promoteProjectStatus(project?.status || 'video_pending', 'video_pending'),
    });

    // 立即为每个分镜创建 task 记录（queued），前端轮询时可看到进度
    for (const shot of normalizedStoryboard) {
      const task = this.taskRepo.create({ videoId: saved.id, shotIndex: shot.index, status: 'queued' });
      await this.taskRepo.save(task);
    }

    this.buildPromptAndSubmit(saved.id, projectId, script, productName, productInfo, imageUrls, materialContext, opts)
      .catch((err) => this.logger.error(`generate async pipeline failed: ${(err as Error).message}`));
    return { id: saved.id, video_id: saved.id, trace_id: saved.traceId, task_count: taskCount, total_shots: taskCount, status: saved.status };
  }

  /** 根据已耗时和已完成镜数动态估算剩余秒数 */
  private calcEstimate(startedAt: Date | null, completedShots: number, totalShots: number): number {
    const remaining = totalShots - completedShots;
    if (remaining <= 0) return 0;
    const elapsed = (Date.now() - new Date(startedAt || Date.now()).getTime()) / 1000;
    if (completedShots > 0) {
      const avgPerShot = elapsed / completedShots;
      return Math.round(avgPerShot * remaining);
    }
    // 还没有完成的镜数时用保守预估（120s/镜，含 API 生成 + 轮询等待）
    return remaining * 120;
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
      estimated_remaining: this.calcEstimate(v.createdAt, completedShots, totalShots),
      completed_shots: completedShots,
      total_shots: totalShots,
      resolution: '1080x1920',
      quality: 'HD',
      ratio: '9:16',
      video_url: v.videoUrl,
      // title 仅作「视频/项目名」用途，不要塞状态文案——否则成片完成后标题仍显示「正在生成」。
      // 无剧本内容时留空，由前端按当前状态回显合适文案（生成中/已完成）。
      title: (script?.content as string)?.slice(0, 50) || undefined,
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

  async regenerateShot(id: string, index: number, newPrompt?: string, keepFrames = false) {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('视频不存在');

    const script = video.scriptId ? await this.scriptRepo.findOne({ where: { id: video.scriptId } }) : null;
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    const shot = storyboard.find((s) => s.index === index);
    if (!shot) throw new NotFoundException('分镜不存在');

    const project = await this.projectRepo.findOne({ where: { id: video.projectId } });
    const productInfo = (project?.productInfo || {}) as Record<string, unknown>;
    const productName = (productInfo.name as string) || '商品';

    const materials = await this.materialRepo.find({ where: { projectId: video.projectId, status: 'ready' } });
    const imageUrls = materials.map((m) => m.thumbnailUrl).filter(Boolean) as string[];
    const materialContext = materials.length > 0
      ? materials.map((m) => {
          const a = (m.analysis || {}) as Record<string, unknown>;
          const desc = (a.description as string) || m.fileName || '';
          const tags = (m.tags || []).slice(0, 5).join('、');
          return `[${m.fileType}] ${desc}${tags ? ` (标签: ${tags})` : ''}`;
        }).join('\n')
      : '';

    const prevShot = storyboard.find((s) => s.index === index - 1);

    // 仅当用户勾选保留首尾帧时，用「该片段自己原来的首帧+尾帧」约束新片段开头/结尾，
    // 使其与原片一致 → 无缝替换、与前后邻居衔接（i2v 首尾帧，1.5 端点即支持）。
    const frameControl = keepFrames ? await this.extractOwnFrames(id, index) : {};

    // 标记为 processing
    await this.taskRepo.update({ videoId: id, shotIndex: index }, { status: 'processing' });

    const refs = await this.prepareReferenceImages(imageUrls);
    const customReq = (video.settings as any)?.custom_requirement || '';
    const prompt = newPrompt || this.buildShotPrompt(shot, productName, productInfo, materialContext, shot.duration || 3, prevShot, customReq);

    this.logger.log(`Regenerate shot#${index}: keepFrames=${keepFrames} startFrame=${!!frameControl.startImage} endFrame=${!!frameControl.endImage} refs=${refs.length}`);

    const path = await this.generateShot(id, shot, productName, productInfo, refs, materialContext, shot.duration || 3, undefined, prevShot, customReq, frameControl);

    if (path) {
      const tts = this.volcano.isTTSConfigured()
        ? await this.volcano.synthesizeSpeech(shot.voiceover || shot.description || '')
        : null;
      const targetDuration = tts ? getTTSDuration(tts) : (shot.duration || 3);
      const savedStyle = ((video.settings as any)?.subtitle_style || {}) as { font_size?: number; outline?: number; color?: string; font_family?: string };
      const composited = await this.compositeShot(id, index, path, tts, savedStyle, targetDuration);
      const finalPath = composited || path;
      await this.taskRepo.update({ videoId: id, shotIndex: index }, {
        status: 'completed',
        previewUrl: `/api/videos/${id}/shots/${index}/file`,
      });
      return { video_id: id, shot_index: index, status: 'completed', path: finalPath };
    }

    await this.taskRepo.update({ videoId: id, shotIndex: index }, { status: 'failed', errorMsg: '分镜生成失败' });
    throw new InternalServerErrorException('分镜生成失败');
  }

  /** POST /api/videos/:id/finalize — 用已有分镜文件重新合成最终视频 */
  async finalize(id: string) {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('视频不存在');

    const script = video.scriptId ? await this.scriptRepo.findOne({ where: { id: video.scriptId } }) : null;
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    if (!storyboard.length) throw new BadRequestException('无分镜数据');

    const clips: string[] = [];
    for (const shot of storyboard) {
      const composited = join(VIDEO_DIR, `${id}-shot-${shot.index}-composited.mp4`);
      const raw = join(VIDEO_DIR, `${id}-shot-${shot.index}.mp4`);
      if (existsSync(composited)) {
        clips.push(composited);
      } else if (existsSync(raw)) {
        clips.push(raw);
      }
    }

    if (!clips.length) throw new BadRequestException('没有可用的分镜文件');

    const finalUrl = await this.composite(id, clips);
    await this.videoRepo.update(id, { status: 'completed', videoUrl: finalUrl });
    await this.projectRepo.update(video.projectId, { status: 'finished' });
    return { id, status: 'completed', video_url: finalUrl };
  }

  /** POST /api/videos/:id/regenerate-shots — 后台异步重新生成选中分镜，保留未选中的，最终合成 */
  async regenerateShots(
    id: string,
    shotIndices: number[],
    keepFrames = false,
    settingsOverride?: { voice_id?: string; subtitle_enabled?: boolean; subtitle_style?: { font_size?: number; outline?: number; color?: string; font_family?: string }; custom_requirement?: string },
  ) {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('视频不存在');
    if (video.status !== 'completed' && video.status !== 'failed') {
      throw new BadRequestException('仅已完成或失败的任务可重新生成');
    }

    // 用前端当前选择覆盖该视频保存的字幕/配音设置，让重生分镜按最新设置烧字幕/配音
    // （否则 processRegenerateShots 仍读旧的 video.settings.subtitle_style，前端改了字号也不生效）
    if (settingsOverride) {
      const cur = (video.settings || {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...cur };
      if (settingsOverride.voice_id !== undefined) { merged.voice_id = settingsOverride.voice_id; merged.tts = { voice: settingsOverride.voice_id }; }
      if (settingsOverride.subtitle_enabled !== undefined) merged.subtitle_enabled = settingsOverride.subtitle_enabled;
      if (settingsOverride.subtitle_style !== undefined) merged.subtitle_style = settingsOverride.subtitle_style;
      if (settingsOverride.custom_requirement !== undefined) merged.custom_requirement = settingsOverride.custom_requirement;
      video.settings = merged; // 同步内存对象，processRegenerateShots 用的是这个引用
      await this.videoRepo.update(id, { settings: merged } as any);
    }

    const script = video.scriptId ? await this.scriptRepo.findOne({ where: { id: video.scriptId } }) : null;
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    const normalizedStoryboard = storyboard.map((shot, idx) => ({
      ...shot,
      index: Number.isFinite(shot.index) ? shot.index : idx,
    }));
    if (!normalizedStoryboard.length) throw new BadRequestException('无分镜数据');

    // 标记状态：选中的变 queued，未选中保持 completed
    const set = new Set(shotIndices);
    for (const shot of normalizedStoryboard) {
      if (set.has(shot.index)) {
        await this.taskRepo.update({ videoId: id, shotIndex: shot.index }, { status: 'queued', errorMsg: null as unknown as string });
      }
    }
    await this.videoRepo.update(id, { status: 'processing' });

    // 后台异步处理
    this.processRegenerateShots(id, normalizedStoryboard, set, video, keepFrames)
      .catch((err) => this.logger.error(`regenerateShots async pipeline failed: ${(err as Error).message}`));
    return { id, status: 'processing' };
  }

  private async processRegenerateShots(
    id: string,
    storyboard: ScriptShot[],
    selectedSet: Set<number>,
    video: Video,
    keepFrames = false,
  ) {
    const project = await this.projectRepo.findOne({ where: { id: video.projectId } });
    const productInfo = (project?.productInfo || {}) as Record<string, unknown>;
    const productName = (productInfo.name as string) || '商品';

    const materials = await this.materialRepo.find({ where: { projectId: video.projectId, status: 'ready' } });
    const imageUrls = materials.map((m) => m.thumbnailUrl).filter(Boolean) as string[];
    const materialContext = materials.length > 0
      ? materials.map((m) => {
          const a = (m.analysis || {}) as Record<string, unknown>;
          return `[${m.fileType}] ${(a.description as string) || m.fileName || ''}`;
        }).join('\n')
      : '';

    const refImages = await this.prepareReferenceImages(imageUrls);
    const useTTS = this.volcano.isTTSConfigured();
    const savedStyle = ((video.settings as any)?.subtitle_style || {}) as { font_size?: number; outline?: number; color?: string; font_family?: string };
    const customReq = (video.settings as any)?.custom_requirement || '';

    try {
      const orderedStoryboard = [...storyboard].sort((a, b) => a.index - b.index);
      const compositedClips: string[] = [];

      // 并行 TTS — 只给选中的分镜跑
      const ttsResults = new Map<number, TTSResult | null>();
      if (useTTS) {
        const selectedShots = orderedStoryboard.filter((s) => selectedSet.has(s.index));
        const ttsPromises = selectedShots.map(async (s) => {
          const result = await this.volcano.synthesizeSpeech(s.voiceover || s.description || '');
          return { index: s.index, result };
        });
        const ttsAll = await Promise.all(ttsPromises);
        for (const { index, result } of ttsAll) ttsResults.set(index, result);
      }

      for (let i = 0; i < orderedStoryboard.length; i += 1) {
        const shot = orderedStoryboard[i];
        const prevShot = i > 0 ? orderedStoryboard[i - 1] : null;

        if (selectedSet.has(shot.index)) {
          // 仅当用户勾选保留首尾帧时，用「该片段自己原来的首+尾帧」约束新片，
          // 须在 generateShot 覆盖原片文件之前提取。
          const frameControl = keepFrames ? await this.extractOwnFrames(id, shot.index) : {};

          await this.taskRepo.update({ videoId: id, shotIndex: shot.index }, { status: 'processing' });
          const tts = ttsResults.get(shot.index) || null;
          const targetDuration = tts ? getTTSDuration(tts) : (shot.duration || 3);
          const path = await this.generateShot(id, shot, productName, productInfo, refImages, materialContext, targetDuration, undefined, prevShot || undefined, customReq, frameControl);
          if (path) {
            const composited = await this.compositeShot(id, shot.index, path, tts, savedStyle, targetDuration);
            const finalPath = composited || path;
            await this.taskRepo.update({ videoId: id, shotIndex: shot.index }, { status: 'completed', previewUrl: `/api/videos/${id}/shots/${shot.index}/file` });
            compositedClips.push(finalPath);
          } else {
            await this.taskRepo.update({ videoId: id, shotIndex: shot.index }, { status: 'failed', errorMsg: '分镜生成失败' });
            compositedClips.push(join(VIDEO_DIR, `${id}-shot-${shot.index}.mp4`));
          }
        } else {
          // 复用已有分镜：直接用合成版，不做任何重新处理
          const existingComposited = join(VIDEO_DIR, `${id}-shot-${shot.index}-composited.mp4`);
          const existingRaw = join(VIDEO_DIR, `${id}-shot-${shot.index}.mp4`);
          if (existsSync(existingComposited)) {
            compositedClips.push(existingComposited);
          } else if (existsSync(existingRaw)) {
            compositedClips.push(existingRaw);
          }
        }
      }

      if (compositedClips.length === 0) {
        await this.videoRepo.update(id, { status: 'failed' });
        return;
      }

      const finalUrl = await this.composite(id, compositedClips);
      await this.videoRepo.update(id, { status: 'completed', videoUrl: finalUrl });
      this.logger.log(`RegenerateShots ${id} completed: ${finalUrl}`);
    } catch (err) {
      this.logger.error(`processRegenerateShots FAILED: ${(err as Error).message}`, (err as Error).stack);
      await this.videoRepo.update(id, { status: 'failed' });
    }
  }

  async updateSettings(id: string, body: { tts?: { language?: string; voice?: string }; bgm?: { preset_id?: string; custom_url?: string; volume?: number } }) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');
    if (body.tts || body.bgm) {
      await this.videoRepo.update(id, { settings: body } as any);
    }
    return { id, updated: true };
  }

  async getDownload(id: string) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');
    const filePath = join(VIDEO_DIR, `${v.id}.mp4`);
    const url = existsSync(filePath)
      ? `/api/videos/${v.id}/file`
      : `/api/videos/${v.id}/shots/0/file`;
    return { id: v.id, video_url: url, download_url: url, status: v.status };
  }

  async export(id: string, aspectRatio: string, resolution: string) {
    const v = await this.videoRepo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('视频不存在');
    const filePath = join(VIDEO_DIR, `${v.id}.mp4`);
    const url = existsSync(filePath)
      ? `/api/videos/${v.id}/file`
      : `/api/videos/${v.id}/shots/0/file`;
    return { id: v.id, video_url: url, download_url: url, aspect_ratio: aspectRatio, resolution, status: v.status };
  }

  async cancel(videoId: string) {
    const v = await this.videoRepo.findOne({ where: { id: videoId } });
    if (!v) throw new NotFoundException('视频不存在');
    // 更新状态为 failed
    await this.videoRepo.update(videoId, { status: 'failed' });
    await this.taskRepo.update({ videoId }, { status: 'failed', errorMsg: '用户取消' });
    // 清理已生成的文件
    try {
      const files = readdirSync(VIDEO_DIR);
      for (const f of files) {
        if (f.startsWith(videoId)) unlinkSync(join(VIDEO_DIR, f));
      }
    } catch { /* ignore */ }
    this.logger.log(`Video ${videoId} cancelled, files cleaned`);
    return { id: videoId, status: 'failed' };
  }

  // ---- private: video generation (Seedance + ffmpeg) ----

  private async buildPromptAndSubmit(videoId: string, projectId: string, script: Script | null, productName: string, productInfo: Record<string, unknown>, imageUrls: string[], materialContext: string, opts?: { voice_id?: string; subtitle_enabled?: boolean; subtitle_style?: { font_size?: number; outline?: number; color?: string; font_family?: string }; custom_requirement?: string }) {
    const storyboard = (script?.storyboard as ScriptShot[]) || [];
    const normalizedStoryboard = storyboard.map((shot, idx) => ({
      ...shot,
      index: Number.isFinite(shot.index) ? shot.index : idx,
    }));
    if (normalizedStoryboard.length === 0) {
      await this.videoRepo.update(videoId, { status: 'failed' });
      return;
    }

    const refImages = await this.prepareReferenceImages(imageUrls);
    const useTTS = this.volcano.isTTSConfigured();
    const subtitleEnabled = opts?.subtitle_enabled !== false; // 默认开启
    const voiceId = opts?.voice_id;

    try {
      // 阶段 1：并行 TTS（所有分镜同时跑）
      const ttsResults = new Map<number, TTSResult | null>();
      if (useTTS) {
        this.logger.log(`[TTS] Starting parallel TTS for ${normalizedStoryboard.length} shots, voice=${voiceId || 'default'}`);
        const ttsPromises = normalizedStoryboard.map(async (s) => {
          const result = await this.volcano.synthesizeSpeech(s.voiceover || s.description || '', voiceId);
          return { index: s.index, result };
        });
        const ttsAll = await Promise.all(ttsPromises);
        for (const { index, result } of ttsAll) {
          ttsResults.set(index, result);
        }
        this.logger.log(`[TTS] Completed: ${[...ttsResults.values()].filter(Boolean).length}/${normalizedStoryboard.length}`);
      }

      // 阶段 2：串行提交 Seedance 任务（上一镜头关键帧作为参考）
      const orderedStoryboard = [...normalizedStoryboard].sort((a, b) => a.index - b.index);
      this.logger.log(`[Seedance] Submitting ${orderedStoryboard.length} shots sequentially with keyframe reference`);

      const compositedClips: string[] = [];
      let prevKeyframe: string | null = null;

      for (let i = 0; i < orderedStoryboard.length; i += 1) {
        const shot = orderedStoryboard[i];
        const prevShot = i > 0 ? orderedStoryboard[i - 1] : null;
        await this.taskRepo.update({ videoId, shotIndex: shot.index }, { status: 'processing' });

        const tts = ttsResults.get(shot.index) || null;
        const targetDuration = tts ? getTTSDuration(tts) : (shot.duration || 3);

        // 剧本阶段向量召回绑定的素材 → 本幕首帧(first_frame / i2v，不受 r2v 开关限制)。
        // 有绑定素材的幕优先用素材首帧；没绑定的幕回退到"上一镜关键帧作参考"的旧逻辑。
        const boundRaw = await this.resolveBoundFirstFrame(shot);
        const boundFirst = boundRaw ? (await this.prepareReferenceImages([boundRaw]))[0] : undefined;
        const frameControl = boundFirst ? { startImage: boundFirst } : undefined;

        const extraImages = (!boundFirst && prevKeyframe) ? [prevKeyframe] : [];
        const baseRefs = (!boundFirst && !prevKeyframe) ? refImages : [];
        // [DEBUG] 逐镜起点：有绑定素材→素材首帧；否则第 0 镜用素材库参考图(baseRefs)、后续镜用上一镜关键帧(extraImages)。
        // 注意：baseRefs/extraImages 走 reference_image，当前 r2v=false 时会被开关挡掉；boundFirst 走 first_frame，不受开关影响。
        this.logger.log(
          `[gen] video=${videoId} shot#${shot.index} (${i + 1}/${orderedStoryboard.length}) ` +
          `boundFirst=${boundFirst ? `yes(${shot.material_use_mode})` : 'no'} ` +
          `baseRefs=${baseRefs.length} prevKeyframe=${prevKeyframe ? 'yes' : 'no'} ` +
          `tts=${tts ? `${getTTSDuration(tts).toFixed(1)}s` : 'none'} targetDur=${targetDuration.toFixed(1)}s`,
        );
        const path = await this.generateShot(videoId, shot, productName, productInfo, baseRefs, materialContext, targetDuration, extraImages, prevShot || undefined, opts?.custom_requirement, frameControl);

        if (!path) {
          this.logger.warn(`[gen] video=${videoId} shot#${shot.index} produced NO path — skipping, prevKeyframe reset`);
          prevKeyframe = null;
          continue;
        }

        const composited = await this.compositeShot(videoId, shot.index, path, subtitleEnabled ? tts : null, opts?.subtitle_style, targetDuration);
        const finalPath = composited || path;
        if (!composited) {
          this.logger.warn(`[gen] video=${videoId} shot#${shot.index}: compositeShot 返回原始片段（字幕/音频未合成）`);
        }
        await this.taskRepo.update({ videoId, shotIndex: shot.index }, {
          status: 'completed',
          previewUrl: `/api/videos/${videoId}/shots/${shot.index}/file`,
        });
        compositedClips.push(finalPath);

        prevKeyframe = await this.extractKeyframeDataUri(videoId, shot.index, finalPath);
      }

      if (compositedClips.length === 0) {
        await this.videoRepo.update(videoId, { status: 'failed' });
        return;
      }

      // 阶段 3：拼接所有已合成片段
      const finalUrl = await this.composite(videoId, compositedClips);
      await this.videoRepo.update(videoId, { status: 'completed', videoUrl: finalUrl });
      await this.projectRepo.update(projectId, { status: 'finished' });
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
  /**
   * 解析某一幕在剧本阶段绑定的素材，返回该幕首帧图 URL（未走 prepareReferenceImages 内联前）。
   * - adapted 且有预生成图(模式B，第二批) → 用适配图；
   * - direct / adapted 降级 → 用素材缩略图；
   * - none / 无绑定 / 老剧本 → null（回退到旧的关键帧衔接逻辑）。
   */
  private async resolveBoundFirstFrame(shot: ScriptShot): Promise<string | null> {
    const mode = shot.material_use_mode;
    if (!mode || mode === 'none') return null;
    if (mode === 'adapted' && shot.adapted_image_url) return shot.adapted_image_url;
    if (!shot.material_id) return null;
    const mat = await this.materialRepo.findOne({ where: { id: shot.material_id } });
    return mat?.thumbnailUrl || null;
  }

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

  private buildShotPrompt(
    shot: ScriptShot,
    productName: string,
    productInfo: Record<string, unknown>,
    materialContext: string,
    targetDuration?: number,
    prevShot?: ScriptShot,
    customRequirement?: string,
  ): string {
    const duration = targetDuration || shot.duration || 3;
    const sellingPoints = (productInfo.selling_points as string[]) || [];
    const category = (productInfo.category as string) || '';
    const scene = (productInfo.usage_scene as string) || '';

    const parts: string[] = [];

    // 1. 角色与任务
    parts.push(`你是一个专业的TikTok电商带货短视频导演。为商品"${productName}"${category ? `（品类：${category}）` : ''}生成一个${duration.toFixed(1)}秒的竖屏9:16分镜画面。`);

    // 2. 分镜内容指令
    parts.push(`画面内容：${shot.description}。`);
    if (shot.voiceover) {
      parts.push(`本镜头配音文案为"${shot.voiceover}"，请确保画面与配音内容高度匹配。`);
    }
    if (shot.camera_motion) {
      parts.push(`运镜方式：${shot.camera_motion}。`);
    }

    // 3. 可参考素材库
    if (materialContext) {
      parts.push(`可参考的素材库（已提供图片参考，请参考其风格、色调与构图）：\n${materialContext}`);
    }

    // 4. 商品卖点与场景
    if (sellingPoints.length > 0) {
      parts.push(`商品核心卖点：${sellingPoints.join('、')}。`);
    }
    if (scene) {
      parts.push(`适用场景：${scene}。`);
    }

    // 5. 上一镜衔接
    if (prevShot?.description) {
      parts.push(`上一镜头：${prevShot.description}。请保持主体一致、风格连贯、色调统一，确保转场自然流畅。`);
    }

    // 6. 质量要求
    parts.push('要求：画面精美写实、光影自然、色彩饱满、无字幕无水印无logo、适合TikTok社交媒体传播。');

    // 7. 用户自定义需求
    if (customRequirement?.trim()) {
      parts.push(`额外要求： 尽量避免大段文字生成。 ${customRequirement.trim()}`);
    }

    return parts.join('\n');
  }

  private async generateShot(
    videoId: string,
    shot: ScriptShot,
    productName: string,
    productInfo: Record<string, unknown>,
    imageUrls: string[],
    materialContext: string,
    targetDuration?: number,
    extraImages?: string[],
    prevShot?: ScriptShot,
    customRequirement?: string,
    /** 首尾帧控制：仅生成分镜时使用 */
    frameControl?: { startImage?: string; endImage?: string },
  ) {
    const index = shot.index;
    const prompt = this.buildShotPrompt(shot, productName, productInfo, materialContext, targetDuration, prevShot, customRequirement);
    const refs = extraImages?.length ? [...extraImages, ...imageUrls] : imageUrls;
    const hasFrame = !!(frameControl?.startImage || frameControl?.endImage);

    let lastError = '';
    for (let attempt = 0; attempt <= MAX_SHOT_RETRIES; attempt += 1) {
      if (attempt > 0) {
        this.logger.warn(`Video ${videoId} shot#${index}: retry ${attempt}/${MAX_SHOT_RETRIES} after "${lastError.slice(0, 120)}"`);
        await new Promise((r) => setTimeout(r, 2000));
      }
      const tag = attempt > 0 ? `[retry${attempt}]` : '';
      this.logger.log(`Video ${videoId} shot#${index}:${tag} submitting to Seedance (duration=${(targetDuration || shot.duration).toFixed(1)}s, refs=${refs.length}, startFrame=${!!frameControl?.startImage}, endFrame=${!!frameControl?.endImage})...`);
      const result = await this.volcano.generateVideo(prompt, refs, hasFrame ? frameControl : undefined, targetDuration);
      if (!result?.taskId) {
        lastError = result?.error || 'Seedance 未返回任务';
        if (attempt < MAX_SHOT_RETRIES) continue;
        this.logger.error(`Video ${videoId} shot#${index}: submit FAILED after ${MAX_SHOT_RETRIES + 1} attempts — ${lastError}`);
        await this.taskRepo.update({ videoId, shotIndex: index }, { status: 'failed', errorMsg: lastError });
        return '';
      }
      this.logger.log(`Video ${videoId} shot#${index}:${tag} Seedance taskId=${result.taskId}, start polling…`);
      await this.taskRepo.update({ videoId, shotIndex: index }, { seedanceTaskId: result.taskId });
      const localPath = await this.waitForShot(videoId, index, result.taskId);
      if (localPath) return localPath;

      // waitForShot failed — extract error from the task record for the retry log
      const task = await this.taskRepo.findOne({ where: { videoId, shotIndex: index } });
      lastError = task?.errorMsg || '分镜生成失败';
      if (attempt < MAX_SHOT_RETRIES) {
        // Reset status so it doesn't show as permanently failed while retrying
        await this.taskRepo.update({ videoId, shotIndex: index }, { status: 'processing', seedanceTaskId: null as unknown as string });
      }
    }

    return '';
  }

  private waitForShot(videoId: string, shotIndex: number, taskId: string): Promise<string> {
    return new Promise((resolve) => {
      let polls = 0;
      const interval = setInterval(async () => {
        if (++polls > MAX_SHOT_POLLS) {
          clearInterval(interval);
          this.logger.error(`Video ${videoId} shot#${shotIndex}: TIMEOUT after ${polls} polls (~${(polls * 5 / 60).toFixed(1)}min), task=${taskId}`);
          await this.taskRepo.update({ videoId, shotIndex }, { status: 'failed', errorMsg: `生成超时（${MAX_SHOT_POLLS} 次轮询，task=${taskId}）` });
          resolve('');
          return;
        }
        const r = await this.volcano.getVideoTaskStatus(taskId);
        if (!r) return;
        if (r.status === 'succeeded' || r.status === 'completed' || r.status === 'done') {
          clearInterval(interval);
          this.logger.log(`Video ${videoId} shot#${shotIndex}: SUCCEEDED after ${polls} polls, downloading ${r.videoUrl?.slice(0, 80)}…`);
          const localPath = await this.downloadShot(videoId, shotIndex, r.videoUrl);
          if (localPath) {
            await this.taskRepo.update({ videoId, shotIndex }, { previewUrl: `/api/videos/${videoId}/shots/${shotIndex}/file` });
          } else {
            this.logger.error(`Video ${videoId} shot#${shotIndex}: download FAILED from ${r.videoUrl}`);
            await this.taskRepo.update({ videoId, shotIndex }, { status: 'failed', errorMsg: `片段下载失败（url=${r.videoUrl || 'EMPTY'}）` });
          }
          resolve(localPath || '');
        } else if (r.status === 'failed') {
          clearInterval(interval);
          const reason = r.error || '分镜生成失败';
          this.logger.error(`Video ${videoId} shot#${shotIndex}: task FAILED after ${polls} polls — ${reason}`);
          await this.taskRepo.update({ videoId, shotIndex }, { status: 'failed', errorMsg: reason });
          resolve('');
        }
      }, 5000);
    });
  }

  private async downloadShot(videoId: string, shotIndex: number, remoteUrl?: string): Promise<string> {
    if (!remoteUrl) return '';
    // 下载整体超时（默认 120s，可用 SHOT_DOWNLOAD_TIMEOUT_MS 覆盖）。
    // 火山 TOS 链接偶发卡连接，fetch+pipeline 本身无超时会无限挂起 → 这里用 AbortController 兜底。
    const timeoutMs = parseInt(process.env.SHOT_DOWNLOAD_TIMEOUT_MS || '120000', 10) || 120000;
    const controller = new AbortController();
    const t0 = Date.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (!existsSync(VIDEO_DIR)) mkdirSync(VIDEO_DIR, { recursive: true });
      const localPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}.mp4`);
      this.logger.log(`[download] shot#${shotIndex} fetching ${remoteUrl.slice(0, 90)}… (timeout=${timeoutMs}ms)`);
      const res = await fetch(remoteUrl, { signal: controller.signal });
      if (!res.ok || !res.body) {
        this.logger.error(`[download] shot#${shotIndex} HTTP ${res.status} or empty body`);
        return '';
      }
      const contentLen = res.headers.get('content-length');
      this.logger.log(`[download] shot#${shotIndex} HTTP ${res.status}, size=${contentLen ? `${(Number(contentLen) / 1024 / 1024).toFixed(2)}MB` : 'unknown'}, streaming…`);
      const writer = createWriteStream(localPath);
      await pipeline(res.body as unknown as NodeJS.ReadableStream, writer);
      const bytes = existsSync(localPath) ? statSync(localPath).size : 0;
      this.logger.log(`[download] shot#${shotIndex} DONE ${(bytes / 1024 / 1024).toFixed(2)}MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return localPath;
    } catch (err) {
      const aborted = (err as Error).name === 'AbortError';
      const cause = (err as any)?.cause;
      const causeStr = cause ? ` cause=${cause.code || cause.errno || cause.message || cause}` : '';
      this.logger.error(`[download] shot#${shotIndex} ${aborted ? `TIMEOUT after ${timeoutMs}ms` : `FAILED: ${(err as Error).message}${causeStr}`} (elapsed ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      return '';
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 提取某分镜「原片段自己」的首帧 + 尾帧（重生成时约束新片段开头/结尾与原片一致，i2v 首尾帧）。
   * 原片段文件（composited 优先，其次 raw）不存在则返回空对象。
   */
  private async extractOwnFrames(videoId: string, index: number): Promise<{ startImage?: string; endImage?: string }> {
    const composited = join(VIDEO_DIR, `${videoId}-shot-${index}-composited.mp4`);
    const raw = join(VIDEO_DIR, `${videoId}-shot-${index}.mp4`);
    const file = existsSync(composited) ? composited : existsSync(raw) ? raw : '';
    if (!file) return {};
    const startImage = await this.extractFirstFrame(videoId, index, file);
    const endImage = await this.extractKeyframeDataUri(videoId, index, file);
    const out: { startImage?: string; endImage?: string } = {};
    if (startImage) out.startImage = startImage;
    if (endImage) out.endImage = endImage;
    return out;
  }

  private async extractKeyframeDataUri(videoId: string, shotIndex: number, videoPath: string): Promise<string | null> {
    if (!existsSync(VIDEO_DIR)) mkdirSync(VIDEO_DIR, { recursive: true });
    const keyPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-key.jpg`);
    try {
      await new Promise<void>((resolve, reject) => {
        const args = ['-y', '-sseof', '-0.1', '-i', videoPath, '-frames:v', '1', '-q:v', '2', keyPath];
        const ff = spawn(FFMPEG_PATH, args);
        let stderr = '';
        ff.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-200)}`));
        });
      });

      if (!existsSync(keyPath)) return null;
      const buf = readFileSync(keyPath);
      if (!buf.length) return null;
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch (err) {
      this.logger.warn(`extractKeyframe #${shotIndex} failed: ${(err as Error).message}`);
      return null;
    } finally {
      try { if (existsSync(keyPath)) unlinkSync(keyPath); } catch { /* ignore */ }
    }
  }

  /** 提取视频首帧作为 data URI（用于后一镜头的衔接参考） */
  private async extractFirstFrame(videoId: string, shotIndex: number, videoPath: string): Promise<string | null> {
    const keyPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-first.jpg`);
    try {
      await new Promise<void>((resolve, reject) => {
        const args = ['-y', '-i', videoPath, '-frames:v', '1', '-q:v', '2', keyPath];
        const ff = spawn(FFMPEG_PATH, args);
        let stderr = '';
        ff.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-200)}`));
        });
      });
      if (!existsSync(keyPath)) return null;
      const buf = readFileSync(keyPath);
      if (!buf.length) return null;
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch (err) {
      this.logger.warn(`extractFirstFrame #${shotIndex} failed: ${(err as Error).message}`);
      return null;
    } finally {
      try { if (existsSync(keyPath)) unlinkSync(keyPath); } catch { /* ignore */ }
    }
  }

  /**
   * 检测当前 ffmpeg 是否带 libass（subtitles 滤镜）。检测一次后缓存。
   * 不带 libass 时 `-vf subtitles=...` 会让整条命令失败，需提前跳过字幕（仅混音频）。
   */
  private async ensureSubtitlesSupport(): Promise<boolean> {
    if (this.subtitlesSupported !== null) return this.subtitlesSupported;
    this.subtitlesSupported = await new Promise<boolean>((resolve) => {
      try {
        const ff = spawn(FFMPEG_PATH, ['-hide_banner', '-filters']);
        let out = '';
        ff.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
        ff.on('error', () => resolve(false));
        ff.on('close', () => resolve(/\bsubtitles\b/i.test(out)));
      } catch { resolve(false); }
    });
    if (!this.subtitlesSupported) {
      this.logger.warn(
        'ffmpeg 未编译 libass（无 subtitles 滤镜）→ 字幕将无法烧录，仅合成 TTS 配音。' +
        '安装带 libass 的 ffmpeg（如 `brew reinstall ffmpeg`）后字幕会自动生效。',
      );
    } else {
      this.logger.log('ffmpeg subtitles 滤镜可用（libass OK），字幕烧录已启用');
    }
    return this.subtitlesSupported;
  }

  /** 单个分镜合成：Seedance 画面 + TTS 音频 + SRT 字幕 */
  /**
   * 把片段就地裁到 seconds 秒（覆盖原文件）：用于 Seedance 强制 ≥4s 而脚本意图更短的情况。
   * 丢弃源音轨（-an，Seedance 片段无有效音频；配音在 compositeShot 另行混入）。失败则保留原片不阻断。
   */
  private async trimClipInPlace(videoId: string, shotIndex: number, videoPath: string, seconds: number): Promise<void> {
    const tmp = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-trim.mp4`);
    const args = ['-y', '-i', videoPath, '-t', seconds.toFixed(2), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', tmp];
    try {
      await new Promise<void>((resolve, reject) => {
        const ff = spawn(FFMPEG_PATH, args, { cwd: VIDEO_DIR });
        let stderr = '';
        ff.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code: number) => (code === 0 ? resolve() : reject(new Error(`ffmpeg trim exit ${code}: ${stderr.slice(-200)}`))));
      });
      copyFileSync(tmp, videoPath); // 覆盖原片，预览与最终拼接都用裁剪后的
      this.logger.log(`compositeShot #${shotIndex}: 片段裁到 ${seconds.toFixed(2)}s（Seedance 最短 4s）`);
    } catch (err) {
      this.logger.warn(`compositeShot #${shotIndex}: 裁剪到 ${seconds.toFixed(2)}s 失败: ${(err as Error).message}，用原片`);
    } finally {
      try { unlinkSync(tmp); } catch { /* ignore */ }
    }
  }

  private async compositeShot(videoId: string, shotIndex: number, videoPath: string, tts: TTSResult | null, subtitleStyle?: { font_size?: number; outline?: number; color?: string; font_family?: string }, targetDuration?: number): Promise<string | null> {
    const outPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-composited.mp4`);
    const tempFiles: string[] = [];
    let hasAudio = false;
    let srtPath = '';

    // Seedance 最短出片 4s，但脚本/配音的意图时长可能更短。此处把片段就地裁到目标时长，
    // 保证成片节奏与脚本/配音一致（有配音时 compositeShot 的 -shortest 也会再次对齐音频长度）。
    if (targetDuration && targetDuration > 0 && targetDuration < SEEDANCE_MIN_DURATION) {
      await this.trimClipInPlace(videoId, shotIndex, videoPath, targetDuration);
    }

    try {
      const audioPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-audio.mp3`);
      srtPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-sub.srt`);

      if (tts) {
        try {
          const ttsRes = await fetch(tts.audioUrl);
          if (ttsRes.ok) {
            writeFileSync(audioPath, Buffer.from(await ttsRes.arrayBuffer()));
            tempFiles.push(audioPath);
            hasAudio = true;
          } else {
            this.logger.warn(`compositeShot #${shotIndex}: TTS 音频下载失败 HTTP ${ttsRes.status}，字幕将继续烧录`);
          }
        } catch (err) {
          this.logger.warn(`compositeShot #${shotIndex}: TTS 音频下载异常: ${(err as Error).message}，字幕将继续烧录`);
        }
        const srtContent = ttsWordsToSRT(tts);
        if (srtContent) {
          writeFileSync(srtPath, srtContent, 'utf-8');
          tempFiles.push(srtPath);
        } else {
          srtPath = '';
        }
      }

      // 无音频且无字幕 → 无需合成，返回原始片段
      if (!hasAudio && !srtPath) return videoPath;

      // 只有 ffmpeg 带 libass 且有字幕内容时才烧字幕
      const subsAvailable = srtPath ? await this.ensureSubtitlesSupport() : false;
      const burnSubs = !!srtPath && subsAvailable;
      if (srtPath && !subsAvailable) {
        this.logger.warn(`compositeShot #${shotIndex}: ffmpeg 缺 libass，跳过字幕烧录`);
      }

      // 无音频且无法烧字幕 → 无需合成
      if (!hasAudio && !burnSubs) return videoPath;

      const fontSize = subtitleStyle?.font_size || 15;
      const outline = subtitleStyle?.outline ?? 2.5;
      const color = subtitleStyle?.color || '#FFFFFF';
      const requestedFont = subtitleStyle?.font_family
        || process.env.SUBTITLE_FONT_FAMILY
        || '';
      const fallbackFont = process.platform === 'win32' ? 'Microsoft YaHei'
        : process.platform === 'darwin' ? 'PingFang SC'
        : 'Noto Sans CJK SC';
      const primaryFont = requestedFont || fallbackFont;

      const buildArgs = (withSubs: boolean, fontFamily?: string): string[] => {
        const a = hasAudio
          ? ['-y', '-i', videoPath, '-i', audioPath]
          : ['-y', '-i', videoPath];
        if (withSubs) {
          const srtFilterPath = basename(srtPath);
          // 使用文件名而非绝对路径：Windows 绝对路径中的盘符 : 会被 ffmpeg filter parser
          // 误当作参数分隔符，即使 \: 转义也不生效。设 spawn cwd 为 VIDEO_DIR 后用相对路径即可。
          const f = fontFamily || primaryFont;
          // 颜色 hex #RRGGBB → ASS &HBBGGRR 格式 (去掉#，反转RGB)
          const hex = color.replace('#', '');
          const assColor = `&H00${hex[4] || 'F'}${hex[5] || 'F'}${hex[2] || 'F'}${hex[3] || 'F'}${hex[0] || 'F'}${hex[1] || 'F'}`;
          this.logger.log(`compositeShot #${shotIndex} subtitle: Fontsize=${fontSize}, Fontname=${f}, Outline=${outline}, Color=${color}`);
          a.push('-vf', `subtitles=${srtFilterPath}:charenc=UTF-8:force_style='Fontsize=${fontSize},Fontname=${f},PrimaryColour=${assColor},OutlineColour=&H00000000,Outline=${outline},BorderStyle=1,MarginV=80'`);
        }
        a.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
        if (hasAudio) {
          a.push('-c:a', 'aac', '-b:a', '128k', '-map', '0:v:0', '-map', '1:a:0');
        }
        a.push('-shortest', '-movflags', '+faststart', outPath);
        return a;
      };

      const runFfmpeg = (args: string[]) => new Promise<void>((resolve, reject) => {
        const ff = spawn(FFMPEG_PATH, args, { cwd: VIDEO_DIR });
        let stderr = '';
        ff.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-200)}`));
        });
      });

      try {
        await runFfmpeg(buildArgs(burnSubs, primaryFont));
      } catch (err) {
        if (burnSubs) {
          // 如果用户选了特定字体且与 fallback 不同，先尝试用 fallback 字体重试
          if (requestedFont && requestedFont !== fallbackFont) {
            this.logger.warn(`compositeShot #${shotIndex} 字体 "${requestedFont}" 烧录失败，尝试 fallback 字体 "${fallbackFont}": ${(err as Error).message}`);
            try {
              await runFfmpeg(buildArgs(true, fallbackFont));
              return outPath;
            } catch (err2) {
              this.logger.warn(`compositeShot #${shotIndex} fallback 字体也失败: ${(err2 as Error).message}`);
            }
          } else {
            this.logger.warn(`compositeShot #${shotIndex} 烧字幕失败: ${(err as Error).message}`);
          }
          // 最终降级：只混音频，不烧字幕
          this.logger.warn(`compositeShot #${shotIndex} 降级仅混音频`);
          await runFfmpeg(buildArgs(false));
        } else {
          throw err;
        }
      }

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
    if (clipPaths.length === 0) {
      this.logger.error(`composite ${videoId}: 无可用分镜片段`);
      throw new BadRequestException('无可用分镜片段');
    }
    if (clipPaths.length === 1) {
      copyFileSync(clipPaths[0], finalPath);
      return fileUrl;
    }
    const listPath = join(VIDEO_DIR, `${videoId}-concat.txt`);
    writeFileSync(listPath, clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
    try {
      await new Promise<void>((resolve, reject) => {
        const ff = spawn(FFMPEG_PATH, ['-y','-f','concat','-safe','0','-i',listPath,'-c','copy','-movflags','+faststart',finalPath]);
        let stderr = '';
        ff.stderr?.on('data', (d) => { stderr += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg concat exit ${code}: ${stderr.slice(-300)}`))));
      });
      this.logger.log(`composite ${videoId}: ${clipPaths.length} clips → ${finalPath}`);
      return fileUrl;
    } catch (err) {
      this.logger.error(`composite ${videoId} FAILED: ${(err as Error).message}`);
      // 降级：尝试重编码拼接
      try {
        this.logger.log(`composite ${videoId}: 降级重编码拼接...`);
        await new Promise<void>((resolve, reject) => {
          const ff = spawn(FFMPEG_PATH, ['-y','-f','concat','-safe','0','-i',listPath,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',finalPath]);
          let stderr = '';
          ff.stderr?.on('data', (d) => { stderr += d.toString(); });
          ff.on('error', reject);
          ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg re-encode exit ${code}: ${stderr.slice(-300)}`))));
        });
        this.logger.log(`composite ${videoId}: 重编码拼接成功`);
        return fileUrl;
      } catch (err2) {
        this.logger.error(`composite ${videoId}: 重编码也失败: ${(err2 as Error).message}`);
        throw err2;
      }
    }
  }
}
