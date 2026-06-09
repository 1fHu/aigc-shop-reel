/**
 * 视频生成（Video）相关类型
 * 严格按《VidCraft API 接口规范文档 v1.0》第 6 章对齐
 *
 * ⚠️ spec 提到 WebSocket 实时进度推送；mock 用轮询（GET /status）代替，
 * 真实集成时需要从轮询切到 socket.io 监听。
 */

export type VideoTaskStatus = 'queued' | 'rendering' | 'completed' | 'failed';
export type VideoShotStatus = 'queued' | 'rendering' | 'completed' | 'failed';
export type VideoRatio = '9:16' | '16:9' | '1:1';

/** 单个分镜的渲染状态 */
export interface VideoShot {
  id: string;
  index: number;             // 0-based
  label: string;             // 展示名，如 "产品外观展示"
  thumb_url: string;
  status: VideoShotStatus;
  progress: number;          // 0-100
}

/** 整体视频任务状态（GET /api/videos/:id/status 返回结构） */
export interface VideoTask {
  id: string;
  project_id: string;
  script_id: string;
  render_id: string;         // VC-88291-AIGC 类似的 trace
  status: VideoTaskStatus;
  progress: number;          // 0-100 整体
  estimated_remaining: number; // 秒
  resolution: string;        // "1080×1920 (9:16)"
  quality: string;           // "4K UPSCALED"
  ratio: VideoRatio;
  shots: VideoShot[];
  title?: string;            // 项目/视频名称
  cover_url?: string;        // 完成态视频封面
  download_url?: string;     // 完成态下载链接
  error_message?: string;    // 失败时的错误描述
  /** 本次视频生成所用的字幕/配音设置（GET /api/videos 回填分镜编辑面板用） */
  settings?: VideoGenerationSettings | null;
  created_at: string;
  completed_at?: string;
}

/** 视频持久化的字幕/配音设置（video.settings 子集，用于按项目回填面板） */
export interface VideoGenerationSettings {
  voice_id?: string | null;
  subtitle_enabled?: boolean;
  subtitle_style?: {
    font_size?: number;
    outline?: number;
    color?: string;
    font_family?: string;
  };
  custom_requirement?: string;
}

/**
 * GET /api/videos/:id/shots 返回的单分镜生成结果（含每镜片段地址）
 * 用于分镜编辑页：视频生成完成后，把片段播放器回显到分镜中央预览位。
 * status 为后端原始值（queued/processing/completed/failed），仅用来判断是否已出片。
 */
export interface VideoShotClip {
  index: number;                    // 0-based，对齐 Scene.index
  status: string;
  description: string;
  duration: number;
  camera_motion: string;
  voiceover: string;
  subtitle: string;
  video_url: string | null;         // 片段播放地址 /api/videos/:id/shots/:index/file（未出片为 null）
  reference_image_url: string | null;
  error_msg: string | null;
}

/** POST /api/videos/generate 请求体 */
export interface GenerateVideoPayload {
  project_id: string;
  script_id: string;
  ratio?: VideoRatio;          // 默认 9:16
  voice_id?: string;           // TTS 音色
  subtitle_enabled?: boolean;  // 是否烧录字幕，默认 true
  subtitle_style?: {            // 字幕样式
    font_size?: number;        // 字体大小 px，默认 15
    outline?: number;          // 描边粗细，默认 2.5
    color?: string;            // 字体颜色 hex，默认 #FFFFFF
    font_family?: string;      // 字体名称，默认 Microsoft YaHei
  };
  custom_requirement?: string; // 用户自定义视频需求，追加到 Seedance prompt
}

/** POST /api/videos/:id/export 请求体 */
export interface ExportVideoPayload {
  ratio: VideoRatio;
  resolution: '720p' | '1080p';
}

/** PUT /api/videos/:id/settings 请求体（TTS / BGM 等） */
export interface UpdateVideoSettingsPayload {
  voice_id?: string;
  bgm_id?: string;
  subtitle_enabled?: boolean;
}
