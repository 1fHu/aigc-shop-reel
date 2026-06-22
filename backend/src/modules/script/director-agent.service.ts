import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ScriptShot } from './script.service';
import { ResolvedCreativeFactors } from '../gene-bank/types/creative-factors.type';
import { GeneBankService } from '../gene-bank/gene-bank.service';

/** 允许的运镜方式（AI 越界时归一化到 static） */
const CAMERA_MOTIONS = ['push-in', 'static', 'tracking', 'pan', 'zoom-out', 'handheld'];

/** 创作策略中文标签（喂给 LLM 用） */
const STRATEGY_LABELS: Record<string, string> = {
  pain_point: '痛点共鸣',
  review: '产品测评',
  story: '情感故事',
  promotion: '限时促销',
};

/**
 * 导演 Agent —— 根据商品信息 + 创作策略 + 创作因子生成多分镜带货脚本。
 *
 * 真实路径：调用 Doubao（火山方舟 Ark Chat Completions）让模型产出 JSON 分镜数组。
 * 降级路径：未配置 API Key / 调用或解析失败时，回退到「商品感知」的模板分镜
 *           （引用商品名 / 卖点 / 场景，至少与具体商品相关，而非写死文案）。
 *
 * 仅服务于剧本（Script）模块，不涉及视频生成阶段。
 */
@Injectable()
export class DirectorAgentService {
  private readonly logger = new Logger(DirectorAgentService.name);
  private readonly apiKey: string;
  private readonly doubaoEp: string;

  constructor(
    private readonly config: ConfigService,
    private readonly geneBank: GeneBankService,
  ) {
    this.apiKey = this.config.get<string>('VOLCANO_ACCESS_KEY', '');
    this.doubaoEp = this.config.get<string>('VOLCANO_DOUBAO_SEED_EP', '');
  }

  /**
   * 生成分镜脚本（多镜头）。返回归一化后的 ScriptShot[]。
   * creativeFactors 必传（调用方保证：无因子时传空解析结果 resolveCreativeFactors({})），
   * 故内部无需再判空。
   */
  async generateStoryboard(
    productInfo: Record<string, unknown>,
    strategyType: string,
    creativeFactors: ResolvedCreativeFactors,
  ): Promise<ScriptShot[]> {
    const aiShots = await this.callDoubao(productInfo, strategyType, creativeFactors);
    if (aiShots && aiShots.length > 0) {
      const normalized = this.normalize(aiShots);
      if (normalized.length > 0) {
        this.logger.log(`Director agent: AI 生成 ${normalized.length} 个分镜`);
        return normalized;
      }
    }
    this.logger.warn('Director agent: 降级到商品感知模板分镜');
    return this.fallback(productInfo, strategyType);
  }

  /** 单镜重生：根据上下文（前后分镜 + 商品信息 + 创作因子）用 AI 重写一个分镜 */
  async regenerateShot(
    productInfo: Record<string, unknown>,
    storyboard: ScriptShot[],
    shotIndex: number,
    creativeFactors: ResolvedCreativeFactors,
  ): Promise<ScriptShot | null> {
    const shot = storyboard.find((s) => s.index === shotIndex);
    if (!shot) return null;
    const prevShot = storyboard.find((s) => s.index === shotIndex - 1);
    const nextShot = storyboard.find((s) => s.index === shotIndex + 1);

    const aiShot = await this.callDoubaoRegenerate(productInfo, shot, prevShot, nextShot, creativeFactors);
    if (aiShot) {
      const [normalized] = this.normalize([aiShot]);
      if (normalized) return normalized;
    }
    // 降级：轻微调整原分镜文案
    this.logger.warn(`Director agent: 单镜重生降级，shot#${shotIndex}`);
    return { ...shot, voiceover: shot.voiceover ? `${shot.voiceover}（优化）` : '', description: shot.description ? `${shot.description}（优化）` : '' };
  }

