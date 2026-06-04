import api from './api';
import type {
  ViralCard,
  ViralImportResult,
  ViralReferenceResult,
  ViralSearchQuery,
} from '@/types';

/**
 * 爆款模板库（GeneBank）模块 API
 *
 * 端点更新：现在对接到新搭建的 `/api/gene-bank/*` 接口
 * 后端模块：backend/src/modules/gene-bank/
 *
 * 新的数据结构：
 * - 8 个参考视频（reference videos）
 * - 每个视频包含 5 个创作因子维度
 * - 支持视频流式播放
 */
export const genebankService = {
  /**
   * 获取所有参考视频列表
   * GET /api/gene-bank/reference-videos
   */
  async search(_query: ViralSearchQuery = {}): Promise<ViralCard[]> {
    const response: any = await api.get('/gene-bank/reference-videos');

    // 🔍 调试日志 - 检查后端返回的原始数据
    console.log('=== genebankService.search ===');
    console.log('后端返回的原始数据（第一个）:', response[0]);
    console.log('videoUrl 字段:', response[0]?.videoUrl);

    // 将后端的 ReferenceVideo 转换为前端的 ViralCard 格式
    const result = response.map((video: any) => ({
      id: video.id,
      title: video.title,
      platform: 'local' as const,
      source_url: video.sourceUrl || null,
      declared_at: video.createdAt,
      thumbnail_url: video.thumbnailUrl,
      video_url: video.videoUrl, // 添加视频 URL
      status: 'completed' as const,
      performance_score: video.performanceMetrics?.conversionRate ?
        Math.round(video.performanceMetrics.conversionRate * 10) : null,
      analysis_report: {
        category: mapCategoryToFrontend(video.category),
        hook: mapOpeningMethod(video.factors.openingMethod),
        shot_count: Math.floor(video.duration / 3), // 估算分镜数
        rhythm: mapPaceDensity(video.factors.paceDensity),
        cta: mapCTAForm(video.factors.ctaForm),
        style_tags: [
          mapVisualStyle(video.factors.visualStyle),
          mapNarrationStyle(video.factors.narrationStyle),
        ],
        recommended_factors: {
          visual_style: mapVisualStyle(video.factors.visualStyle),
          opener: mapOpeningMethod(video.factors.openingMethod),
          narration: mapNarrationStyle(video.factors.narrationStyle),
          pacing: mapPaceDensity(video.factors.paceDensity),
          cta: mapCTAForm(video.factors.ctaForm),
        },
      },
      created_at: video.createdAt,
    }));

    // 🔍 调试日志 - 检查转换后的数据
    console.log('转换后的数据（第一个）:', result[0]);
    console.log('video_url 字段:', result[0]?.video_url);
    console.log('===========================');

    return result;
  },

  /**
   * 获取单条参考视频详情
   * GET /api/gene-bank/reference-videos/:id
   */
  async getById(id: string): Promise<ViralCard> {
    const video: any = await api.get(`/gene-bank/reference-videos/${id}`);

    // 🔍 调试日志
    console.log('=== genebankService.getById ===');
    console.log('后端返回的数据:', video);
    console.log('videoUrl:', video.videoUrl);

    return {
      id: video.id,
      title: video.title,
      platform: 'local' as const,
      source_url: video.sourceUrl || null,
      declared_at: video.createdAt,
      thumbnail_url: video.thumbnailUrl,
      video_url: video.videoUrl, // ✅ 添加视频 URL
      status: 'completed' as const,
      performance_score: video.performanceMetrics?.conversionRate ?
        Math.round(video.performanceMetrics.conversionRate * 10) : null,
      analysis_report: {
        category: mapCategoryToFrontend(video.category),
        hook: mapOpeningMethod(video.factors.openingMethod),
        shot_count: Math.floor(video.duration / 3),
        rhythm: mapPaceDensity(video.factors.paceDensity),
        cta: mapCTAForm(video.factors.ctaForm),
        style_tags: [
          mapVisualStyle(video.factors.visualStyle),
          mapNarrationStyle(video.factors.narrationStyle),
        ],
        selling_points: [`时长 ${video.duration}秒`, `${video.category}`],
        highlights: Object.keys(video.factors).map(k => `${k}: ${(video.factors as any)[k]}`),
        recommended_factors: {
          visual_style: mapVisualStyle(video.factors.visualStyle),
          opener: mapOpeningMethod(video.factors.openingMethod),
          narration: mapNarrationStyle(video.factors.narrationStyle),
          pacing: mapPaceDensity(video.factors.paceDensity),
          cta: mapCTAForm(video.factors.ctaForm),
        },
      },
      created_at: video.createdAt,
    };
  },

  /**
   * 获取视频的创作因子（带中文标签）
   * GET /api/gene-bank/reference-videos/:id/factors
   */
  async getFactors(id: string): Promise<any> {
    return api.get(`/gene-bank/reference-videos/${id}/factors`);
  },

  /** 导入站外公开视频 URL 触发 AI 异步拆解（暂不支持） */
  importUrl(_payload: { url: string; category?: string }): Promise<ViralImportResult> {
    throw new Error('暂不支持导入外部视频，请使用已有的 8 个参考视频');
  },

  /** 一键借鉴：把当前爆款应用为指定剧本的参考结构（暂不支持） */
  reference(_viralId: string, _scriptId: string): Promise<ViralReferenceResult> {
    throw new Error('请使用新的 reference_video_id 参数调用剧本生成接口');
  },
};

// ============ 映射函数：后端字段 → 前端显示文本 ============

function mapCategoryToFrontend(category: string): string {
  const map: Record<string, string> = {
    '美妆护肤': 'beauty',
    '家居生活': 'home',
    '数码科技': 'electronics',
    '健康养生': 'sports',
    '服饰鞋包': 'fashion',
    '厨房电器': 'home',
    '母婴用品': 'mother_baby',
    '食品饮料': 'food',
  };
  return map[category] || 'all';
}

function mapVisualStyle(style: string): string {
  const map: Record<string, string> = {
    'cinematic': '电影级精致',
    'lifestyle': '生活化真实',
    'minimal': '简约清新',
    'dramatic': '戏剧化冲击',
    'documentary': '纪录片质感',
    'trendy': '潮流时尚',
  };
  return map[style] || style;
}

function mapOpeningMethod(method: string): string {
  const map: Record<string, string> = {
    'direct_display': '直接展示产品',
    'pain_point': '痛点提问开场',
    'suspense_hook': '悬念钩子',
    'story_intro': '故事引入',
    'contrast': '反差对比',
    'scene_setting': '场景铺设',
  };
  return map[method] || method;
}

function mapNarrationStyle(style: string): string {
  const map: Record<string, string> = {
    'calm_rational': '冷静知性',
    'enthusiastic': '热情推荐',
    'storytelling': '故事叙述',
    'expert': '专家解说',
    'friendly': '朋友分享',
    'humorous': '幽默诙谐',
  };
  return map[style] || style;
}

function mapPaceDensity(density: string): string {
  const map: Record<string, string> = {
    'fast': '快节奏',
    'medium': '中节奏',
    'slow': '慢节奏',
    'varied': '变化节奏',
  };
  return map[density] || density;
}

function mapCTAForm(form: string): string {
  const map: Record<string, string> = {
    'direct_price': '直接报价',
    'limited_offer': '限时优惠',
    'soft_guide': '软性引导',
    'trust_building': '信任背书',
    'urgency': '紧迫感',
    'value_emphasis': '价值强调',
  };
  return map[form] || form;
}
