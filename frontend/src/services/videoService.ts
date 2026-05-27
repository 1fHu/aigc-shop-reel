import api from './api';
import type {
  ExportVideoPayload,
  GenerateVideoPayload,
  UpdateVideoSettingsPayload,
  VideoShot,
  VideoTask,
} from '@/types';

/**
 * 视频生成（Video）模块 API
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 6 章
 *
 * 实时进度：spec 推荐 WebSocket，mock 用 GET /:id/status 轮询。
 */
export const videoService = {
  /** 提交一键成片任务 */
  generate(payload: GenerateVideoPayload): Promise<VideoTask> {
    return api.post('/videos/generate', payload);
  },

  /** 获取视频 / 分镜生成状态（轮询用） */
  getStatus(videoId: string): Promise<VideoTask> {
    return api.get(`/videos/${videoId}/status`);
  },

  /** 单分镜重新生成 */
  regenerateShot(videoId: string, shotIndex: number): Promise<VideoShot> {
    return api.post(`/videos/${videoId}/shots/${shotIndex}/regenerate`);
  },

  /** 更新 TTS / BGM 设置 */
  updateSettings(videoId: string, payload: UpdateVideoSettingsPayload): Promise<VideoTask> {
    return api.put(`/videos/${videoId}/settings`, payload);
  },

  /** 获取视频下载临时链接 */
  getDownloadUrl(videoId: string): Promise<{ url: string; expires_at: string }> {
    return api.get(`/videos/${videoId}/download`);
  },

  /** 触发指定画幅 / 分辨率的导出 */
  exportVideo(videoId: string, payload: ExportVideoPayload): Promise<VideoTask> {
    return api.post(`/videos/${videoId}/export`, payload);
  },
};
