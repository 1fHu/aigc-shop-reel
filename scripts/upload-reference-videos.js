#!/usr/bin/env node

/**
 * 参考视频上传脚本
 *
 * 使用方法：
 * 1. 将下载的 8 个视频放到 uploads/reference-videos/ 目录
 * 2. 运行 node scripts/upload-reference-videos.js
 * 3. 脚本会自动上传到 MinIO 并更新配置文件
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

// MinIO 配置
const MINIO_CONFIG = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
};

const BUCKET_NAME = 'reference-videos';
const VIDEO_DIR = path.join(__dirname, '..', 'uploads', 'reference-videos');

// 视频文件名映射到 ID
const VIDEO_MAPPING = {
  'video-001.mp4': 'ref-video-001',
  'video-002.mp4': 'ref-video-002',
  'video-003.mp4': 'ref-video-003',
  'video-004.mp4': 'ref-video-004',
  'video-005.mp4': 'ref-video-005',
  'video-006.mp4': 'ref-video-006',
  'video-007.mp4': 'ref-video-007',
  'video-008.mp4': 'ref-video-008',
};

async function createBucketIfNotExists(client) {
  try {
    await client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`✅ 创建 bucket: ${BUCKET_NAME}`);
  } catch (err) {
    if (err.name === 'BucketAlreadyOwnedByYou' || err.Code === 'BucketAlreadyExists') {
      console.log(`ℹ️  Bucket ${BUCKET_NAME} 已存在`);
    } else {
      throw err;
    }
  }
}

async function uploadVideo(client, fileName, videoId) {
  const filePath = path.join(VIDEO_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${fileName}，跳过`);
    return null;
  }

  const fileContent = fs.readFileSync(filePath);
  const key = `${videoId}.mp4`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: 'video/mp4',
      })
    );

    const videoUrl = `${MINIO_CONFIG.endpoint}/${BUCKET_NAME}/${key}`;
    console.log(`✅ 上传成功: ${fileName} -> ${videoUrl}`);

    return videoUrl;
  } catch (err) {
    console.error(`❌ 上传失败: ${fileName}`, err.message);
    return null;
  }
}

async function updateReferenceVideosData(uploadedVideos) {
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

  let content = fs.readFileSync(dataFilePath, 'utf-8');

  // 更新每个视频的 videoUrl
  for (const [videoId, videoUrl] of Object.entries(uploadedVideos)) {
    const regex = new RegExp(`id: '${videoId}',[\\s\\S]*?videoUrl: '[^']*'`, 'g');
    content = content.replace(regex, (match) => {
      return match.replace(/videoUrl: '[^']*'/, `videoUrl: '${videoUrl}'`);
    });
  }

  fs.writeFileSync(dataFilePath, content, 'utf-8');
  console.log('✅ 更新配置文件完成');
}

async function main() {
  console.log('🚀 开始上传参考视频到 MinIO\n');

  // 检查视频目录
  if (!fs.existsSync(VIDEO_DIR)) {
    console.log(`📁 创建视频目录: ${VIDEO_DIR}`);
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  const files = fs.readdirSync(VIDEO_DIR);
  console.log(`📂 发现 ${files.length} 个文件\n`);

  // 创建 S3 客户端
  const client = new S3Client(MINIO_CONFIG);

  // 创建 bucket
  await createBucketIfNotExists(client);

  // 上传所有视频
  const uploadedVideos = {};
  for (const [fileName, videoId] of Object.entries(VIDEO_MAPPING)) {
    const videoUrl = await uploadVideo(client, fileName, videoId);
    if (videoUrl) {
      uploadedVideos[videoId] = videoUrl;
    }
  }

  console.log(`\n📊 上传完成: ${Object.keys(uploadedVideos).length}/8 个视频`);

  if (Object.keys(uploadedVideos).length > 0) {
    console.log('\n📝 更新配置文件...');
    await updateReferenceVideosData(uploadedVideos);
  }

  console.log('\n✨ 全部完成！');
  console.log('\n💡 提示:');
  console.log('   1. 访问 MinIO Console: http://localhost:9001');
  console.log('   2. 可以手动调整视频的访问权限为 public');
  console.log('   3. 重启后端服务以应用更改: npm run dev:backend');
}

main().catch((err) => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
