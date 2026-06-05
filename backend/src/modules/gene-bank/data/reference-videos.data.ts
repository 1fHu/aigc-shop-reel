import { ReferenceVideo } from '../types/creative-factors.type';

/**
 * 8 个参考视频库（占位符数据）
 *
 * TODO: 替换成真实视频
 * 1. 从 Pexels/Pixabay 下载视频
 * 2. 上传到 MinIO (http://localhost:9001)
 * 3. 更新 videoUrl 和 thumbnailUrl
 * 4. 调整 factors 标签以匹配真实视频风格
 */
export const REFERENCE_VIDEOS: ReferenceVideo[] = [
  {
    id: 'ref-video-001',
    title: '电影级美妆产品展示',
    description: '采用电影级画质和精致灯光，直接展示产品质感，冷静知性的旁白配合快节奏剪辑，最后直接报价',
    thumbnailUrl: '/api/gene-bank/videos/video-001/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-001/stream',
    duration: 15,
    category: '美妆护肤',
    factors: {
      visualStyle: 'cinematic',
      openingMethod: 'direct_display',
      narrationStyle: 'calm_rational',
      paceDensity: 'fast',
      ctaForm: 'direct_price',
    },
    performanceMetrics: {
      views: 250000,
      likes: 15000,
      shares: 3200,
      conversionRate: 4.5,
    },
    sourceUrl: '', // TODO: 填入 Pexels 链接
    createdAt: new Date('2024-12-01').toISOString(),
  },
  {
    id: 'ref-video-002',
    title: '痛点共鸣型家居好物',
    description: '以痛点提问开场，生活化场景展示，朋友分享式旁白，中节奏叙事，限时优惠收尾',
    thumbnailUrl: '/api/gene-bank/videos/video-002/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-002/stream',
    duration: 18,
    category: '家居生活',
    factors: {
      visualStyle: 'lifestyle',
      openingMethod: 'pain_point',
      narrationStyle: 'friendly',
      paceDensity: 'medium',
      ctaForm: 'limited_offer',
    },
    performanceMetrics: {
      views: 180000,
      likes: 12000,
      shares: 2800,
      conversionRate: 5.2,
    },
    sourceUrl: '',
    createdAt: new Date('2024-12-05').toISOString(),
  },
  {
    id: 'ref-video-003',
    title: '悬念式开箱科技产品',
    description: '悬念钩子吸引注意，简约清新的画面，专家解说风格，变化节奏保持新鲜感，软性引导转化',
    thumbnailUrl: '/api/gene-bank/videos/video-003/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-003/stream',
    duration: 20,
    category: '数码科技',
    factors: {
      visualStyle: 'minimal',
      openingMethod: 'suspense_hook',
      narrationStyle: 'expert',
      paceDensity: 'varied',
      ctaForm: 'soft_guide',
    },
    performanceMetrics: {
      views: 320000,
      likes: 22000,
      shares: 5100,
      conversionRate: 3.8,
    },
    sourceUrl: '',
    createdAt: new Date('2024-12-10').toISOString(),
  },
  {
    id: 'ref-video-004',
    title: '故事化减肥产品',
    description: '故事引入开场，纪录片质感画面，故事叙述式旁白，慢节奏情感递进，信任背书式CTA',
    thumbnailUrl: '/api/gene-bank/videos/video-004/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-004/stream',
    duration: 25,
    category: '健康养生',
    factors: {
      visualStyle: 'documentary',
      openingMethod: 'story_intro',
      narrationStyle: 'storytelling',
      paceDensity: 'slow',
      ctaForm: 'trust_building',
    },
    performanceMetrics: {
      views: 150000,
      likes: 18000,
      shares: 4200,
      conversionRate: 6.1,
    },
    sourceUrl: '',
    createdAt: new Date('2024-12-15').toISOString(),
  },
  {
    id: 'ref-video-005',
    title: '反差对比服饰穿搭',
    description: '反差对比开场抓眼球，潮流时尚风格，热情推荐的旁白，快节奏展示多套搭配，紧迫感CTA',
    thumbnailUrl: '/api/gene-bank/videos/video-005/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-005/stream',
    duration: 16,
    category: '服饰鞋包',
    factors: {
      visualStyle: 'trendy',
      openingMethod: 'contrast',
      narrationStyle: 'enthusiastic',
      paceDensity: 'fast',
      ctaForm: 'urgency',
    },
    performanceMetrics: {
      views: 280000,
      likes: 19000,
      shares: 3600,
      conversionRate: 4.2,
    },
    sourceUrl: '',
    createdAt: new Date('2024-12-20').toISOString(),
  },
  {
    id: 'ref-video-006',
    title: '场景化厨房小家电',
    description: '场景铺设开场（做饭场景），戏剧化冲击的视觉，幽默诙谐旁白，中节奏演示，价值强调收尾',
    thumbnailUrl: '/api/gene-bank/videos/video-006/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-006/stream',
    duration: 22,
    category: '厨房电器',
    factors: {
      visualStyle: 'dramatic',
      openingMethod: 'scene_setting',
      narrationStyle: 'humorous',
      paceDensity: 'medium',
      ctaForm: 'value_emphasis',
    },
    performanceMetrics: {
      views: 200000,
      likes: 16000,
      shares: 3100,
      conversionRate: 5.5,
    },
    sourceUrl: '',
    createdAt: new Date('2024-12-25').toISOString(),
  },
  {
    id: 'ref-video-007',
    title: '极简风母婴产品',
    description: '直接展示开场，简约清新画面，冷静知性旁白，慢节奏详细讲解，软性引导转化',
    thumbnailUrl: '/api/gene-bank/videos/video-007/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-007/stream',
    duration: 24,
    category: '母婴用品',
    factors: {
      visualStyle: 'minimal',
      openingMethod: 'direct_display',
      narrationStyle: 'calm_rational',
      paceDensity: 'slow',
      ctaForm: 'soft_guide',
    },
    performanceMetrics: {
      views: 160000,
      likes: 14000,
      shares: 2900,
      conversionRate: 5.8,
    },
    sourceUrl: '',
    createdAt: new Date('2025-01-01').toISOString(),
  },
  {
    id: 'ref-video-008',
    title: '高能剪辑零食测评',
    description: '痛点提问开场，生活化真实风格，朋友分享式旁白，快节奏多产品展示，直接报价+限时优惠',
    thumbnailUrl: '/api/gene-bank/videos/video-008/thumbnail',
    videoUrl: '/api/gene-bank/videos/video-008/stream',
    duration: 14,
    category: '食品饮料',
    factors: {
      visualStyle: 'lifestyle',
      openingMethod: 'pain_point',
      narrationStyle: 'friendly',
      paceDensity: 'fast',
      ctaForm: 'limited_offer',
    },
    performanceMetrics: {
      views: 300000,
      likes: 25000,
      shares: 6000,
      conversionRate: 4.8,
    },
    sourceUrl: '',
    createdAt: new Date('2025-01-05').toISOString(),
  },
];

/**
 * 根据 ID 获取参考视频
 */
export function getReferenceVideoById(id: string): ReferenceVideo | undefined {
  return REFERENCE_VIDEOS.find((v) => v.id === id);
}

/**
 * 根据分类筛选参考视频
 */
export function getReferenceVideosByCategory(category: string): ReferenceVideo[] {
  return REFERENCE_VIDEOS.filter((v) => v.category === category);
}

/**
 * 获取所有参考视频
 */
export function getAllReferenceVideos(): ReferenceVideo[] {
  return REFERENCE_VIDEOS;
}