  /** 调用 Doubao 重写单个分镜 */
  private async callDoubaoRegenerate(
    productInfo: Record<string, unknown>,
    target: ScriptShot,
    prevShot: ScriptShot | undefined,
    nextShot: ScriptShot | undefined,
    creativeFactors: ResolvedCreativeFactors,
  ): Promise<Partial<ScriptShot> | null> {
    if (!this.apiKey || !this.doubaoEp) return null;
    const contextParts: string[] = [];
    if (prevShot) contextParts.push(`前一镜：${prevShot.description}（配音：${prevShot.voiceover || '无'}）`);
    if (nextShot) contextParts.push(`后一镜：${nextShot.description}（配音：${nextShot.voiceover || '无'}）`);
    const context = contextParts.length ? `\n上下文（用于保持连贯）：\n${contextParts.join('\n')}` : '';

    // 注入本片整体创作因子：重生的分镜需与全片视觉风格/口播语气统一。
    // 开场/节奏/CTA 属整体设定，框定为"仅供参考"，避免在中间镜强行套用首镜/全片级指令。
    const factorPrompt = this.geneBank.factorsToPromptEnhancement(creativeFactors);

    const prompt = `你是 TikTok 电商带货短视频导演。请重写下面这个分镜，保持风格和前后连贯，但文案/运镜要有变化。
${context}
当前分镜：
- 画面：${target.description}
- 配音：${target.voiceover || '无'}
- 运镜：${target.camera_motion || 'static'}
- 时长：${target.duration || 3}秒

商品信息：${JSON.stringify(productInfo)}

【本片整体创作因子】请让本镜在视觉风格与口播语气上与之统一；其中开场手法、节奏密度为整体结构设定，本镜不必强行体现；但 CTA 约束必须严格遵守（尤其当 CTA 为"无"时，本镜也不得出现任何下单引导或折扣/促销/价格信息）：
${factorPrompt}

返回一个 JSON 对象（不是数组）：
{"description":"新的画面描述(中文一句话)","camera_motion":"push-in/static/tracking/pan/zoom-out/handheld","duration":秒数(2-5)","voiceover":"新的口播文案(中文)","subtitle":"新的字幕(简短)"}
只返回 JSON 对象本身，不要 markdown，不要额外文字。`;
    // give me log for prompt
    // this.logger.log(`prompt for regeneration: ${prompt}`);
    try {
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.doubaoEp,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
        }),
      });
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content || '';
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]);
    } catch (err) {
      this.logger.warn(`Doubao 单镜重生失败: ${(err as Error).message}`);
      return null;
    }
  }

  /** 调用 Doubao 生成分镜 JSON 数组；不可用或失败返回 null */
  private async callDoubao(
    productInfo: Record<string, unknown>,
    strategyType: string,
    creativeFactors: ResolvedCreativeFactors,
  ): Promise<Partial<ScriptShot>[] | null> {
    if (!this.apiKey || !this.doubaoEp) return null;
    const strategy = STRATEGY_LABELS[strategyType] || strategyType || '通用带货';

    // 基础 prompt
    let prompt = `你是 TikTok 电商带货短视频的导演。请基于商品信息和创作策略，生成 4-6 个分镜的脚本。
严格只返回一个 JSON 数组，数组每个元素格式：
{"description":"画面内容(中文一句话)","camera_motion":"运镜方式，取值之一: push-in/static/tracking/pan/zoom-out/handheld","duration":分镜时长秒数(4-8的整数),"voiceover":"口播文案(中文)","subtitle":"字幕(中文，简短)"}
分镜应按顺序覆盖：抓眼球的开场 Hook → 产品外观/卖点特写 → 使用场景或效果展示 → 细节/信任背书
创作策略：${strategy}
商品信息：${JSON.stringify(productInfo)}`;

    // 创作因子指导（CTA 是否出现/是否「无」由因子统一承载，含对折扣促销信息的禁止）
    const factorPrompt = this.geneBank.factorsToPromptEnhancement(creativeFactors);
    prompt += `\n\n【重要】请严格遵循以下创作因子：\n${factorPrompt}`;
    this.logger.log('应用创作因子到 prompt');

    prompt += '\n\n只返回 JSON 数组本身，不要 markdown 代码块，不要任何额外说明文字。';

    try {
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.doubaoEp,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500, // 增加 token 数以支持更详细的因子指导
        }),
      });
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content || '';
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      this.logger.warn(`Doubao 分镜生成失败: ${(err as Error).message}`);
      return null;
    }
  }

  /** 把 AI 原始输出归一化成合法 ScriptShot[]（修正越界值、补默认、重排 index） */
  private normalize(raw: Partial<ScriptShot>[]): ScriptShot[] {
    return raw
      .filter((s) => typeof s?.description === 'string' && s.description.trim())
      .map((s, index) => {
        const motion =
          typeof s.camera_motion === 'string' && CAMERA_MOTIONS.includes(s.camera_motion)
            ? s.camera_motion
            : 'static';
        const duration = Number.isFinite(s.duration as number)
          ? Math.min(12, Math.max(4, Math.round(s.duration as number)))
          : 4;
        return {
          index,
          description: (s.description as string).trim(),
          camera_motion: motion,
          duration,
          voiceover: typeof s.voiceover === 'string' ? s.voiceover : '',
          subtitle: typeof s.subtitle === 'string' ? s.subtitle : '',
          bgm: typeof s.bgm === 'string' ? s.bgm : 'Modern Beat',
          reference_image_url: null,
          // 素材绑定默认空，由 ScriptService.recallMaterialsForShots 向量召回后回填
          material_id: null,
          material_use_mode: 'none',
          material_score: null,
          adapted_image_url: null,
        };
      });
  }

  /** 商品感知的降级模板：引用商品名 / 卖点 / 场景，保证多分镜且与具体商品相关 */
  private fallback(productInfo: Record<string, unknown>, strategyType: string): ScriptShot[] {
    const name = (productInfo.name as string) || '这款好物';
    const points = Array.isArray(productInfo.selling_points)
      ? (productInfo.selling_points as string[]).filter((p) => typeof p === 'string' && p.trim())
      : [];
    const audience = (productInfo.target_audience as string) || '懂生活的你';
    const scene = (productInfo.usage_scene as string) || '日常使用';

    const hookByStrategy: Record<string, string> = {
      pain_point: `还在被同类问题困扰？${name} 帮你解决`,
      review: `${name} 真的好用吗？实测告诉你`,
      story: `自从用了 ${name}，生活有了小确幸`,
      promotion: `${name} 限时福利，错过等一年`,
    };
    const hook = hookByStrategy[strategyType] || `${name} 凭什么这么多人买？`;

    // 素材绑定字段由下方 map 统一补默认（向量召回后回填），此处模板对象不含它们
    const shots: Array<Omit<ScriptShot, 'index' | 'material_id' | 'material_use_mode' | 'material_score' | 'adapted_image_url'>> = [
      {
        description: `开场 Hook：${hook}`,
        camera_motion: 'push-in',
        duration: 4,
        voiceover: hook,
        subtitle: '别划走',
        bgm: 'Modern Beat',
        reference_image_url: null,
      },
      {
        description: `${name} 产品外观与核心卖点特写`,
        camera_motion: 'static',
        duration: 4,
        voiceover: points[0] ? `它最大的亮点就是${points[0]}` : `${name} 的设计很有诚意`,
        subtitle: points[0] || '核心卖点',
        bgm: 'Modern Beat',
        reference_image_url: null,
      },
      {
        description: `使用场景演示：${scene}`,
        camera_motion: 'tracking',
        duration: 4,
        voiceover: `${scene}，用起来格外顺手`,
        subtitle: scene,
        bgm: 'Modern Beat',
        reference_image_url: null,
      },
      {
        description: points[1] ? `卖点细节展示：${points[1]}` : `适合人群：${audience}`,
        camera_motion: 'push-in',
        duration: 4,
        voiceover: points[1] ? `而且${points[1]}` : `特别适合${audience}`,
        subtitle: points[1] || audience,
        bgm: 'Modern Beat',
        reference_image_url: null,
      },
    ];

    return shots.map((shot, index) => ({
      ...shot,
      index,
      // 素材绑定默认空，由 ScriptService.recallMaterialsForShots 向量召回后回填
      material_id: null,
      material_use_mode: 'none' as const,
      material_score: null,
      adapted_image_url: null,
    }));
  }
}
