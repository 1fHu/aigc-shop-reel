import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getAllReferenceVideos, getReferenceVideoById } from './data/reference-videos.data';
import {
  ReferenceVideo,
  CreativeFactors,
  VisualStyleLabels,
  OpeningMethodLabels,
  NarrationStyleLabels,
  PaceDensityLabels,
  CTAFormLabels,
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

  /**
   * 获取所有参考视频列表
   */
  getAllReferenceVideos(): ReferenceVideo[] {
    this.logger.log('获取所有参考视频');
    return getAllReferenceVideos();
  }

  /**
   * 根据 ID 获取参考视频详情
   */
  getReferenceVideoById(id: string): ReferenceVideo {
    this.logger.log(`获取参考视频: ${id}`);
    const video = getReferenceVideoById(id);
    if (!video) {
      throw new NotFoundException(`参考视频 ${id} 不存在`);
    }
    return video;
  }

  /**
   * 获取参考视频的创作因子（带中文标签）
   */
  getFactorsWithLabels(videoId: string): FactorLabelItem[] {
    const video = this.getReferenceVideoById(videoId);
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
      '',
      `5. CTA 形式：${CTAFormLabels[factors.ctaForm]}`,
      this.getCTAFormPrompt(factors.ctaForm),
    ];

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
      direct_price: '- 最后一个分镜直接报价或显示价格\n- 配音直接说价格，例如"现在只要xx元"',
      limited_offer: '- 最后一个分镜强调限时优惠或稀缺性\n- 配音强调时间限制，例如"限时特惠，仅剩xx件"',
      soft_guide: '- 最后一个分镜温和引导，不强推销\n- 配音引导了解，例如"点击下方了解更多"',
      trust_building: '- 最后一个分镜展示信任背书（认证、评价等）\n- 配音强调可靠性，例如"已有xx万人选择"',
      urgency: '- 最后一个分镜制造紧迫感\n- 配音催促行动，例如"现在下单立即发货"',
      value_emphasis: '- 最后一个分镜强调性价比和价值\n- 配音总结价值，例如"xx元享受xx价值"',
    };
    return prompts[form];
  }
}
