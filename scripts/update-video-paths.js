#!/usr/bin/env node

/**
 * 本地视频路径更新脚本（无需 MinIO）
 *
 * 使用方法：
 * node scripts/update-video-paths.js
 */

const fs = require('fs');
const path = require('path');

const VIDEO_DIR = path.join(__dirname, '..', 'uploads', 'reference-videos');

// 检查视频是否存在
const videoFiles = [
  'video-001.mp4',
  'video-002.mp4',
  'video-003.mp4',
  'video-004.mp4',
  'video-005.mp4',
  'video-006.mp4',
  'video-007.mp4',
  'video-008.mp4',
];

console.log('🔍 检查视频文件...\n');

const existingVideos = [];
videoFiles.forEach((fileName, index) => {
  const filePath = path.join(VIDEO_DIR, fileName);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ ${fileName} (${sizeMB} MB)`);
    existingVideos.push({
      id: `ref-video-${String(index + 1).padStart(3, '0')}`,
      fileName,
      videoUrl: `/api/gene-bank/videos/${fileName.replace('.mp4', '')}/stream`,
    });
  } else {
    console.log(`❌ ${fileName} 不存在`);
  }
});

console.log(`\n📊 找到 ${existingVideos.length}/8 个视频\n`);

if (existingVideos.length === 0) {
  console.log('❌ 没有找到视频文件，请先将视频放到 uploads/reference-videos/ 目录');
  process.exit(1);
}

// 更新配置文件
const dataFilePath = path.join(
  __dirname,
  '..',
  'backend',
  'src',
  'modules',
  'gene-bank',
  'data',
  'reference-videos.data.ts'
);

console.log('📝 更新配置文件...\n');

let content = fs.readFileSync(dataFilePath, 'utf-8');

// 更新每个视频的 videoUrl
existingVideos.forEach(({ id, videoUrl }) => {
  const regex = new RegExp(`(id: '${id}',[\\s\\S]*?videoUrl: ')[^']*'`, 'g');
  content = content.replace(regex, `$1${videoUrl}'`);
  console.log(`✅ 更新 ${id}: ${videoUrl}`);
});

fs.writeFileSync(dataFilePath, content, 'utf-8');

console.log('\n✨ 配置文件更新完成！\n');
console.log('📌 后续步骤：');
console.log('   1. 重启后端服务: npm run dev:backend');
console.log('   2. 访问 API: http://localhost:3000/api/gene-bank/reference-videos');
console.log('   3. 视频将通过后端静态文件服务访问\n');
