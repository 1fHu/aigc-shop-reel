import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  getAllReferenceVideos as getMockReferenceVideos,
  getReferenceVideoById as getMockReferenceVideoById,
} from './data/reference-videos.data';
import { ViralLibrary } from '../../database/entities/viral-library.entity';
import { AnalyzedVideo } from '../../database/entities/analyzed-video.entity';
import {
  ReferenceVideo,
  CreativeFactors,
  VisualStyleLabels,
  OpeningMethodLabels,
  NarrationStyleLabels,
  PaceDensityLabels,
  CTAFormLabels,
  normalizeVisualStyle,
  normalizeOpeningMethod,
  normalizeNarrationStyle,
  normalizePaceDensity,
  normalizeCTAForm,
} from './types/creative-factors.type';

export interface FactorLabelItem {
  dimension: string;
  dimensionLabel: string;
  value: string;
  valueLabel: string;
}

@Injectable()
export class GeneBankService {
  private readonly logger = new Logger(GeneBankService.name);

  constructor(
    @InjectRepository(ViralLibrary)
    private readonly viralLibraryRepo: Repository<ViralLibrary>,
    @InjectRepository(AnalyzedVideo)
    private readonly analyzedVideoRepo: Repository<AnalyzedVideo>,
  ) {}

  /**
   * 获取所有参考视频列表（内置 mock + 用户同步到基因库的视频）
   */
  async getAllReferenceVideos(): Promise<ReferenceVideo[]> {
    this.logger.log('获取所有参考视频');
    const mockVideos = getMockReferenceVideos();

    const allRecords = await this.viralLibraryRepo.find({
      where: { platform: 'user-upload' },
      order: { createdAt: 'DESC' },
    });

    // 同一视频可能被重复同步，按来源去重（createdAt DESC 排序，保留最新一条）
    const seen = new Set<string>();
    const records = allRecords.filter((r) => {
      const key = r.sourceUrl ?? r.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 批量取回对应 analyzed_videos 的真实时长
    const analyzedIds = records
      .map((r) => this.parseAnalyzedId(r.sourceUrl))
      .filter((v): v is string => !!v);
    const durationMap = new Map<string, number>();
    if (analyzedIds.length > 0) {
      const analyzed = await this.analyzedVideoRepo.find({
        where: { id: In(analyzedIds) },
        select: ['id', 'duration'],
      });
      analyzed.forEach((a) => durationMap.set(a.id, a.duration ?? 0));
    }

    const userVideos = records.map((r) => this.toReferenceVideo(r, durationMap));
    return [...mockVideos, ...userVideos];
  }

  /**
   * 根据 ID 获取参考视频详情（mock 优先，否则查用户同步库）
   */
  async getReferenceVideoById(id: string): Promise<ReferenceVideo> {
    this.logger.log(`获取参考视频: ${id}`);
    const mock = getMockReferenceVideoById(id);
    if (mock) {
      return mock;
    }

    const record = await this.viralLibraryRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`参考视频 ${id} 不存在`);
    }

    const analyzedId = this.parseAnalyzedId(record.sourceUrl);
    const durationMap = new Map<string, number>();
    if (analyzedId) {
      const analyzed = await this.analyzedVideoRepo.findOne({
        where: { id: analyzedId },
        select: ['id', 'duration'],
      });
      if (analyzed) {
        durationMap.set(analyzed.id, analyzed.duration ?? 0);
      }
    }
    return this.toReferenceVideo(record, durationMap);
  }

  /**
   * 获取参考视频的创作因子（带中文标签）
   */
  async getFactorsWithLabels(videoId: string): Promise<FactorLabelItem[]> {
    const video = await this.getReferenceVideoById(videoId);
    const factors = video.factors;

    return [
      {
        dimension: 'visualStyle',
        dimensionLabel: '视觉风格',
        value: factors.visualStyle,
        valueLabel: VisualStyleLabels[factors.visualStyle],
      },
      {
        dimension: 'openingMethod',
        dimensionLabel: '开场手法',
        value: factors.openingMethod,
        valueLabel: OpeningMethodLabels[factors.openingMethod],
      },
      {
        dimension: 'narrationStyle',
        dimensionLabel: '旁白风格',
        value: factors.narrationStyle,
        valueLabel: NarrationStyleLabels[factors.narrationStyle],
      },
      {
        dimension: 'paceDensity',
        dimensionLabel: '节奏密度',
        value: factors.paceDensity,
        valueLabel: PaceDensityLabels[factors.paceDensity],
      },
      {
        dimension: 'ctaForm',
        dimensionLabel: 'CTA 形式',
        value: factors.ctaForm,
        valueLabel: CTAFormLabels[factors.ctaForm],
      },
    ];
  }

