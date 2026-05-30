import api from './api';
import type {
  ExportVideoPayload,
  GenerateVideoPayload,
  UpdateVideoSettingsPayload,
  VideoShot,
  VideoTask,
  VideoTaskStatus,
} from '@/types';

type RawVideoShot = Partial<VideoShot> & {
  thumbnail_url?: string | null;
};

type RawVideoTask = Partial<VideoTask> & {
  video_id?: string;
  trace_id?: string;
  error_msg?: string | null;
  video_url?: string | null;
  estimated_seconds?: number;
  completed_shots?: number;
  total_shots?: number;
  shots?: RawVideoShot[];
};

const STATUS_MAP: Record<string, VideoTaskStatus> = {
  queued: 'queued',
  rendering: 'rendering',
  completed: 'completed',
  failed: 'failed',
  generating: 'rendering',
  composing: 'rendering',
  processing: 'rendering',
};

function normalizeStatus(value?: string): VideoTaskStatus {
  if (!value) return 'queued';
  return STATUS_MAP[value] || 'queued';
}

function normalizeShots(rawShots: RawVideoShot[], videoId: string): VideoShot[] {
  return rawShots.map((shot, idx) => {
    const index = typeof shot.index === 'number' ? shot.index : idx;
    const status = normalizeStatus(shot.status);
    const progress =
      typeof shot.progress === 'number'
        ? shot.progress
        : status === 'completed'
          ? 100
          : status === 'rendering'
            ? 50
            : 0;

    return {
      id: shot.id || `${videoId}-shot-${index}`,
      index,
      label: shot.label || `Scene ${String(index + 1).padStart(2, '0')}`,
      thumb_url:
        shot.thumb_url ||
        shot.thumbnail_url ||
        `https://placehold.co/200x200/E2E8F0/94A3B8?text=Scene+${index + 1}`,
      status,
      progress,
    };
  });
}

function normalizeTask(raw: RawVideoTask): VideoTask {
  const id = raw.id || raw.video_id || '';
  const shots = normalizeShots(raw.shots || [], id);
  const progress =
    typeof raw.progress === 'number'
      ? raw.progress
      : raw.completed_shots && raw.total_shots
        ? Math.round((raw.completed_shots / raw.total_shots) * 100)
        : shots.length
          ? Math.round(shots.reduce((sum, s) => sum + s.progress, 0) / shots.length)
          : 0;

  return {
    id,
    project_id: raw.project_id || '',
    script_id: raw.script_id || '',
    render_id: raw.render_id || raw.trace_id || '',
    status: normalizeStatus(raw.status),
    progress,
    estimated_remaining: raw.estimated_remaining ?? raw.estimated_seconds ?? 0,
    resolution: raw.resolution || '1080x1920',
    quality: raw.quality || 'HD',
    ratio: raw.ratio || '9:16',
    shots,
    title: raw.title,
    cover_url: raw.cover_url,
    download_url: raw.download_url || raw.video_url,
    error_message: raw.error_message || raw.error_msg,
    created_at: raw.created_at || new Date().toISOString(),
    completed_at: raw.completed_at,
  };
}

/**
 * 视频生成（Video）模块 API
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 6 章
 *
 * 实时进度：spec 推荐 WebSocket，mock 用 GET /:id/status 轮询。
 */
export const videoService = {
  /** 提交一键成片任务 */
  generate(payload: GenerateVideoPayload): Promise<VideoTask> {
    return api.post('/videos/generate', payload).then((raw) => normalizeTask(raw as RawVideoTask));
  },

  /** 获取视频 / 分镜生成状态（轮询用） */
  getStatus(videoId: string): Promise<VideoTask> {
    return api.get(`/videos/${videoId}/status`).then((raw) => normalizeTask(raw as RawVideoTask));
  },

  /** 单分镜重新生成 */
  regenerateShot(videoId: string, shotIndex: number): Promise<VideoShot> {
    return api.post(`/videos/${videoId}/shots/${shotIndex}/regenerate`);
  },

  /** 更新 TTS / BGM 设置 */
  updateSettings(videoId: string, payload: UpdateVideoSettingsPayload): Promise<VideoTask> {
    return api.put(`/videos/${videoId}/settings`, payload);
  },

  /**
   * 获取视频下载临时链接
   *
   * FIXME(download-url-type): 此处 `raw` 实际是 AxiosResponse，`tsc --noEmit` 通过但
   * `npm run build` 报错（Property 'url'/'download_url'/'expires_at' does not exist on
   * AxiosResponse）。需对齐后端 GET /videos/:id/download 响应 shape 后修正类型/解包，
   * 与其它方法一样改成 `.then((raw) => ...(raw as RawXxx))`。
   * 已与用户约定：暂缓修复，留待后续统一处理。
   */
  getDownloadUrl(videoId: string): Promise<{ url: string; download_url?: string; expires_at: string }> {
    return api.get(`/videos/${videoId}/download`).then((raw) => ({
      url: raw?.url || raw?.download_url || '',
      download_url: raw?.download_url || raw?.url,
      expires_at: raw?.expires_at || '',
    }));
  },

  /** 触发指定画幅 / 分辨率的导出 */
  exportVideo(videoId: string, payload: ExportVideoPayload): Promise<VideoTask> {
    return api.post(`/videos/${videoId}/export`, payload);
  },
};
