# 优质视频分析器 - 待完成工作清单

## 已完成（无需修改）

✅ 后端 API（6个接口全部测试通过）  
✅ 前端 UI（主页 + 详情页）  
✅ 数据库设计 + 迁移  
✅ 路由配置  
✅ TypeScript 类型定义  
✅ 完整文档  

---

## 待完成工作

### 1. 登录后完整测试（优先级：高，难度：低）

**步骤：**
1. 启动前后端服务
2. 登录系统（非游客模式）
3. 访问：http://localhost:5173/viral-analyzer
4. 上传一个视频文件（MP4/MOV）
5. 检查是否出现在列表中
6. 点击卡片查看详情
7. 验证拆解报告正确显示
8. 点击"生成同款 AI 剧本"按钮
9. 验证跳转到剧本编辑页面

**可能需要修复的问题：**
- 如果上传失败：检查浏览器控制台 → Network → 看是否有 401 错误
- 如果视频不播放：检查视频路径是否正确
- 如果状态不更新：手动刷新页面

**相关文件：**
- 测试指南：`VIRAL_ANALYZER_FRONTEND_TEST.md`
- API 文档：`VIRAL_ANALYZER_API.md`

---

### 2. 真实 AI 视频分析（优先级：中，难度：中）

**当前状态：**
- 使用 Mock 数据（5秒后返回固定结果）
- 位置：`backend/src/modules/viral-analyzer/viral-analyzer.service.ts:48`

**需要实现：**

#### Step 1: 视频关键帧提取
```bash
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg
npm install @types/fluent-ffmpeg -D
```

```typescript
// backend/src/modules/viral-analyzer/video-analyzer.helper.ts
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function extractKeyFrames(videoPath: string, outputDir: string): Promise<string[]> {
  // 提取 10 个关键帧
  const frames: string[] = [];
  for (let i = 0; i < 10; i++) {
    const timestamp = i * 3; // 每 3 秒一帧
    const framePath = `${outputDir}/frame-${i}.jpg`;
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: `frame-${i}.jpg`,
          folder: outputDir,
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    frames.push(framePath);
  }
  
  return frames;
}
```

#### Step 2: 调用多模态 LLM

```typescript
// backend/src/modules/viral-analyzer/ai-analyzer.service.ts
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';

export class AIAnalyzerService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyzeVideo(frames: string[]): Promise<AnalysisResult> {
    // 将图片转为 base64
    const imageBlocks = frames.map((framePath) => {
      const imageData = fs.readFileSync(framePath);
      const base64 = imageData.toString('base64');
      
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/jpeg' as const,
          data: base64,
        },
      };
    });

    const prompt = `
分析这个短视频的创作手法，提取以下信息：

1. HOOK（前 3 秒）：
   - 时间范围（如 "00:00 — 00:03"）
   - Hook 内容描述

2. SELLING POINTS（卖点）：
   - 列出 3-5 个核心卖点
   - 每个卖点简洁明确

3. PACING（节奏）：
   - 分析分镜数量和节奏
   - 例如："9 个分镜 / 30 秒，平均 3.3s 一镜"

4. STYLE（风格）：
   - 视觉风格描述
   - 色调、灯光、构图特点

5. 创作因子（映射到 5 个维度）：
   - visual_style: 极简主义 / 电影感 / 生活化 / 商业感
   - opener: 悬念诱导 / 问题抛出 / 场景代入 / 直击痛点
   - narration: 冷静知性 / 激情澎湃 / 亲和温暖 / 幽默诙谐
   - pacing: 快节奏（3s/镜） / 中节奏（5s/镜） / 慢节奏（7s+/镜）
   - cta: 限时优惠 / 立即购买 / 了解更多 / 关注账号

