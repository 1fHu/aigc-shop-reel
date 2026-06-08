#!/usr/bin/env node
/* eslint-disable */
/**
 * 手动调试脚本：复刻 VideoService.compositeShot 的「画面 + 音频 + 字幕」合成逻辑。
 *
 * 为什么不直接 import VideoService？
 *   - 该方法是 private，且 video.service.ts 带 @Injectable 装饰器 + 整条 NestJS 依赖图，
 *     无 ts-node/tsx 无法单独跑。这里把 compositeShot 里那段 ffmpeg 命令「逐字搬出来」，
 *     用同样的 buildArgs / 同样的 subtitles force_style 滤镜 / 同样的 ASS 颜色转换，
 *     这样跑出来的就是线上同一条 ffmpeg 命令。
 *
 * 和线上方法的唯一区别（故意为之，便于调试）：
 *   - 线上 compositeShot 失败时 stderr 只截 200 字 + 直接 return 原始片段（吞掉错误）。
 *   - 本脚本打印「完整命令 + 完整 stderr」，失败就非 0 退出，绝不静默兜底。
 *
 * 用法:
 *   node scripts/test-composite.js                 # 随机挑一个 shot- 片段
 *   node scripts/test-composite.js <视频文件名或绝对路径>   # 指定片段
 *   FFMPEG_PATH=/path/to/ffmpeg node scripts/test-composite.js  # 指定 ffmpeg 二进制
 *
 * 退出码: 0 成功 / 1 失败（含完整 ffmpeg stderr）。
 */
const { spawn, spawnSync } = require('child_process');
const { readdirSync, existsSync, writeFileSync, statSync, unlinkSync } = require('fs');
const { join, basename, isAbsolute } = require('path');

// uploads/videos：scripts 在 backend/scripts → 仓库根 = ../../
const VIDEO_DIR = join(__dirname, '..', '..', 'uploads', 'videos');
// 与后端一致：FFMPEG_PATH > @ffmpeg-installer(带 libass) > 裸 ffmpeg
function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return 'ffmpeg'; }
}
const FFMPEG = resolveFfmpeg();

// 与线上一致的字幕样式默认值（compositeShot 里的取值）
const subtitleStyle = {
  font_size: 40,
  outline: 2.5,
  color: '#FFFFFF',
  font_family: process.env.SUBTITLE_FONT_FAMILY
    || (process.platform === 'win32' ? 'Microsoft YaHei'
      : process.platform === 'darwin' ? 'PingFang SC'
      : 'Noto Sans CJK SC'),
};

function log(...a) { console.log('[test-composite]', ...a); }

// ---- 0. 探测 ffmpeg 与 libass（subtitles 滤镜） ----
function checkFfmpeg() {
  const ver = spawnSync(FFMPEG, ['-hide_banner', '-version'], { encoding: 'utf-8' });
  if (ver.error) {
    log(`✗ 找不到 ffmpeg (${FFMPEG}): ${ver.error.message}`);
    process.exit(1);
  }
  log(`ffmpeg = ${FFMPEG}`);
  log('  ' + (ver.stdout || '').split('\n')[0]);
  const filters = spawnSync(FFMPEG, ['-hide_banner', '-filters'], { encoding: 'utf-8' });
  const hasSubs = /\bsubtitles\b/i.test(filters.stdout || '');
  log(`  subtitles 滤镜(libass): ${hasSubs ? '✓ 可用' : '✗ 缺失'}`);
  if (!hasSubs) {
    log('  ⚠️ 当前 ffmpeg 不带 libass → 烧字幕会失败。可改用自带 libass 的二进制：');
    log('     FFMPEG_PATH=$(node -e "console.log(require(\'@ffmpeg-installer/ffmpeg\').path)") \\');
    log('       node scripts/test-composite.js');
  }
  return hasSubs;
}

// ---- 1. 随机挑一个 shot- 片段 ----
function pickVideo() {
  const arg = process.argv[2];
  if (arg) {
    const p = isAbsolute(arg) ? arg : join(VIDEO_DIR, arg);
    if (!existsSync(p)) { log(`✗ 指定的视频不存在: ${p}`); process.exit(1); }
    return p;
  }
  if (!existsSync(VIDEO_DIR)) { log(`✗ 视频目录不存在: ${VIDEO_DIR}`); process.exit(1); }
  const shots = readdirSync(VIDEO_DIR).filter(
    (f) => /-shot-\d+\.mp4$/.test(f) && !f.includes('-composited'),
  );
  if (!shots.length) { log(`✗ ${VIDEO_DIR} 下没有 shot- 片段`); process.exit(1); }
  const pick = shots[Math.floor(Math.random() * shots.length)];
  log(`随机选中片段: ${pick}  (共 ${shots.length} 个候选)`);
  return join(VIDEO_DIR, pick);
}

// ---- 2. 准备字幕(SRT)：用户要求「自己准备一个字幕烧进去」 ----
//      格式与 ttsWordsToSRT 产出的一致（序号 / hh:mm:ss,mmm / 文本）。
function writeSubtitle(srtPath) {
  const srt = [
    '1', '00:00:00,200 --> 00:00:02,000', '家人们 这款产品真的绝了', '',
    '2', '00:00:02,000 --> 00:00:04,200', '今天直接给你们打到骨折价', '',
    '3', '00:00:04,200 --> 00:00:06,500', '点击下方小黄车马上抢', '',
  ].join('\n');
  writeFileSync(srtPath, srt, 'utf-8');
  log(`已写入字幕: ${basename(srtPath)} (3 句中文)`);
}

