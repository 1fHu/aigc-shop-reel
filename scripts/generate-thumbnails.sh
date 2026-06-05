#!/bin/bash

# 视频缩略图生成脚本
# 使用 Docker worker 容器中的 ffmpeg 生成缩略图

echo "=== 📸 生成视频缩略图 ==="
echo ""

# 缩略图目录
THUMBNAIL_DIR="/Users/a1234/Desktop/aigc-shop-reel/uploads/thumbnails"
VIDEO_DIR="/Users/a1234/Desktop/aigc-shop-reel/uploads/reference-videos"

# 确保目录存在
mkdir -p "$THUMBNAIL_DIR"

echo "视频目录: $VIDEO_DIR"
echo "缩略图目录: $THUMBNAIL_DIR"
echo ""

# 检查是否有 ffmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✅ 找到 ffmpeg，使用本地版本"
    USE_DOCKER=false
else
    echo "⚠️  本地没有 ffmpeg，尝试使用 Docker"
    USE_DOCKER=true
fi

echo ""

# 生成缩略图
for i in {1..8}; do
    num=$(printf "%03d" $i)
    video_file="$VIDEO_DIR/video-${num}.mp4"
    thumb_file="$THUMBNAIL_DIR/video-${num}.jpg"

    if [ ! -f "$video_file" ]; then
        echo "❌ 视频不存在: video-${num}.mp4"
        continue
    fi

    if [ -f "$thumb_file" ]; then
        echo "⏭️  跳过已存在: video-${num}.jpg"
        continue
    fi

    echo "📸 生成缩略图: video-${num}.mp4 -> video-${num}.jpg"

    if [ "$USE_DOCKER" = true ]; then
        # 使用 Docker (需要挂载 uploads 目录)
        docker run --rm \
            -v "$VIDEO_DIR:/videos:ro" \
            -v "$THUMBNAIL_DIR:/thumbnails" \
            linuxserver/ffmpeg \
            -i "/videos/video-${num}.mp4" \
            -ss 00:00:01 \
            -vframes 1 \
            -vf "scale=600:-1" \
            "/thumbnails/video-${num}.jpg" \
            -y 2>&1 | grep -v "frame=" || echo "  ⚠️  Docker 生成失败"
    else
        # 使用本地 ffmpeg
        ffmpeg -i "$video_file" \
            -ss 00:00:01 \
            -vframes 1 \
            -vf "scale=600:-1" \
            "$thumb_file" \
            -y 2>&1 | grep -v "frame=" && echo "  ✅ 生成成功"
    fi
done

echo ""
echo "=== 📊 结果 ==="
echo ""

# 统计
total_videos=$(ls -1 "$VIDEO_DIR"/video-*.mp4 2>/dev/null | wc -l | xargs)
total_thumbs=$(ls -1 "$THUMBNAIL_DIR"/video-*.jpg 2>/dev/null | wc -l | xargs)

echo "视频文件: $total_videos 个"
echo "缩略图: $total_thumbs 个"
echo ""

if [ "$total_thumbs" -eq "$total_videos" ]; then
    echo "🎉 所有缩略图生成完成！"
    echo ""
    echo "下一步："
    echo "1. 更新后端数据，使用真实缩略图 URL"
    echo "2. 或者添加缩略图流式传输端点"
else
    echo "⚠️  部分缩略图生成失败"
    echo ""
    echo "手动安装 ffmpeg："
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt install ffmpeg"
fi
