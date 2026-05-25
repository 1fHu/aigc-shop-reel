import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MockStoreService } from '../../common/mock-store.service';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(private readonly store: MockStoreService) {}

  generate(projectId: string, scriptId: string) {
    const video = this.store.createVideo(projectId, scriptId);
    return { video_id: video.id, trace_id: video.trace_id, task_count: 1, status: video.status };
  }

  getStatus(id: string) {
    const status = this.store.getVideoStatus(id);
    if (!status) {
      throw new NotFoundException('视频不存在');
    }
    return status;
  }

  regenerateShot(id: string, index: number, newPrompt?: string) {
    const result = this.store.regenerateVideoShot(id, index, newPrompt);
    if (!result) {
      throw new NotFoundException('分镜不存在');
    }
    return result;
  }

  updateSettings(id: string, body: { tts?: { language?: string; voice?: string }; bgm?: { preset_id?: string; custom_url?: string; volume?: number } }) {
    const result = this.store.updateVideoSettings(id, body.tts?.language, body.tts?.voice, body.bgm?.preset_id, body.bgm?.custom_url, body.bgm?.volume);
    if (!result) {
      throw new NotFoundException('视频不存在');
    }
    return result;
  }

  getDownload(id: string) {
    const result = this.store.getVideoDownload(id);
    if (!result) {
      throw new NotFoundException('视频不存在');
    }
    return result;
  }

  export(id: string, aspectRatio: string, resolution: string) {
    const result = this.store.exportVideo(id, aspectRatio, resolution);
    if (!result) {
      throw new NotFoundException('视频不存在');
    }
    return result;
  }
}
