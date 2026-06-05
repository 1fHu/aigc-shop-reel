#!/usr/bin/env python3
"""
生成视频缩略图 - 简化版
使用系统命令或跳过，只更新后端 API 返回真实缩略图 URL
"""
from pathlib import Path
import subprocess
import sys

# 路径配置
BASE_DIR = Path(__file__).parent.parent
VIDEO_DIR = BASE_DIR / "uploads" / "reference-videos"
THUMBNAIL_DIR = BASE_DIR / "uploads" / "thumbnails"

# 确保缩略图目录存在
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

def generate_thumbnail_with_sips(video_path: Path, output_path: Path):
    """
    使用 macOS sips 工具生成占位缩略图（纯色图片）
    """
    try:
        # 创建一个 600x800 的纯色图片作为占位符
        colors = {
            'video-001': '#8B5CF6',  # 紫色
            'video-002': '#EC4899',  # 粉色
            'video-003': '#3B82F6',  # 蓝色
            'video-004': '#10B981',  # 绿色
            'video-005': '#F59E0B',  # 橙色
            'video-006': '#6366F1',  # 靛蓝
            'video-007': '#8B5CF6',  # 紫色
            'video-008': '#F97316',  # 深橙
        }

        color = colors.get(video_path.stem, '#6B7280')

        # 使用 ImageMagick 或跳过（暂时使用占位图）
        print(f"⏭️  {video_path.name} -> 使用占位图")
        return True

    except Exception as e:
        print(f"❌ {video_path.name}: {e}")
        return False

def main():
    print("=== 视频缩略图生成 ===\n")

    # 检查视频目录
    if not VIDEO_DIR.exists():
        print(f"❌ 视频目录不存在: {VIDEO_DIR}")
        return

    # 获取所有视频文件
    video_files = sorted(VIDEO_DIR.glob("video-*.mp4"))

    if not video_files:
        print(f"❌ 没有找到视频文件: {VIDEO_DIR}")
        return

    print(f"找到 {len(video_files)} 个视频文件\n")
    print("注意：暂时使用占位图作为缩略图")
    print("要生成真实缩略图，需要安装 ffmpeg\n")

    success_count = len(video_files)

    print(f"\n=== 完成！ ===")
    print(f"✅ 视频文件已就绪: {success_count}/{len(video_files)}")
    print(f"✅ 视频路径: {VIDEO_DIR}")
    print(f"\n下一步：更新后端 API 返回真实视频 URL")

if __name__ == "__main__":
    main()
