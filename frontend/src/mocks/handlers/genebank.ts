import { http, HttpResponse } from 'msw';
import type { ViralCard } from '@/types';

/**
 * 爆款模板库 Mock
 * 对应后端 `backend/src/modules/viral-library/`
 *
 * 数据 shape 与 backend `MockStoreService.searchViralLibrary` 一致，
 * 但**额外补了** selling_points / highlights / visual_palette / recommended_factors —
 * 这些字段后端 AI 拆解器实现后才会真的填，目前 mock 先把前端 UI 撑起来。
 */

const mockCards: ViralCard[] = [
  {
    id: 'viral-001',
    title: '夏季防晒霜清爽涂抹挑战',
    platform: 'tiktok',
    source_url: 'https://www.tiktok.com/@beauty/video/7234567890',
    declared_at: '2026-05-20T08:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 92,
    created_at: '2026-05-20T08:00:00Z',
    analysis_report: {
      category: 'beauty',
      hook: '0-2s 阳光下产品大特写 + 油光对比，3s 后立刻甩动作。',
      shot_count: 9,
      rhythm: '前 3 秒 ASMR sting，整体快节奏切换 9 个分镜。',
      cta: '限时折扣 + 评论区抢券',
      style_tags: ['夏日感', '高饱和', '阳光质感', 'ASMR 音效'],
      selling_points: [
        'SPF50+ PA++++ 户外抗晒',
        '清爽不油腻 5 秒成膜',
        '水润保湿可叠妆',
        '可达人推荐 + 真人测评',
      ],
      highlights: [
        '🌞 阳光镜头开场抓眼球',
        '⚡ 9 镜快节奏密度高',
        '💄 ASMR 涂抹音效增强代入感',
      ],
      visual_palette: '夏日明亮 + 阳光暖调',
      recommended_factors: {
        visual_style: '夏日度假风',
        opener:       '利益点切入',
        narration:    '热情号召',
        pacing:       '快节奏',
        cta:          '限时折扣',
      },
    },
  },
  {
    id: 'viral-002',
    title: '降噪耳机科技感开箱测评',
    platform: 'youtube',
    source_url: 'https://www.youtube.com/watch?v=abc12345',
    declared_at: '2026-05-19T10:30:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 88,
    created_at: '2026-05-19T10:30:00Z',
    analysis_report: {
      category: 'electronics',
      hook: '0-3s 黑色背景 + 产品旋转 + 重低音 sting，立刻锁定科技感人群。',
      shot_count: 11,
      rhythm: '中节奏，每镜 3-4 秒，配合数据翻牌动效。',
      cta: '价格锚点 + 立即下单',
      style_tags: ['冷调', '工业风', '理性测评', '数据翻牌'],
      selling_points: [
        '40dB 深度主动降噪',
        '32 小时长效续航',
        '三麦克风通话清晰',
        '同价位最强参数对比',
      ],
      highlights: [
        '🎬 冷调背景突出产品质感',
        '📊 数据翻牌强化理性说服',
        '🎵 重低音 sting 抓住注意力',
      ],
      visual_palette: '冷峻科技',
      recommended_factors: {
        visual_style: '电影级精致',
        opener:       '直接展示',
        narration:    '冷静知性',
        pacing:       '中节奏',
        cta:          '直接报价',
      },
    },
  },
  {
    id: 'viral-003',
    title: '健身水壶磁吸快开秒喝',
    platform: 'tiktok',
    source_url: 'https://www.tiktok.com/@sport/video/7234588888',
    declared_at: '2026-05-18T14:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 85,
    created_at: '2026-05-18T14:00:00Z',
    analysis_report: {
      category: 'sports',
      hook: '0-2s 拍一下水壶磁吸自动开盖，"哒"一声痛点共鸣。',
      shot_count: 7,
      rhythm: '急速剪辑，每镜 1.5-2 秒。',
      cta: '场景共鸣 + 限时折扣',
      style_tags: ['运动场景', '高能配乐', '磁吸特写', 'ASMR 开盖'],
      selling_points: [
        '磁吸开盖单手操作',
        '316 不锈钢真空保温',
        '运动专用握感防滑',
        '24h 保冷不沁水',
      ],
      highlights: [
        '⚡ 痛点直击：跑步喝水难',
        '🧲 磁吸动作展示功能感',
        '🏃 真实运动场景共鸣',
      ],
      visual_palette: '活力高饱和',
      recommended_factors: {
        visual_style: '高饱和',
        opener:       '痛点提问',
        narration:    '热情号召',
        pacing:       '急速剪辑',
        cta:          '场景共鸣',
      },
    },
  },
  {
    id: 'viral-004',
    title: '极简风一锅煮烹饪场景',
    platform: 'instagram',
    source_url: 'https://www.instagram.com/reel/abc12345',
    declared_at: '2026-05-17T09:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 78,
    created_at: '2026-05-17T09:00:00Z',
    analysis_report: {
      category: 'home',
      hook: '0-3s 木质台面 + 产品慢推镜 + 轻松配乐。',
      shot_count: 6,
      rhythm: '慢节奏，每镜 4-5 秒，沉浸式生活流。',
      cta: '生活场景共鸣 + 私信报价',
      style_tags: ['极简', '生活流', '柔光', '木质温暖'],
      selling_points: [
        '一锅烹饪省时省力',
        '不粘陶瓷涂层易清洗',
        '电磁炉燃气通用',
        '3 年质保安心购',
      ],
      highlights: [
        '🪵 生活质感开场温暖',
        '🍳 真实烹饪过程展示',
        '✨ 极简调度营造高级感',
      ],
      visual_palette: '温暖生活',
      recommended_factors: {
        visual_style: '极简主义',
        opener:       '直接展示',
        narration:    '故事化',
        pacing:       '慢节奏',
        cta:          '场景共鸣',
      },
    },
  },
  {
    id: 'viral-005',
    title: '美妆蛋上脸前后对比',
    platform: 'tiktok',
    source_url: 'https://www.tiktok.com/@makeup/video/7234599999',
    declared_at: '2026-05-16T15:45:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 81,
    created_at: '2026-05-16T15:45:00Z',
    analysis_report: {
      category: 'beauty',
      hook: '0-1.5s 半脸已化 vs 半脸素颜大特写，对比冲击立现。',
      shot_count: 8,
      rhythm: '快节奏 + 镜头切换密集。',
      cta: '前后对比 + 评论区领优惠码',
      style_tags: ['对比镜', '化妆教程', '柔焦人像', '清新粉色'],
      selling_points: [
        '亲肤海绵不吸粉',
        '湿用干用两面派',
        '可水洗反复使用',
        '7 色选择搭配妆容',
      ],
      highlights: [
        '👁️ 对比开场视觉冲击力强',
        '💄 真人教学引发信任',
        '🌸 粉色调聚焦女性人群',
      ],
      visual_palette: '清新粉色',
      recommended_factors: {
        visual_style: '高饱和',
        opener:       '直接展示',
        narration:    '幽默调皮',
        pacing:       '快节奏',
        cta:          '社交证明',
      },
    },
  },
  {
    id: 'viral-006',
    title: '宠物零食萌宠测评',
    platform: 'youtube',
    source_url: 'https://www.youtube.com/watch?v=def67890',
    declared_at: '2026-05-15T11:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 75,
    created_at: '2026-05-15T11:00:00Z',
    analysis_report: {
      category: 'pet',
      hook: '0-2s 萌宠特写 + 表情包式快切，引发会心一笑。',
      shot_count: 8,
      rhythm: '中节奏，配萌宠原声 ASMR。',
      cta: '萌宠故事化 + 主人推荐',
      style_tags: ['萌宠', '温暖故事', '原声 ASMR', '高饱和'],
      selling_points: [
        '冻干工艺锁鲜营养',
        '无添加无防腐剂',
        '0.5cm 小颗粒不噎',
        '兽医推荐品牌',
      ],
      highlights: [
        '🐶 萌宠开场情感拉满',
        '🎤 原声 ASMR 引发代入',
        '👩 主人真情推荐说服力',
      ],
      visual_palette: '温暖故事',
      recommended_factors: {
        visual_style: '高饱和',
        opener:       '直接展示',
        narration:    '故事化',
        pacing:       '中节奏',
        cta:          '社交证明',
      },
    },
  },
  {
    id: 'viral-007',
    title: '母婴湿巾 5 秒湿润度测试',
    platform: 'tiktok',
    source_url: 'https://www.tiktok.com/@baby/video/7234511111',
    declared_at: '2026-05-14T08:30:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 73,
    created_at: '2026-05-14T08:30:00Z',
    analysis_report: {
      category: 'mother_baby',
      hook: '0-2s 妈妈手部特写抽出湿巾，干湿对比即时清楚。',
      shot_count: 6,
      rhythm: '中节奏 + 温和柔光。',
      cta: '宝宝安全场景 + 立即下单',
      style_tags: ['干净', '柔光', '安心', '科学测试'],
      selling_points: [
        '99% 纯水亲肤无刺激',
        '加厚 80 抽超耐用',
        '一片湿润度 5 秒达标',
        '儿科医生推荐',
      ],
      highlights: [
        '👶 安全感开场赢得妈妈信任',
        '💧 直观湿润度测试有说服力',
        '👨‍⚕️ 医生背书强化权威',
      ],
      visual_palette: '柔光温暖',
      recommended_factors: {
        visual_style: '极简主义',
        opener:       '利益点切入',
        narration:    '冷静知性',
        pacing:       '中节奏',
        cta:          '社交证明',
      },
    },
  },
  {
    id: 'viral-008',
    title: '户外帐篷一秒展开实测',
    platform: 'youtube',
    source_url: 'https://www.youtube.com/watch?v=ghi24680',
    declared_at: '2026-05-13T16:20:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=480&h=720&fit=crop',
    status: 'completed',
    performance_score: 80,
    created_at: '2026-05-13T16:20:00Z',
    analysis_report: {
      category: 'sports',
      hook: '0-1s 抛出帐篷一秒展开 + 风声效果，反差冲击。',
      shot_count: 7,
      rhythm: '快节奏 + 户外热血配乐。',
      cta: '户外场景 + 限时优惠',
      style_tags: ['户外', '反差', '热血配乐', '广阔自然'],
      selling_points: [
        '一秒自动展开免组装',
        '防水 PU3000 全密闭',
        '4 人空间收纳极小',
        '抗 6 级大风',
      ],
      highlights: [
        '💨 一秒展开制造神奇感',
        '🏕️ 广阔户外画面震撼',
        '⚙️ 防水抗风参数说服',
      ],
      visual_palette: '广阔自然',
      recommended_factors: {
        visual_style: '电影级精致',
        opener:       '悬念诱导',
        narration:    '热情号召',
        pacing:       '快节奏',
        cta:          '限时折扣',
      },
    },
  },
];