  /**
   * 将创作因子转换为 prompt 增强文本
   * 这个文本会被注入到 director-agent 的 prompt 中
   */
  factorsToPromptEnhancement(factors: CreativeFactors): string {
    const parts: string[] = [
      '请严格按照以下创作因子生成剧本：',
      '',
      `1. 视觉风格：${VisualStyleLabels[factors.visualStyle]}`,
      this.getVisualStylePrompt(factors.visualStyle),
      '',
      `2. 开场手法：${OpeningMethodLabels[factors.openingMethod]}`,
      this.getOpeningMethodPrompt(factors.openingMethod),
      '',
      `3. 旁白风格：${NarrationStyleLabels[factors.narrationStyle]}`,
      this.getNarrationStylePrompt(factors.narrationStyle),
      '',
      `4. 节奏密度：${PaceDensityLabels[factors.paceDensity]}`,
      this.getPaceDensityPrompt(factors.paceDensity),
    ];

    // CTA 形式为可选：仅当因子明确指定（非 none）时才注入行动号召指导，
    // 否则不加 CTA，保持平缓真实的种草氛围（默认无 CTA）。
    if (factors.ctaForm !== 'none') {
      parts.push('', `5. CTA 形式：${CTAFormLabels[factors.ctaForm]}`, this.getCTAFormPrompt(factors.ctaForm));
    }

    return parts.join('\n');
  }

  // ========== 各维度的详细 prompt 指导 ==========

  private getVisualStylePrompt(style: CreativeFactors['visualStyle']): string {
    const prompts = {
      cinematic: '- 画面描述应强调电影级构图、精致灯光、景深效果\n- 使用"特写镜头"、"柔光"、"质感"等词汇',
      lifestyle: '- 画面描述应展现真实生活场景、自然光线、亲切感\n- 使用"日常"、"温馨"、"真实使用"等词汇',
      minimal: '- 画面描述应强调简洁背景、产品突出、干净构图\n- 使用"极简"、"纯色背景"、"产品居中"等词汇',
      dramatic: '- 画面描述应强调强烈对比、动态效果、视觉冲击\n- 使用"戏剧性"、"高对比"、"爆发感"等词汇',
      documentary: '- 画面描述应展现纪实风格、自然记录、过程展示\n- 使用"真实记录"、"过程"、"细节特写"等词汇',
      trendy: '- 画面描述应体现时尚潮流、色彩鲜明、年轻活力\n- 使用"时尚"、"潮流"、"多彩"等词汇',
    };
    return prompts[style];
  }

  private getOpeningMethodPrompt(method: CreativeFactors['openingMethod']): string {
    const prompts = {
      direct_display: '- 第一个分镜直接展示产品核心卖点或外观\n- 开场配音直入主题，例如"这就是xxx"',
      pain_point: '- 第一个分镜以问题或痛点场景开场\n- 开场配音用提问句，例如"你是不是也遇到过xxx问题？"',
      suspense_hook: '- 第一个分镜制造悬念或好奇心\n- 开场配音留悬念，例如"你绝对想不到xxx"',
      story_intro: '- 第一个分镜以故事背景或人物引入\n- 开场配音讲故事，例如"自从我遇到了xxx"',
      contrast: '- 第一个分镜展示使用前后对比或反差\n- 开场配音强调对比，例如"以前xxx，现在xxx"',
      scene_setting: '- 第一个分镜铺设使用场景或环境\n- 开场配音描述场景，例如"在xxx场景下"',
    };
    return prompts[method];
  }

  private getNarrationStylePrompt(style: CreativeFactors['narrationStyle']): string {
    const prompts = {
      calm_rational: '- 配音文案使用理性、客观、专业的语气\n- 避免感叹号，多用陈述句，例如"这款产品采用了xxx技术"',
      enthusiastic: '- 配音文案使用热情、推荐、积极的语气\n- 可以使用感叹号，例如"真的太好用了！强烈推荐！"',
      storytelling: '- 配音文案以叙事方式展开，有情节递进\n- 使用"后来"、"结果"、"最后"等连接词',
      expert: '- 配音文案以专家角度讲解，强调专业性\n- 使用专业术语和数据，例如"根据测试数据显示"',
      friendly: '- 配音文案像朋友分享，亲切随意\n- 使用"我发现"、"真心觉得"、"跟你说"等口语化表达',
      humorous: '- 配音文案带有幽默元素，轻松活泼\n- 可以使用比喻、夸张、俏皮话',
    };
    return prompts[style];
  }

