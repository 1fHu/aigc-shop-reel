import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';

/**
 * AI 视频分析服务
 * 使用火山方舟 Doubao 多模态模型分析视频关键帧
 */
@Injectable()
export class AIAnalyzerService {
  private readonly logger = new Logger(AIAnalyzerService.name);
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

  constructor() {
    // 使用火山方舟 Doubao 视觉模型。统一复用项目的 VOLCANO_* 配置（与 volcano-api.service 一致），
    // 兼容旧的 ARK_* 命名作为回退。
    this.apiKey = process.env.VOLCANO_ACCESS_KEY || process.env.ARK_API_KEY || '';
    this.endpoint = process.env.VOLCANO_DOUBAO_SEED_EP || process.env.ARK_ENDPOINT || '';
    if (!this.apiKey || !this.endpoint) {
      this.logger.warn(
        'VOLCANO_ACCESS_KEY / VOLCANO_DOUBAO_SEED_EP 未配置，AI 视频拆解将返回 401',
      );
    }
  }

  /**
   * 分析视频关键帧
   * @param framePaths 关键帧图片路径数组
   * @returns 分析结果
   */
  async analyzeVideo(framePaths: string[]): Promise<AnalysisResult> {
    this.logger.log(`开始 AI 分析，共 ${framePaths.length} 帧`);

    // 将图片转为 base64
    const imageContents = framePaths.map((framePath) => {
      const imageData = fs.readFileSync(framePath);
      const base64 = imageData.toString('base64');
      return {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64}`,
        },
      };
    });

    // 构建分析提示词
    const prompt = this.buildAnalysisPrompt();

    // 调用火山方舟 API
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.endpoint,
          messages: [
            {
              role: 'user',
              content: [
                ...imageContents,
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 180000, // 3分钟超时（处理高分辨率视频）
        },
      );

      const content = response.data.choices[0].message.content;
      this.logger.log('AI 分析完成');

      // 解析 JSON 结果
      return this.parseAnalysisResult(content);
    } catch (error) {
      this.logger.error('AI 分析失败', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`AI 分析失败: ${msg}`);
    }
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(): string {
    return `
你是一位短视频创作专家。请分析这个视频的创作手法，提取以下信息：

1. **HOOK（前 3 秒）**：
   - 时间范围（格式："00:00 — 00:03"）
   - Hook 内容描述（简洁明确，50字内）

2. **SELLING POINTS（卖点）**：
   - 列出 3-5 个核心卖点
   - 每个卖点简洁明确（15字内）

3. **PACING（节奏）**：
   - 分析分镜数量和节奏
   - 例如："9 个分镜 / 30 秒，平均 3.3s 一镜，高密度叙事"

4. **STYLE（风格）**：
   - 视觉风格描述（色调、灯光、构图）
   - 30字内

5. **创作因子（映射到 5 个维度，每项只从给定选项中选一个，按字面返回）**：
   - visual_style: 电影级精致 / 生活化真实 / 简约清新 / 戏剧化冲击 / 纪录片质感 / 潮流时尚
   - opener: 直接展示 / 痛点提问 / 悬念钩子 / 故事引入 / 反差对比 / 场景铺设
   - narration: 冷静知性 / 热情推荐 / 故事叙述 / 专家解说 / 朋友分享 / 幽默诙谐
   - pacing: 快节奏 / 中节奏 / 慢节奏 / 变化节奏
   - cta: 无 / 直接报价 / 限时优惠 / 软性引导 / 信任背书 / 紧迫感 / 价值强调
     （"无"表示视频结尾没有明显的行动号召；若画面/字幕未出现购买、下单、关注等引导，请如实返回"无"，不要硬凑）

**请严格按照以下 JSON 格式返回（不要包含 markdown 代码块标记）：**

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
  }

  /**
   * 解析 AI 分析结果
   */
  private parseAnalysisResult(content: string): AnalysisResult {
    try {
      // 去除可能的 markdown 代码块标记
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 去除开头和结尾的 ```
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(jsonStr);

      // 验证必需字段
      if (!result.hook || !result.selling_points || !result.creative_factors) {
        throw new InternalServerErrorException('AI 返回的数据格式不完整');
      }

      return result;
    } catch (error) {
      this.logger.error('解析 AI 结果失败', error);
      this.logger.debug('原始内容:', content);

      // 返回默认结果
      return this.getDefaultAnalysisResult();
    }
  }

  /**
   * 获取默认分析结果（AI 失败时的降级方案）
   */
  private getDefaultAnalysisResult(): AnalysisResult {
    return {
      hook: {
        time_range: '00:00 — 00:03',
        content: '视频开场画面，吸引用户注意力',
      },
      selling_points: [
        '产品核心特点展示',
        '使用场景演示',
        '用户痛点解决',
      ],
      pacing: '中等节奏，适合观看',
      style: '简洁明快的视觉风格',
      creative_factors: {
        visual_style: '生活化真实',
        opener: '场景铺设',
        narration: '朋友分享',
        pacing: '中节奏',
        cta: '无',
      },
    };
  }
}

/**
 * AI 分析结果接口
 */
export interface AnalysisResult {
  hook: {
    time_range: string;
    content: string;
  };
  selling_points: string[];
  pacing: string;
  style: string;
  creative_factors: {
    visual_style: string;
    opener: string;
    narration: string;
    pacing: string;
    cta: string;
  };
}
