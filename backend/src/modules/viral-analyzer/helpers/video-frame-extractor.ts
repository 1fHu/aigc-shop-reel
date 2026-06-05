import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// 设置 FFmpeg 和 FFprobe 路径
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * 视频关键帧提取器
 * 用于从视频中提取关键帧图片
 */
export class VideoFrameExtractor {
  /**
   * 提取视频关键帧
   * @param videoPath 视频文件路径
   * @param outputDir 输出目录
   * @param frameCount 提取的帧数量（默认10帧）
   * @returns 提取的帧图片路径数组
   */
  static async extractKeyFrames(
    videoPath: string,
    outputDir: string,
    frameCount: number = 10,
  ): Promise<string[]> {
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 获取视频时长
    const duration = await this.getVideoDuration(videoPath);

    // 计算每帧的时间戳（均匀分布）
    const interval = duration / (frameCount + 1);
    const frames: string[] = [];

    // 提取每一帧
    for (let i = 1; i <= frameCount; i++) {
      const timestamp = interval * i;
      const framePath = path.join(outputDir, `frame-${i}.jpg`);

      await this.extractFrameAtTimestamp(videoPath, framePath, timestamp);
      frames.push(framePath);
    }

    return frames;
  }

  /**
   * 获取视频时长（秒）
   */
  private static getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration || 30;
          resolve(duration);
        }
      });
    });
  }

  /**
   * 在指定时间戳提取帧
   */
  private static extractFrameAtTimestamp(
    videoPath: string,
    outputPath: string,
    timestamp: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '1280x720', // 固定分辨率，便于 AI 分析
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));
    });
  }

  /**
   * 提取缩略图（视频第1秒）
   */
  static async extractThumbnail(
    videoPath: string,
    outputPath: string,
  ): Promise<void> {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(outputPath),
          folder: outputDir,
          size: '640x360', // 缩略图较小
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err));
    });
  }
}