  private getPaceDensityPrompt(density: CreativeFactors['paceDensity']): string {
    const prompts = {
      fast: '- 分镜数量：5-6个，每个分镜时长 2-3 秒\n- 配音节奏快，信息密集，多用短句',
      medium: '- 分镜数量：4-5个，每个分镜时长 3-4 秒\n- 配音节奏适中，信息量平衡',
      slow: '- 分镜数量：3-4个，每个分镜时长 5-6 秒\n- 配音节奏慢，详细讲解，留有停顿',
      varied: '- 分镜数量：4-5个，时长有变化（2-5秒混合）\n- 配音节奏有快有慢，根据内容调整',
    };
    return prompts[density];
  }

  private getCTAFormPrompt(form: CreativeFactors['ctaForm']): string {
    const prompts = {
      none: '- 不要加入行动号召分镜，结尾以产品展示或信任背书自然收束',
      direct_price: '- 最后一个分镜直接报价或显示价格\n- 配音直接说价格，例如"现在只要xx元"',
      limited_offer: '- 最后一个分镜强调限时优惠或稀缺性\n- 配音强调时间限制，例如"限时特惠，仅剩xx件"',
      soft_guide: '- 最后一个分镜温和引导，不强推销\n- 配音引导了解，例如"点击下方了解更多"',
      trust_building: '- 最后一个分镜展示信任背书（认证、评价等）\n- 配音强调可靠性，例如"已有xx万人选择"',
      urgency: '- 最后一个分镜制造紧迫感\n- 配音催促行动，例如"现在下单立即发货"',
      value_emphasis: '- 最后一个分镜强调性价比和价值\n- 配音总结价值，例如"xx元享受xx价值"',
    };
    return prompts[form];
  }

  // ========== 用户同步视频 → ReferenceVideo 映射 ==========

  /** 从 sourceUrl（/api/viral-analyzer/videos/:id/stream）解析 analyzed video id */
  private parseAnalyzedId(sourceUrl?: string | null): string | null {
    if (!sourceUrl) return null;
    const m = /\/videos\/([^/]+)\/stream/.exec(sourceUrl);
    return m ? m[1] : null;
  }

  /**
   * 把用户同步到基因库的 viral_library 记录映射为 ReferenceVideo。
   * 视频/缩略图统一走 viral-analyzer 端点（已支持 Range 播放），
   * AI 产出的中文创作因子按关键词归一到 genebank 的枚举值。
   */
  private toReferenceVideo(
    record: ViralLibrary,
    durationMap: Map<string, number>,
  ): ReferenceVideo {
    const report = (record.analysisReport ?? {}) as {
      style?: string;
      creative_factors?: {
        visual_style?: string;
        opener?: string;
        narration?: string;
        pacing?: string;
        cta?: string;
      };
    };
    const raw = report.creative_factors ?? {};
    const analyzedId = this.parseAnalyzedId(record.sourceUrl);

    const videoUrl = analyzedId
      ? `/api/viral-analyzer/videos/${analyzedId}/stream`
      : record.sourceUrl ?? '';
    const thumbnailUrl = analyzedId
      ? `/api/viral-analyzer/videos/${analyzedId}/thumbnail`
      : record.thumbnailUrl ?? '';

    return {
      id: record.id,
      title: record.title ?? '未命名视频',
      description: report.style ?? '',
      thumbnailUrl,
      videoUrl,
      duration: (analyzedId && durationMap.get(analyzedId)) || 0,
      factors: {
        visualStyle: normalizeVisualStyle(raw.visual_style),
        openingMethod: normalizeOpeningMethod(raw.opener),
        narrationStyle: normalizeNarrationStyle(raw.narration),
        paceDensity: normalizePaceDensity(raw.pacing),
        ctaForm: normalizeCTAForm(raw.cta),
      },
      category: '用户上传',
      sourceUrl: record.sourceUrl ?? undefined,
      createdAt: (record.createdAt ?? new Date()).toISOString(),
    };
  }
}