请以 JSON 格式返回，结构如下：
{
  "hook": {
    "time_range": "00:00 — 00:03",
    "content": "..."
  },
  "selling_points": ["...", "...", "..."],
  "pacing": "...",
  "style": "...",
  "creative_factors": {
    "visual_style": "...",
    "opener": "...",
    "narration": "...",
    "pacing": "...",
    "cta": "..."
  }
}
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // 提取 JSON（可能被包裹在 ```json ``` 中）
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) || [null, content.text];
      return JSON.parse(jsonMatch[1]);
    }

    throw new Error('AI 分析失败');
  }
}
```

#### Step 3: 集成到 Service

替换 `viral-analyzer.service.ts` 的 `startAnalysis` 方法：

```typescript
private async startAnalysis(videoId: string): Promise<void> {
  try {
    await this.analyzedVideoRepo.update(videoId, { status: 'analyzing' });

    const video = await this.analyzedVideoRepo.findOne({ where: { id: videoId } });
    
    // 1. 提取关键帧
    const framesDir = path.join(process.cwd(), '../uploads/temp-frames', videoId);
    fs.mkdirSync(framesDir, { recursive: true });
    
    const frames = await extractKeyFrames(video.videoPath, framesDir);
    
    // 2. AI 分析
    const aiAnalyzer = new AIAnalyzerService();
    const result = await aiAnalyzer.analyzeVideo(frames);
    
    // 3. 更新数据库
    await this.analyzedVideoRepo.update(videoId, {
      status: 'completed',
      analysis: {
        hook: result.hook,
        selling_points: result.selling_points,
        pacing: result.pacing,
        style: result.style,
      },
      creativeFactors: result.creative_factors,
    });
    
    // 4. 清理临时文件
    fs.rmSync(framesDir, { recursive: true });
    
    this.logger.log(`视频分析完成: ${videoId}`);
  } catch (error) {
    this.logger.error(`视频分析失败: ${videoId}`, error);
    await this.analyzedVideoRepo.update(videoId, {
      status: 'failed',
      errorMessage: error.message,
    });
  }
}
```

**需要的环境变量：**
```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-xxx
```

**预计时间**：3-4 小时

---

### 3. 缩略图自动生成（优先级：低，难度：低）

**位置**：`backend/src/modules/viral-analyzer/viral-analyzer.service.ts:48`

**实现**：

```typescript
// 在 startAnalysis 方法中添加
const thumbnailPath = path.join(
  process.cwd(),
  '../uploads/analyzed-videos/thumbnails',
  `${videoId}.jpg`
);

fs.mkdirSync(path.dirname(thumbnailPath), { recursive: true });

await new Promise((resolve, reject) => {
  ffmpeg(video.videoPath)
    .screenshots({
      timestamps: ['00:00:01'],
      filename: `${videoId}.jpg`,
      folder: path.dirname(thumbnailPath),
    })
    .on('end', resolve)
    .on('error', reject);
});

// 更新数据库
await this.analyzedVideoRepo.update(videoId, {
  thumbnailPath,
});
```

**预计时间**：1 小时

---

### 4. 与剧本生成的集成测试（优先级：高，难度：低）

**测试步骤：**
1. 上传并分析一个视频
2. 查看详情页
3. 点击"生成同款 AI 剧本"按钮
4. 验证跳转到 `/script-studio` 页面
5. 打开浏览器控制台，执行：
   ```javascript
   JSON.parse(sessionStorage.getItem('genebank_applied'))
   ```
6. 验证创作因子是否正确保存
7. 在剧本编辑器中生成剧本
8. 验证生成的剧本是否应用了创作因子

**可能需要修改：**
- 检查 `frontend/src/pages/ScriptStudio/index.tsx` 是否读取 `genebank_applied`
- 确保剧本生成 API 接收并应用创作因子

**预计时间**：1 小时

---

## 联系方式

如有问题，可以：
1. 查看文档：`VIRAL_ANALYZER_API.md`、`VIRAL_ANALYZER_FRONTEND_TEST.md`
2. 查看代码注释（所有关键代码都有注释）
3. 运行测试：`npm test`（后端）

---

**Good Luck! 🚀**
