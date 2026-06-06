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

// ============================================================
// 归一化：把中文/自由文本映射成标准枚举码（幂等：已是合法枚举码则原样返回）
// 供 gene-bank 读取与 viral-analyzer 落库共用，保证全链路使用同一套枚举。
// ============================================================

const VISUAL_STYLE_CODES = new Set<VisualStyle>([
  'cinematic', 'lifestyle', 'minimal', 'dramatic', 'documentary', 'trendy',
]);
const OPENING_METHOD_CODES = new Set<OpeningMethod>([
  'direct_display', 'pain_point', 'suspense_hook', 'story_intro', 'contrast', 'scene_setting',
]);
const NARRATION_STYLE_CODES = new Set<NarrationStyle>([
  'calm_rational', 'enthusiastic', 'storytelling', 'expert', 'friendly', 'humorous',
]);
const PACE_DENSITY_CODES = new Set<PaceDensity>(['fast', 'medium', 'slow', 'varied']);
const CTA_FORM_CODES = new Set<CTAForm>([
  'none', 'direct_price', 'limited_offer', 'soft_guide', 'trust_building', 'urgency', 'value_emphasis',
]);

export function normalizeVisualStyle(v?: string): VisualStyle {
  const s = v ?? '';
  if (VISUAL_STYLE_CODES.has(s as VisualStyle)) return s as VisualStyle;
  if (s.includes('电影')) return 'cinematic';
  if (s.includes('极简') || s.includes('简约')) return 'minimal';
  if (s.includes('戏剧') || s.includes('冲击')) return 'dramatic';
  if (s.includes('纪录') || s.includes('纪实')) return 'documentary';
  if (s.includes('潮流') || s.includes('时尚') || s.includes('商业')) return 'trendy';
  return 'lifestyle';
}

export function normalizeOpeningMethod(v?: string): OpeningMethod {
  const s = v ?? '';
  if (OPENING_METHOD_CODES.has(s as OpeningMethod)) return s as OpeningMethod;
  if (s.includes('悬念')) return 'suspense_hook';
  if (s.includes('痛点') || s.includes('直击') || s.includes('问题') || s.includes('提问')) {
    return 'pain_point';
  }
  if (s.includes('故事')) return 'story_intro';
  if (s.includes('反差') || s.includes('对比')) return 'contrast';
  if (s.includes('场景') || s.includes('代入')) return 'scene_setting';
  return 'direct_display';
}

export function normalizeNarrationStyle(v?: string): NarrationStyle {
  const s = v ?? '';
  if (NARRATION_STYLE_CODES.has(s as NarrationStyle)) return s as NarrationStyle;
  if (s.includes('冷静') || s.includes('知性') || s.includes('理性')) return 'calm_rational';
  if (s.includes('激情') || s.includes('热情') || s.includes('澎湃')) return 'enthusiastic';
  if (s.includes('故事') || s.includes('叙述')) return 'storytelling';
  if (s.includes('专家')) return 'expert';
  if (s.includes('幽默')) return 'humorous';
  return 'friendly';
}

export function normalizePaceDensity(v?: string): PaceDensity {
  const s = v ?? '';
  if (PACE_DENSITY_CODES.has(s as PaceDensity)) return s as PaceDensity;
  if (s.includes('快')) return 'fast';
  if (s.includes('慢')) return 'slow';
  if (s.includes('变化')) return 'varied';
  return 'medium';
}

export function normalizeCTAForm(v?: string): CTAForm {
  const s = v ?? '';
  if (CTA_FORM_CODES.has(s as CTAForm)) return s as CTAForm;
  if (s.includes('报价') || s.includes('价格')) return 'direct_price';
  if (s.includes('限时') || s.includes('优惠') || s.includes('折扣')) return 'limited_offer';
  if (s.includes('信任') || s.includes('背书') || s.includes('评价')) return 'trust_building';
  if (s.includes('紧迫') || s.includes('立即') || s.includes('马上') || s.includes('购买')) {
    return 'urgency';
  }
  if (s.includes('价值')) return 'value_emphasis';
  if (s.includes('引导') || s.includes('了解更多') || s.includes('点击')) return 'soft_guide';
  // 未出现明显行动号召时默认无 CTA（可选因子）
  return 'none';
}

/** viral-analyzer 落库 / 同步基因库使用的因子形状（snake_case，与对外 API 字段一致） */
export interface CreativeFactorsSnake {
  visual_style: string;
  opener: string;
  narration: string;
  pacing: string;
  cta: string;
}

/** 把（中文/自由文本）因子整体归一成标准枚举码，供 viral-analyzer 落库 / 同步基因库使用 */
export function normalizeCreativeFactors(raw?: Partial<CreativeFactorsSnake>): CreativeFactorsSnake {
  return {
    visual_style: normalizeVisualStyle(raw?.visual_style),
    opener: normalizeOpeningMethod(raw?.opener),
    narration: normalizeNarrationStyle(raw?.narration),
    pacing: normalizePaceDensity(raw?.pacing),
    cta: normalizeCTAForm(raw?.cta),
  };
}

/** 把存储的枚举码因子映射成中文标签用于展示；对未知值（如历史中文数据）原样透传 */
export function creativeFactorsToLabels(factors?: Partial<CreativeFactorsSnake>): CreativeFactorsSnake {
  return {
    visual_style: VisualStyleLabels[factors?.visual_style as VisualStyle] ?? factors?.visual_style ?? '',
    opener: OpeningMethodLabels[factors?.opener as OpeningMethod] ?? factors?.opener ?? '',
    narration: NarrationStyleLabels[factors?.narration as NarrationStyle] ?? factors?.narration ?? '',
    pacing: PaceDensityLabels[factors?.pacing as PaceDensity] ?? factors?.pacing ?? '',
    cta: CTAFormLabels[factors?.cta as CTAForm] ?? factors?.cta ?? '',
  };
}