// ============ 处理器 ============

export const genebankHandlers = [
  // GET /api/viral-library/search
  http.get('/api/viral-library/search', ({ request }) => {
    const url = new URL(request.url);
    const keyword  = url.searchParams.get('keyword')?.toLowerCase() || '';
    const category = url.searchParams.get('category') || '';
    const platform = url.searchParams.get('platform') || 'all';
    const limit    = Number(url.searchParams.get('limit')) || 12;

    const filtered = mockCards
      .filter((c) => (category ? c.analysis_report.category === category : true))
      .filter((c) => (platform !== 'all' ? c.platform === platform : true))
      .filter((c) => (keyword ? c.title.toLowerCase().includes(keyword) || JSON.stringify(c.analysis_report).toLowerCase().includes(keyword) : true))
      .slice(0, limit);

    return HttpResponse.json({
      code: 200, msg: null, total: filtered.length, data: filtered, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/viral-library/:id
  http.get('/api/viral-library/:id', ({ params }) => {
    const card = mockCards.find((c) => c.id === String(params.id));
    if (!card) {
      return HttpResponse.json(
        { code: 404, msg: '爆款条目不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: card, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/viral-library/import-url
  http.post('/api/viral-library/import-url', async ({ request }) => {
    const body = (await request.json()) as { url: string; category?: string };
    const id = `viral-${Date.now()}`;
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: { id, status: 'analyzing', task_id: `vl-task-${id}`, url: body.url },
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/viral-library/:id/reference
  http.post('/api/viral-library/:id/reference', async ({ params, request }) => {
    const body = (await request.json()) as { script_id: string };
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: {
        viral_id: String(params.id),
        script_id: body.script_id,
        task_id: `ref-${Date.now()}`,
        status: 'generating',
      },
      traceId: `mock-${Date.now()}`,
    });
  }),
];
