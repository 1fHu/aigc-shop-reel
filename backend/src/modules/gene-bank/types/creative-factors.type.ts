/**
 * 创作因子类型定义
 * 用于 Genebank 参考视频的风格标签系统
 */

/** 视觉风格 */
export type VisualStyle =
  | 'cinematic'        // 电影级精致
  | 'lifestyle'        // 生活化真实
  | 'minimal'          // 简约清新
  | 'dramatic'         // 戏剧化冲击
  | 'documentary'      // 纪录片质感
  | 'trendy';          // 潮流时尚

/** 开场手法 */
export type OpeningMethod =
  | 'direct_display'   // 直接展示
  | 'pain_point'       // 痛点提问
  | 'suspense_hook'    // 悬念钩子
  | 'story_intro'      // 故事引入
  | 'contrast'         // 反差对比
  | 'scene_setting';   // 场景铺设

/** 旁白风格 */
export type NarrationStyle =
  | 'calm_rational'    // 冷静知性
  | 'enthusiastic'     // 热情推荐
  | 'storytelling'     // 故事叙述
  | 'expert'           // 专家解说
  | 'friendly'         // 朋友分享
  | 'humorous';        // 幽默诙谐

/** 节奏密度 */
export type PaceDensity =
  | 'fast'             // 快节奏（1-2秒/镜）
  | 'medium'           // 中节奏（3-4秒/镜）
  | 'slow'             // 慢节奏（5-6秒/镜）
  | 'varied';          // 变化节奏

/** CTA 形式 */
export type CTAForm =
  | 'none'             // 无（不含行动号召，默认）
  | 'direct_price'     // 直接报价
  | 'limited_offer'    // 限时优惠
  | 'soft_guide'       // 软性引导
  | 'trust_building'   // 信任背书
  | 'urgency'          // 紧迫感
  | 'value_emphasis';  // 价值强调

/** 创作因子集合 */
export interface CreativeFactors {
  visualStyle: VisualStyle;
  openingMethod: OpeningMethod;
  narrationStyle: NarrationStyle;
  paceDensity: PaceDensity;
  ctaForm: CTAForm;
}

/** 中文标签映射 */
export const VisualStyleLabels: Record<VisualStyle, string> = {
  cinematic: '电影级精致',
  lifestyle: '生活化真实',
  minimal: '简约清新',
  dramatic: '戏剧化冲击',
  documentary: '纪录片质感',
  trendy: '潮流时尚',
};

export const OpeningMethodLabels: Record<OpeningMethod, string> = {
  direct_display: '直接展示',
  pain_point: '痛点提问',
  suspense_hook: '悬念钩子',
  story_intro: '故事引入',
  contrast: '反差对比',
  scene_setting: '场景铺设',
};

export const NarrationStyleLabels: Record<NarrationStyle, string> = {
  calm_rational: '冷静知性',
  enthusiastic: '热情推荐',
  storytelling: '故事叙述',
  expert: '专家解说',
  friendly: '朋友分享',
  humorous: '幽默诙谐',
};

export const PaceDensityLabels: Record<PaceDensity, string> = {
  fast: '快节奏',
  medium: '中节奏',
  slow: '慢节奏',
  varied: '变化节奏',
};

export const CTAFormLabels: Record<CTAForm, string> = {
  none: '无',
  direct_price: '直接报价',
  limited_offer: '限时优惠',
  soft_guide: '软性引导',
  trust_building: '信任背书',
  urgency: '紧迫感',
  value_emphasis: '价值强调',
};

/** 参考视频元数据 */
export interface ReferenceVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // 秒
  factors: CreativeFactors;
  performanceMetrics?: {
    views?: number;
    likes?: number;
    shares?: number;
    conversionRate?: number;
  };
  category: string; // 商品类别
  sourceUrl?: string; // 原始来源（如 TikTok 链接）
  createdAt: string;
}