// ---- 3. 准备音频：用 ffmpeg 生成一段 6s 测试音(正弦波) 模拟 TTS 配音 ----
//      （线上是下载 tts.audioUrl；这里本地造一段，避免依赖 TTS/MinIO/API Key）
function makeAudio(audioPath) {
  const r = spawnSync(FFMPEG, [
    '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6',
    '-c:a', 'libmp3lame', '-b:a', '128k', audioPath,
  ], { encoding: 'utf-8' });
  if (r.status !== 0) {
    log('✗ 生成测试音频失败:\n' + (r.stderr || ''));
    process.exit(1);
  }
  log(`已生成测试音频: ${basename(audioPath)} (6s sine)`);
}

// ---- 4. 复刻 compositeShot 的 buildArgs（withSubs=true：画面+音频+字幕） ----
function buildArgs(videoPath, audioPath, srtPath, outPath, withSubs) {
  const a = ['-y', '-i', videoPath, '-i', audioPath]; // hasAudio=true
  if (withSubs) {
    const srtFilterPath = basename(srtPath); // 相对路径 + cwd=VIDEO_DIR（避开 Windows 盘符 : 问题）
    const fontSize = subtitleStyle.font_size || 40;
    const outline = subtitleStyle.outline ?? 2.5;
    const color = subtitleStyle.color || '#FFFFFF';
    const fontFamily = subtitleStyle.font_family;
    // 颜色 hex #RRGGBB → ASS &H00BBGGRR（去 #，反转 RGB）—— 与 service 逐字一致
    const hex = color.replace('#', '');
    const assColor = `&H00${hex[4] || 'F'}${hex[5] || 'F'}${hex[2] || 'F'}${hex[3] || 'F'}${hex[0] || 'F'}${hex[1] || 'F'}`;
    log(`字幕样式: Fontsize=${fontSize}, Fontname=${fontFamily}, Outline=${outline}, Color=${color} → ${assColor}`);
    a.push('-vf', `subtitles=${srtFilterPath}:charenc=UTF-8:force_style='Fontsize=${fontSize},Fontname=${fontFamily},PrimaryColour=${assColor},OutlineColour=&H00000000,Outline=${outline},BorderStyle=1,MarginV=80'`);
  }
  a.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  a.push('-c:a', 'aac', '-b:a', '128k', '-map', '0:v:0', '-map', '1:a:0');
  a.push('-shortest', '-movflags', '+faststart', outPath);
  return a;
}

// 跑 ffmpeg，打印「完整」命令 + 「完整」stderr（不像线上只截 200 字）
function runFfmpeg(args, label) {
  return new Promise((resolve, reject) => {
    log(`\n=== ffmpeg (${label}) ，cwd=${VIDEO_DIR} ===`);
    log(FFMPEG + ' ' + args.map((x) => (/\s|'/.test(x) ? JSON.stringify(x) : x)).join(' ') + '\n');
    const ff = spawn(FFMPEG, args, { cwd: VIDEO_DIR });
    let stderr = '';
    ff.stderr.on('data', (d) => { const s = d.toString(); stderr += s; process.stderr.write(s); });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
}

async function main() {
  log(`VIDEO_DIR = ${VIDEO_DIR}`);
  const hasSubs = checkFfmpeg();
  const videoPath = pickVideo();

  const videoId = 'manual-test';
  const shotIndex = 0;
  const outPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-composited.mp4`);
  const audioPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-audio.mp3`);
  const srtPath = join(VIDEO_DIR, `${videoId}-shot-${shotIndex}-sub.srt`);
  const tempFiles = [audioPath, srtPath];

  writeSubtitle(srtPath);
  makeAudio(audioPath);

  try {
    // 与线上一致：只有 ffmpeg 带 libass 才烧字幕，否则只混音频
    const burnSubs = hasSubs;
    if (!hasSubs) log('⚠️ 无 libass → 本次只混音频，不烧字幕（与线上降级一致）');
    try {
      await runFfmpeg(buildArgs(videoPath, audioPath, srtPath, outPath, burnSubs), burnSubs ? '画面+音频+字幕' : '画面+音频(无字幕)');
    } catch (err) {
      if (burnSubs) {
        log(`\n✗ 烧字幕失败: ${err.message} → 降级仅混音频重试（线上也是这么兜底的）`);
        await runFfmpeg(buildArgs(videoPath, audioPath, srtPath, outPath, false), '降级:画面+音频');
      } else {
        throw err;
      }
    }
    const sz = statSync(outPath).size;
    log(`\n✓ 合成成功: ${outPath} (${(sz / 1024 / 1024).toFixed(1)} MB)`);
    log('  用播放器打开确认 画面/声音/字幕 是否都在。');
  } catch (err) {
    log(`\n✗ 合成失败（完整 stderr 见上方）: ${err.message}`);
    process.exitCode = 1;
  } finally {
    // 默认清理临时音频/字幕；想保留就设 KEEP_TEMP=1
    if (!process.env.KEEP_TEMP) {
      for (const f of tempFiles) { try { if (existsSync(f)) unlinkSync(f); } catch {} }
    } else {
      log(`KEEP_TEMP=1 → 保留临时文件: ${tempFiles.map(basename).join(', ')}`);
    }
  }
}

main();
