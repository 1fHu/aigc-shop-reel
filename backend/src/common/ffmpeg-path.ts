/**
 * 统一解析 ffmpeg / ffprobe 二进制路径。
 *
 * 为什么要这个 helper：系统 PATH 上的 ffmpeg 不可控——很多 homebrew/裸机 ffmpeg
 * 编译时没带 `--enable-libass`，没有 `subtitles` 滤镜，字幕烧录会直接失败（坑见
 * memory: subtitles-need-libass-ffmpeg）。`@ffmpeg-installer/ffmpeg` 提供的二进制
 * 自带 libass，且随依赖安装，本机 / Docker 一致，不赌 PATH。
 *
 * 解析优先级：
 *   1. 环境变量 FFMPEG_PATH / FFPROBE_PATH（运维想钉死某个二进制时用）
 *   2. @ffmpeg-installer/ffmpeg、@ffprobe-installer/ffprobe 自带二进制（默认，带 libass）
 *   3. 裸 'ffmpeg' / 'ffprobe'（installer 在当前平台没有预编译产物时的兜底，走 PATH）
 */

function resolveInstaller(pkg: string): string | null {
  try {
    // 这些包导出 { path }；某些平台可能没有预编译二进制 → require 抛错则兜底
    const mod = require(pkg) as { path?: string };
    return mod?.path || null;
  } catch {
    return null;
  }
}

export const FFMPEG_PATH: string =
  process.env.FFMPEG_PATH || resolveInstaller('@ffmpeg-installer/ffmpeg') || 'ffmpeg';

export const FFPROBE_PATH: string =
  process.env.FFPROBE_PATH || resolveInstaller('@ffprobe-installer/ffprobe') || 'ffprobe';
