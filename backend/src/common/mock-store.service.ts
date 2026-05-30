import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type UserRecord = {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar_url: string | null;
  plan_type: 'free' | 'pro';
  video_quota: number;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectRecord = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  product_url: string | null;
  product_info: Record<string, unknown> | null;
  cover_url: string | null;
  status: 'draft' | 'confirmed' | 'material_pending' | 'script_pending' | 'in_production' | 'completed';
  material_count: number;
  script_count: number;
  video_count: number;
  views: number;
  render_progress: number;
  tiktok_ready: boolean;
  created_at: string;
  updated_at: string;
};

type ProductInfo = Record<string, unknown>;

type ProjectInput = {
  name: string;
  description?: string;
};

type ProductInput = {
  name: string;
  category: string;
  selling_points: string[];
  target_audience?: string;
  usage_scene?: string;
  price_anchor?: string;
};

type ProductParseResult = ProductInput & { cover_url: string };

type MaterialRecord = {
  id: string;
  project_id: string;
  file_url: string;
  file_type: 'image' | 'video';
  file_name: string;
  file_size: number;
  analysis: Record<string, unknown>;
  embedding: string;
  tags: string[];
  thumbnail_url: string;
  status: 'parsing' | 'ready' | 'failed';
  duration: number | null;
  slices: Array<Record<string, unknown>>;
  created_at: string;
};

export type ScriptShot = {
  index: number;
  description: string;
  camera_motion: string;
  duration: number;
  voiceover: string;
  subtitle: string;
  reference_image_url: string | null;
};

type ScriptRecord = {
  id: string;
  project_id: string;
  strategy_type: string;
  content: string;
  storyboard: ScriptShot[];
  factors: Record<string, string>;
  factor_history: Array<Record<string, unknown>>;
  status: 'draft' | 'generating' | 'completed' | 'archived';
  total_duration: number;
  created_at: string;
  updated_at: string;
};

type VideoRecord = {
  id: string;
  project_id: string;
  script_id: string | null;
  video_url: string | null;
  duration: number | null;
  resolution: string | null;
  status: 'pending' | 'generating' | 'composing' | 'completed' | 'failed';
  trace_id: string | null;
  generation_cost: number | null;
  mock_render?: boolean;
  settings: {
    tts: { language: string; voice: string };
    bgm: { preset_id: string | null; custom_url: string | null; volume: number };
  };
  created_at: string;
  updated_at: string;
};

type VideoTaskRecord = {
  id: string;
  video_id: string;
  shot_index: number;
  seedance_task_id: string;
  status: 'queued' | 'processing' | 'retrying' | 'completed' | 'failed';
  retry_count: number;
  error_msg: string | null;
  trace_id: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
};

type VideoMetricRecord = {
  id: string;
  video_id: string;
  views: number;
  three_second_rate: number;
  completion_rate: number;
  click_rate: number;
  conversion_rate: number;
  gmv: number;
  watch_time_distribution: Array<{ second: number; retention: number }>;
  shot_boundaries: number[];
  needs_optimization: boolean;
  created_at: string;
};

type DiagnosisReportRecord = {
  id: string;
  video_id: string;
  status: 'analyzing' | 'completed';
  issues: Array<Record<string, unknown>>;
  suggestions: Array<Record<string, unknown>>;
  created_at: string;
};

type ViralGeneRecord = {
  id: string;
  category: string;
  strategy_summary: string;
  factors: Record<string, string>;
  storyboard_structure: Record<string, unknown>;
  performance_score: number;
  shot_count: number;
  source_count: number;
  embedding: string;
  created_at: string;
};

type ViralLibraryRecord = {
  id: string;
  title: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'local' | 'other';
  source_url: string | null;
  declared_at: string;
  thumbnail_url: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  performance_score: number | null;
  analysis_report: Record<string, unknown>;
  created_at: string;
};

type FactorDefinitionRecord = {
  id: string;
  dimension: string;
  label: string;
  description: string;
  values: Array<{ value: string; label: string }>;
};

@Injectable()
export class MockStoreService {
  private readonly users = new Map<string, UserRecord>();
  private readonly projects = new Map<string, ProjectRecord>();
  private readonly materials = new Map<string, MaterialRecord>();
  private readonly scripts = new Map<string, ScriptRecord>();
  private readonly videos = new Map<string, VideoRecord>();
  private readonly videoTasks = new Map<string, VideoTaskRecord>();
  private readonly videoMetrics = new Map<string, VideoMetricRecord>();
  private readonly diagnosisReports = new Map<string, DiagnosisReportRecord>();
  private readonly viralGenes = new Map<string, ViralGeneRecord>();
  private readonly viralLibrary = new Map<string, ViralLibraryRecord>();
  private readonly factors = new Map<string, FactorDefinitionRecord>();
  private readonly refreshTokenBlacklist = new Set<string>();
  private readonly refreshTokenStore = new Map<string, string>(); // token → userId
  private readonly resetTokens = new Map<string, { userId: string; expiresAt: number }>();
  private readonly pendingRegistrations = new Map<string, { code: string; expiresAt: number; passwordHash: string; nickname?: string }>();

  constructor() {
    const now = new Date().toISOString();
    const demoUser: UserRecord = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@vidcraft.icu',
      password_hash: '$2b$10$Kgi184mPfw5dFWhhYicFQ.qm1Q.YHrvcvxTOP2ffr0s/hOGscVfVi',
      nickname: '体验用户',
      avatar_url: null,
      plan_type: 'free',
      video_quota: 3,
      is_guest: false,
      created_at: now,
      updated_at: now,
    };
    this.users.set(demoUser.id, demoUser);

    const adminUser: UserRecord = {
      id: '00000000-0000-0000-0000-000000000002',
      email: '3051225284@qq.com',
      password_hash: '$2b$10$tyAs98aRRPAsY9tKDMCjqufWnZXgc5akchBjzYrVE/pBJGrcwjmeK',
      nickname: 'admin',
      avatar_url: null,
      plan_type: 'free',
      video_quota: 999,
      is_guest: false,
      created_at: now,
      updated_at: now,
    };
    this.users.set(adminUser.id, adminUser);

    const demoProject: ProjectRecord = {
      id: 'proj-demo-001',
      user_id: demoUser.id,
      name: '防晒霜推广',
      description: '夏季爆款',
      product_url: 'https://example.com/product/sunscreen',
      product_info: {
        name: 'XX SPF50+ 防晒霜 50ml',
        category: 'beauty',
        selling_points: ['SPF50+ PA++++', '轻薄不油腻', '防水防汗'],
        target_audience: '18-30岁都市女性',
        usage_scene: '户外运动/日常出行',
        price_anchor: '原价¥199，现¥89',
      },
      cover_url: 'https://example.com/cover.jpg',
      status: 'confirmed',
      material_count: 5,
      script_count: 2,
      video_count: 1,
      views: 4200,
      render_progress: 100,
      tiktok_ready: true,
      created_at: now,
      updated_at: now,
    };
    this.projects.set(demoProject.id, demoProject);

    const demoMaterial: MaterialRecord = {
      id: 'mat-demo-001',
      project_id: demoProject.id,
      file_url: 'https://example.com/materials/demo-image.jpg',
      file_type: 'image',
      file_name: 'demo-image.jpg',
      file_size: 1024000,
      analysis: { subject: '防晒霜瓶身', color_style: '浅蓝', mood: '清爽', tags: ['美妆', '防晒'] },
      embedding: '[0.1,0.2,0.3]',
      tags: ['防晒霜', '美妆', '轻薄'],
      thumbnail_url: 'https://example.com/materials/demo-image-thumb.jpg',
      status: 'ready',
      duration: null,
      slices: [],
      created_at: now,
    };
    this.materials.set(demoMaterial.id, demoMaterial);

    const demoScript: ScriptRecord = {
      id: 'scrip-demo-001',
      project_id: demoProject.id,
      strategy_type: 'pain_point',
      content: '你还在为夏天出门防晒而烦恼吗？',
      storyboard: [
        {
          index: 0,
          description: '开场特写防晒霜瓶身',
          camera_motion: 'push-in',
          duration: 3,
          voiceover: '你知道没做好防晒有多可怕吗？',
          subtitle: '拒绝晒黑',
          reference_image_url: null,
        },
      ],
      factors: {
        visual_style: '轻奢质感风',
        hook_type: '问题式Hook',
        narration_style: '活泼种草',
        rhythm: '中速',
        cta: '立即下单',
      },
      factor_history: [],
      status: 'completed',
      total_duration: 3,
      created_at: now,
      updated_at: now,
    };
    this.scripts.set(demoScript.id, demoScript);

    const demoVideo: VideoRecord = {
      id: 'vid-demo-001',
      project_id: demoProject.id,
      script_id: demoScript.id,
      video_url: 'https://example.com/videos/demo.mp4',
      duration: 14.5,
      resolution: '1080x1920',
      status: 'completed',
      trace_id: 'tr-demo-001',
      generation_cost: 2.4,
      settings: {
        tts: { language: 'zh', voice: 'female_gentle' },
        bgm: { preset_id: 'bgm-001', custom_url: null, volume: 0.15 },
      },
      created_at: now,
      updated_at: now,
    };
    this.videos.set(demoVideo.id, demoVideo);

    const demoTask: VideoTaskRecord = {
      id: 'task-demo-001',
      video_id: demoVideo.id,
      shot_index: 0,
      seedance_task_id: 'seedance-demo-001',
      status: 'completed',
      retry_count: 0,
      error_msg: null,
      trace_id: demoVideo.trace_id,
      thumbnail_url: 'https://example.com/videos/demo-thumb.jpg',
      preview_url: 'https://example.com/videos/demo-preview.mp4',
      created_at: now,
      updated_at: now,
    };
    this.videoTasks.set(demoTask.id, demoTask);

    const demoMetric: VideoMetricRecord = {
      id: 'metric-demo-001',
      video_id: demoVideo.id,
      views: 12500,
      three_second_rate: 68.5,
      completion_rate: 28.3,
      click_rate: 4.2,
      conversion_rate: 0.08,
      gmv: 1250,
      watch_time_distribution: [
        { second: 0, retention: 100 },
        { second: 3, retention: 68.5 },
        { second: 8, retention: 42.1 },
        { second: 14.5, retention: 28.3 },
      ],
      shot_boundaries: [0, 3.0, 6.5, 10.0, 12.5, 14.5],
      needs_optimization: true,
      created_at: now,
    };
    this.videoMetrics.set(demoMetric.video_id, demoMetric);

    const demoDiagnosis: DiagnosisReportRecord = {
      id: 'diag-demo-001',
      video_id: demoVideo.id,
      status: 'completed',
      issues: [
        {
          shot_index: 0,
          issue_type: 'hook_weak',
          severity: 'high',
          description: '开场 Hook 力度不足，建议增加痛点冲击感。',
          optimized_prompt: '开场3秒用特写镜头展示夏天皮肤晒伤的对比，画外音：你知道没做好防晒会怎样吗？',
        },
      ],
      suggestions: [
        {
          shot_index: 0,
          optimized_prompt: '强化开场冲击感，增加晒伤对比与更直接的利益点表达。',
        },
      ],
      created_at: now,
    };
    this.diagnosisReports.set(demoDiagnosis.video_id, demoDiagnosis);

    const demoGene: ViralGeneRecord = {
      id: 'gene-demo-001',
      category: '美妆',
      strategy_summary: '第一人称BGM氛围沉浸：用轻柔BGM引入真实使用场景，强调质感体验',
      factors: {
        visual_style: '轻奢质感风',
        hook_type: '问题式Hook',
        narration_style: '优雅知性',
        rhythm: '慢镜强调',
        cta: '品牌心智',
      },
      storyboard_structure: { shot_count: 4, rhythm: '慢-快-慢', cta_position: 'last_shot' },
      performance_score: 88.5,
      shot_count: 4,
      source_count: 7,
      embedding: '[0.1,0.2,0.3]',
      created_at: now,
    };
    this.viralGenes.set(demoGene.id, demoGene);

    const demoLibrary: ViralLibraryRecord = {
      id: 'vlib-demo-001',
      title: '防晒霜测评｜亲测4款SPF50防晒，谁更好用？',
      platform: 'tiktok',
      source_url: 'https://www.tiktok.com/@xxx/video/xxx',
      declared_at: now,
      thumbnail_url: 'https://example.com/viral/demo-cover.jpg',
      status: 'completed',
      performance_score: 91.5,
      analysis_report: {
        hook: '开场3秒晒伤恐惧钩子',
        shot_count: 6,
        rhythm: '快切节奏（0.5-1s/镜）',
        cta: '限时优惠',
        style_tags: ['自然日系', '真实测评'],
      },
      created_at: now,
    };
    this.viralLibrary.set(demoLibrary.id, demoLibrary);

    const factorValues = [
      {
        dimension: 'visual_style',
        label: '视觉风格',
        description: '控制画面整体色调与构图偏好',
        values: [
          { value: 'black_minimal', label: '黑风极简' },
          { value: 'summer_vacation', label: '夏日度假风' },
          { value: 'cyberpunk', label: '赛博科技风' },
          { value: 'luxury', label: '轻奢质感风' },
        ],
      },
      {
        dimension: 'hook_type',
        label: '开场手法',
        description: '控制前3秒吸引力方式',
        values: [
          { value: 'problem_hook', label: '问题式Hook' },
          { value: 'price_hook', label: '价格锚点Hook' },
          { value: 'mystery_hook', label: '悬念式Hook' },
          { value: 'data_hook', label: '数据震撼Hook' },
        ],
      },
      {
        dimension: 'narration_style',
        label: '旁白风格',
        description: '控制配音文案语气与措辞',
        values: [
          { value: 'elegant', label: '优雅知性' },
          { value: 'lively', label: '活泼种草' },
          { value: 'pro_review', label: '专业测评' },
          { value: 'daily', label: '亲切日常' },
        ],
      },
      {
        dimension: 'rhythm',
        label: '节奏密度',
        description: '控制分镜时长分配策略',
        values: [
          { value: 'fast_cut', label: '快切节奏（0.5-1s/镜）' },
          { value: 'medium', label: '中速（1-2s/镜）' },
          { value: 'slow', label: '慢镜强调（2-3s/镜）' },
        ],
      },
      {
        dimension: 'cta',
        label: 'CTA 形式',
        description: '控制结尾行动号召方式',
        values: [
          { value: 'buy_now', label: '立即下单' },
          { value: 'cart', label: '点击购物车' },
          { value: 'discount', label: '限时优惠' },
          { value: 'brand', label: '品牌心智' },
        ],
      },
    ];
    for (const factor of factorValues) {
      this.factors.set(factor.dimension, {
        id: randomUUID(),
        dimension: factor.dimension,
        label: factor.label,
        description: factor.description,
        values: factor.values,
      });
    }
  }

  listUsers(): UserRecord[] {
    return [...this.users.values()].map((user) => ({ ...user }));
  }

  getUserById(id: string): UserRecord | undefined {
    const user = this.users.get(id);
    return user ? { ...user } : undefined;
  }

  getUserByEmail(email: string): UserRecord | undefined {
    const user = [...this.users.values()].find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    return user ? { ...user } : undefined;
  }

  getUserByNickname(nickname: string): UserRecord | undefined {
    const user = [...this.users.values()].find((entry) => entry.nickname === nickname);
    return user ? { ...user } : undefined;
  }

  createUser(email: string, passwordHash: string, nickname?: string, isGuest = false): UserRecord {
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email,
      password_hash: passwordHash,
      nickname: nickname || email.split('@')[0],
      avatar_url: null,
      plan_type: 'free',
      video_quota: isGuest ? 2 : 3,
      is_guest: isGuest,
      created_at: now,
      updated_at: now,
    };
    this.users.set(user.id, user);
    return { ...user };
  }

  updateUser(id: string, patch: Partial<Pick<UserRecord, 'nickname' | 'avatar_url' | 'video_quota' | 'plan_type'>>): UserRecord | undefined {
    const current = this.users.get(id);
    if (!current) {
      return undefined;
    }
    const updated: UserRecord = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    this.users.set(id, updated);
    return { ...updated };
  }

  createProject(userId: string, input: ProjectInput): ProjectRecord {
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: randomUUID(),
      user_id: userId,
      name: input.name,
      description: input.description || '',
      product_url: null,
      product_info: null,
      cover_url: null,
      status: 'draft',
      material_count: 0,
      script_count: 0,
      video_count: 0,
      views: 0,
      render_progress: 0,
      tiktok_ready: false,
      created_at: now,
      updated_at: now,
    };
    this.projects.set(project.id, project);
    return { ...project };
  }

  listProjects(userId: string, keyword = ''): ProjectRecord[] {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return [...this.projects.values()]
      .filter((project) => project.user_id === userId)
      .filter((project) => (normalizedKeyword ? project.name.toLowerCase().includes(normalizedKeyword) : true))
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map((project) => ({ ...project }));
  }

  getProject(id: string): ProjectRecord | undefined {
    const project = this.projects.get(id);
    return project ? { ...project } : undefined;
  }

  updateProject(id: string, patch: Partial<Pick<ProjectRecord, 'name' | 'description' | 'status' | 'cover_url' | 'product_info' | 'product_url' | 'material_count' | 'script_count' | 'video_count'>>): ProjectRecord | undefined {
    const current = this.projects.get(id);
    if (!current) {
      return undefined;
    }
    const updated: ProjectRecord = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    this.projects.set(id, updated);
    return { ...updated };
  }

  deleteProject(id: string): boolean {
    return this.projects.delete(id);
  }

  upsertProduct(projectId: string, productInfo: ProductInput | ProductParseResult | ProductInfo): ProjectRecord | undefined {
    const current = this.projects.get(projectId);
    if (!current) {
      return undefined;
    }
    const coverUrl = 'cover_url' in productInfo ? String(productInfo.cover_url) : current.cover_url;
    const updated: ProjectRecord = {
      ...current,
      product_info: { ...productInfo },
      cover_url: coverUrl || current.cover_url,
      product_url: current.product_url,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    };
    this.projects.set(projectId, updated);
    return { ...updated };
  }

  parseProductUrl(url: string): ProductParseResult {
    return {
      name: 'XX SPF50+ 防晒霜 50ml',
      category: 'beauty',
      selling_points: ['SPF50+ PA++++', '轻薄不油腻', '防水防汗'],
      target_audience: '18-30岁都市女性',
      usage_scene: '户外运动/日常出行',
      price_anchor: '原价¥199，现¥89',
      cover_url: `${url.replace(/\/$/, '')}/cover.jpg`,
    };
  }

  parseProductImage(imageName: string): ProductParseResult {
    return {
      name: imageName || '商品主图解析结果',
      category: 'beauty',
      selling_points: ['主图识别卖点', '视觉突出', '信息结构化'],
      target_audience: '18-30岁都市女性',
      usage_scene: '社媒种草',
      price_anchor: '原价¥199，现¥89',
      cover_url: `https://placehold.co/400x600/E2E8F0/475569?text=${encodeURIComponent(imageName || 'Product')}`,
    };
  }

  listPublicProjects(): ProjectRecord[] {
    return [...this.projects.values()].map((project) => ({ ...project }));
  }

  getDemoUser(): UserRecord {
    const demoUser = this.getUserById('00000000-0000-0000-0000-000000000001');
    if (!demoUser) {
      throw new Error('Demo user not seeded');
    }
    return demoUser;
  }

  issueRefreshToken(userId: string): string {
    const token = `rt-${randomUUID()}`;
    this.refreshTokenStore.set(token, userId);
    return token;
  }

  getUserIdByRefreshToken(token: string): string | undefined {
    return this.refreshTokenStore.get(token);
  }

  issueResetToken(userId: string): string {
    const token = `pwr-${randomUUID()}`;
    this.resetTokens.set(token, { userId, expiresAt: Date.now() + 30 * 60 * 1000 });
    return token;
  }

  consumeResetToken(token: string): string | undefined {
    const entry = this.resetTokens.get(token);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.resetTokens.delete(token);
      return undefined;
    }
    this.resetTokens.delete(token);
    return entry.userId;
  }

  // 邮箱验证码（注册流程）
  storeVerificationCode(email: string, code: string, passwordHash: string, nickname?: string): void {
    this.pendingRegistrations.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000, passwordHash, nickname });
  }

  consumeVerificationCode(email: string, code: string): { passwordHash: string; nickname?: string } | undefined {
    const entry = this.pendingRegistrations.get(email.toLowerCase());
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.pendingRegistrations.delete(email.toLowerCase());
      return undefined;
    }
    if (entry.code !== code) return undefined;
    this.pendingRegistrations.delete(email.toLowerCase());
    return { passwordHash: entry.passwordHash, nickname: entry.nickname };
  }

  blacklistRefreshToken(token: string): void {
    this.refreshTokenBlacklist.add(token);
    this.refreshTokenStore.delete(token);
  }

  isRefreshTokenBlacklisted(token: string): boolean {
    return this.refreshTokenBlacklist.has(token);
  }

  listMaterials(projectId: string, fileType = 'all'): MaterialRecord[] {
    return [...this.materials.values()]
      .filter((material) => material.project_id === projectId)
      .filter((material) => fileType === 'all' ? true : material.file_type === fileType)
      .map((material) => ({ ...material, analysis: { ...material.analysis }, slices: material.slices.map((slice) => ({ ...slice })) }));
  }

  createMaterials(projectId: string, files: Array<{ originalname?: string; mimetype?: string; size?: number }>) {
    const now = new Date().toISOString();
    const created = files.map((file, index) => {
      const fileType = file.mimetype?.startsWith('video/') ? 'video' : 'image';
      // 新建即为「待解析」状态：analysis/tags/embedding/duration/slices 留空，
      // 由 material-analysis 队列的异步 AI 解析完成后回填（见 updateMaterialAnalysis）。
      const material: MaterialRecord = {
        id: randomUUID(),
        project_id: projectId,
        file_url: `https://example.com/materials/${index + 1}-${file.originalname || 'upload'}`,
        file_type: fileType,
        file_name: file.originalname || `upload-${index + 1}`,
        file_size: file.size || 1024,
        analysis: {},
        embedding: '',
        tags: [],
        thumbnail_url: `https://example.com/materials/${index + 1}-thumb.jpg`,
        status: 'parsing',
        duration: null,
        slices: [],
        created_at: now,
      };
      this.materials.set(material.id, material);
      return { id: material.id, file_type: material.file_type, file_url: material.file_url, status: material.status, thumbnail_url: material.thumbnail_url };
    });
    const project = this.projects.get(projectId);
    if (project) {
      this.updateProject(projectId, { material_count: project.material_count + created.length, status: 'material_pending' });
    }
    return created;
  }

  /** 异步 AI 解析回填：填入 analysis/tags/embedding/duration 并把 status 翻成 ready / failed。 */
  updateMaterialAnalysis(
    id: string,
    patch: { status: 'ready' | 'failed'; analysis?: Record<string, unknown>; tags?: string[]; embedding?: string; duration?: number | null; slices?: Array<Record<string, unknown>> },
  ) {
    const current = this.materials.get(id);
    if (!current) {
      return undefined;
    }
    const updated: MaterialRecord = {
      ...current,
      status: patch.status,
      analysis: patch.analysis ?? current.analysis,
      tags: patch.tags ?? current.tags,
      embedding: patch.embedding ?? current.embedding,
      duration: patch.duration !== undefined ? patch.duration : current.duration,
      slices: patch.slices ?? current.slices,
    };
    this.materials.set(id, updated);
    return { ...updated };
  }

  getMaterial(id: string) {
    const material = this.materials.get(id);
    if (!material) {
      return undefined;
    }
    return { ...material, analysis: { ...material.analysis }, slices: material.slices.map((slice) => ({ ...slice })) };
  }

  updateMaterialTags(id: string, tags: string[]) {
    const current = this.materials.get(id);
    if (!current) {
      return undefined;
    }
    const updated: MaterialRecord = { ...current, tags: [...tags] };
    this.materials.set(id, updated);
    return { id: updated.id, tags: updated.tags };
  }

  deleteMaterial(id: string) {
    return this.materials.delete(id);
  }

  searchMaterials(projectId: string, q = '', tags = '', level = 'material') {
    const keyword = q.trim().toLowerCase();
    const tagList = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    const results: Array<Record<string, unknown>> = [];
    for (const material of this.materials.values()) {
      if (material.project_id !== projectId) {
        continue;
      }
      const textHit = keyword ? material.file_name.toLowerCase().includes(keyword) || material.tags.some((tag) => tag.includes(keyword)) : true;
      const tagHit = tagList.length > 0 ? tagList.every((tag) => material.tags.includes(tag)) : true;
      if (!textHit || !tagHit) {
        continue;
      }
      if (level === 'slice' && material.slices.length > 0) {
        for (const slice of material.slices) {
          results.push({ id: slice.id, type: 'slice', thumbnail_url: slice.thumbnail_url, tags: slice.tags, score: 0.92, start_sec: slice.start_sec, end_sec: slice.end_sec });
        }
      } else {
        results.push({ id: material.id, type: 'material', thumbnail_url: material.thumbnail_url, tags: material.tags, score: null, start_sec: null, end_sec: null });
      }
    }
    return results;
  }

  createScript(projectId: string, strategyType: string, storyboard?: ScriptShot[]) {
    const now = new Date().toISOString();
    // 优先用传入的（导演 Agent 生成的）分镜；缺省时退回内置示例，保证向后兼容
    const shots: ScriptShot[] = (storyboard && storyboard.length > 0)
      ? storyboard.map((shot, index) => ({ ...shot, index, reference_image_url: shot.reference_image_url ?? null }))
      : [
          { index: 0, description: '开场 Hook：痛点提问', camera_motion: 'push-in', duration: 3, voiceover: '你还在为...', subtitle: '拒绝油腻感', reference_image_url: null },
          { index: 1, description: '产品外观 + 卖点特写', camera_motion: 'static', duration: 3, voiceover: '这款防晒的重点是...', subtitle: '轻薄不油腻', reference_image_url: null },
          { index: 2, description: '使用场景演示', camera_motion: 'tracking', duration: 3, voiceover: '户外也能清爽自在', subtitle: '全天候防护', reference_image_url: null },
          { index: 3, description: '质地/成分细节展示', camera_motion: 'push-in', duration: 3, voiceover: '成分温和，敏感肌适用', subtitle: '温和不刺激', reference_image_url: null },
          { index: 4, description: '行动号召 CTA', camera_motion: 'static', duration: 3, voiceover: '现在下单立享优惠', subtitle: '立即下单', reference_image_url: null },
        ];
    const totalDuration = shots.reduce((sum, shot) => sum + (shot.duration || 0), 0);
    const script: ScriptRecord = {
      id: randomUUID(),
      project_id: projectId,
      strategy_type: strategyType,
      content: '基于商品信息生成的示例剧本',
      storyboard: shots,
      factors: {
        visual_style: '轻奢质感风',
        hook_type: '问题式Hook',
        narration_style: '活泼种草',
        rhythm: '中速',
        cta: '立即下单',
      },
      factor_history: [],
      status: 'completed',
      total_duration: totalDuration,
      created_at: now,
      updated_at: now,
    };
    this.scripts.set(script.id, script);
    const project = this.projects.get(projectId);
    if (project) {
      this.updateProject(projectId, { script_count: project.script_count + 1, status: 'script_pending' });
    }
    return script;
  }

  getScript(id: string) {
    const script = this.scripts.get(id);
    return script ? { ...script, storyboard: script.storyboard.map((shot) => ({ ...shot })), factors: { ...script.factors }, factor_history: script.factor_history.map((entry) => ({ ...entry })) } : undefined;
  }

  saveStoryboard(id: string, storyboard: ScriptShot[]) {
    const script = this.scripts.get(id);
    if (!script) {
      return undefined;
    }
    const totalDuration = storyboard.reduce((sum, shot) => sum + shot.duration, 0);
    const updated: ScriptRecord = { ...script, storyboard: storyboard.map((shot) => ({ ...shot })), total_duration: totalDuration, updated_at: new Date().toISOString() };
    this.scripts.set(id, updated);
    return updated;
  }

  regenerateShot(id: string, shotIndex: number, newPrompt?: string) {
    const script = this.scripts.get(id);
    if (!script) {
      return undefined;
    }
    const shot = script.storyboard[shotIndex];
    if (!shot) {
      return undefined;
    }
    const regenerated = { ...shot, description: newPrompt || `${shot.description}（重生成）`, voiceover: `${shot.voiceover}（优化）` };
    script.storyboard[shotIndex] = regenerated;
    script.updated_at = new Date().toISOString();
    this.scripts.set(id, script);
    return regenerated;
  }

  replaceFactor(id: string, dimension: string, newValue: string, scope: 'affected' | 'all' = 'affected') {
    const script = this.scripts.get(id);
    if (!script) {
      return undefined;
    }
    script.factors[dimension] = newValue;
    script.factor_history.push({ id: randomUUID(), dimension, previous_value: script.factors[dimension], new_value: newValue, scope, created_at: new Date().toISOString() });
    script.updated_at = new Date().toISOString();
    this.scripts.set(id, script);
    return { ...script };
  }

  listFactors() {
    return [...this.factors.values()].map((factor) => ({ ...factor, values: factor.values.map((value) => ({ ...value })) }));
  }

  createVideo(projectId: string, scriptId: string) {
    const now = new Date().toISOString();
    const script = this.scripts.get(scriptId);
    const video: VideoRecord = {
      id: randomUUID(),
      project_id: projectId,
      script_id: scriptId,
      video_url: null,
      duration: script?.total_duration || 14.5,
      resolution: '1080x1920',
      status: 'generating',
      trace_id: randomUUID(),
      generation_cost: 2.4,
      mock_render: false,
      settings: {
        tts: { language: 'zh', voice: 'female_gentle' },
        bgm: { preset_id: 'bgm-001', custom_url: null, volume: 0.15 },
      },
      created_at: now,
      updated_at: now,
    };
    this.videos.set(video.id, video);
    const tasks = script?.storyboard || [];
    for (const shot of tasks) {
      const task: VideoTaskRecord = {
        id: randomUUID(),
        video_id: video.id,
        shot_index: shot.index,
        seedance_task_id: `seedance-${randomUUID()}`,
        status: 'queued',
        retry_count: 0,
        error_msg: null,
        trace_id: video.trace_id,
        thumbnail_url: null,
        preview_url: null,
        created_at: now,
        updated_at: now,
      };
      this.videoTasks.set(task.id, task);
    }
    const project = this.projects.get(projectId);
    if (project) {
      this.updateProject(projectId, { video_count: project.video_count + 1, status: 'in_production' });
    }
    return video;
  }

  getVideo(id: string) {
    const video = this.videos.get(id);
    return video ? { ...video, settings: { tts: { ...video.settings.tts }, bgm: { ...video.settings.bgm } } } : undefined;
  }

  getVideoTask(taskId: string) {
    const task = this.videoTasks.get(taskId);
    return task ? { ...task } : undefined;
  }

  getVideoTasks(videoId: string) {
    return [...this.videoTasks.values()].filter((t) => t.video_id === videoId).map((t) => ({ ...t }));
  }

  updateVideoTask(taskId: string, patch: Partial<VideoTaskRecord>) {
    const task = this.videoTasks.get(taskId);
    if (!task) return;
    Object.assign(task, patch, { updated_at: new Date().toISOString() });
    this.videoTasks.set(taskId, task);
  }

  updateVideo(videoId: string, patch: Partial<VideoRecord>) {
    const video = this.videos.get(videoId);
    if (!video) return;
    Object.assign(video, patch, { updated_at: new Date().toISOString() });
    this.videos.set(videoId, video);
  }

  getVideoStatus(id: string) {
    const video = this.videos.get(id);
    if (!video) {
      return undefined;
    }
    const tasks = [...this.videoTasks.values()]
      .filter((task) => task.video_id === id)
      .map((task) => ({ ...task }))
      .sort((a, b) => a.shot_index - b.shot_index);
    const script = this.scripts.get(video.script_id || '');

    const totalShots = Math.max(tasks.length, script?.storyboard.length || 0, 1);
    const durationSec = Math.max(15, Math.round(video.duration || script?.total_duration || 15));
    const startAt = new Date(video.created_at).getTime();
    const elapsed = Math.max(0, (Date.now() - startAt) / 1000);
    const shotDuration = durationSec / totalShots;
    const rawProgress = Math.min(100, (elapsed / durationSec) * 100);

    let progress = Math.round(rawProgress);
    if (video.status === 'completed') {
      progress = 100;
    } else if (video.status === 'failed') {
      progress = Math.min(progress, 95);
    } else if (!video.mock_render) {
      progress = Math.min(progress, 95);
    }

    if (video.mock_render && rawProgress >= 100 && video.status !== 'completed' && video.status !== 'failed') {
      const fallbackUrl = `https://placehold.co/1080x1920/0B1C30/FFFFFF?text=VidCraft`;
      this.updateVideo(video.id, { status: 'completed', video_url: video.video_url || fallbackUrl });
      video.status = 'completed';
      progress = 100;
    }

    const currentShot = Math.min(totalShots - 1, Math.floor(Math.min(elapsed, durationSec - 0.001) / shotDuration));

    const shots = Array.from({ length: totalShots }).map((_, i) => {
      const task = tasks.find((t) => t.shot_index === i);
      const shotLabel = script?.storyboard.find((s) => s.index === i)?.description || `Scene ${String(i + 1).padStart(2, '0')}`;
      let status: VideoTaskRecord['status'] = task?.status || 'queued';
      let shotProgress = 0;

      if (video.status === 'completed') {
        status = 'completed';
        shotProgress = 100;
      } else if (video.status === 'failed') {
        status = status === 'completed' ? 'completed' : 'failed';
        shotProgress = status === 'completed' ? 100 : 0;
      } else {
        if (i < currentShot) {
          status = 'completed';
          shotProgress = 100;
        } else if (i === currentShot) {
          status = 'processing';
          shotProgress = Math.max(0, Math.min(99, Math.round(((elapsed - i * shotDuration) / shotDuration) * 100)));
        } else {
          status = 'queued';
          shotProgress = 0;
        }
      }

      return {
        index: i,
        label: shotLabel,
        status,
        retry_count: task?.retry_count || 0,
        error_msg: task?.error_msg || null,
        thumbnail_url: task?.thumbnail_url || `https://placehold.co/200x200/E2E8F0/94A3B8?text=Scene+${i + 1}`,
        preview_url: task?.preview_url || null,
        progress: shotProgress,
      };
    });

    const completedShots = shots.filter((shot) => shot.status === 'completed').length;

    const estimatedRemaining = (video.status === 'completed' || video.status === 'failed')
      ? 0
      : Math.max(0, Math.round(durationSec - elapsed));

    return {
      video_id: video.id,
      status: video.status === 'generating' || video.status === 'composing' ? 'rendering' : video.status,
      progress,
      completed_shots: completedShots,
      total_shots: totalShots,
      estimated_remaining: estimatedRemaining,
      estimated_seconds: estimatedRemaining,
      render_id: video.trace_id,
      resolution: video.resolution || '1080×1920 (9:16)',
      cover_url: video.status === 'completed' ? video.video_url : null,
      download_url: video.video_url,
      error_message: video.status === 'failed' ? '视频生成失败' : null,
      shots,
      trace_id: video.trace_id,
    };
  }

  /**
   * 取某项目「最新的视频任务状态」（按 created_at 倒序取第一条）。
   * 复用 getVideoStatus 的响应形状，已完成则带 cover_url/download_url；项目无视频时返回 undefined。
   */
  getLatestVideoByProject(projectId: string) {
    const latest = [...this.videos.values()]
      .filter((video) => video.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!latest) return undefined;
    return this.getVideoStatus(latest.id);
  }

  regenerateVideoShot(videoId: string, index: number, newPrompt?: string) {
    const task = [...this.videoTasks.values()].find((entry) => entry.video_id === videoId && entry.shot_index === index);
    if (!task) {
      return undefined;
    }
    task.status = 'queued';
    task.retry_count += 1;
    task.error_msg = null;
    task.updated_at = new Date().toISOString();
    this.videoTasks.set(task.id, task);
    return { shot_task_id: task.id, status: task.status, trace_id: task.trace_id, new_prompt: newPrompt || null };
  }

  updateVideoSettings(id: string, ttsLanguage?: string, ttsVoice?: string, bgmPresetId?: string, bgmCustomUrl?: string, bgmVolume?: number) {
    const video = this.videos.get(id);
    if (!video) {
      return undefined;
    }
    video.settings = {
      tts: { language: ttsLanguage || video.settings.tts.language, voice: ttsVoice || video.settings.tts.voice },
      bgm: {
        preset_id: bgmPresetId || video.settings.bgm.preset_id,
        custom_url: bgmCustomUrl || video.settings.bgm.custom_url,
        volume: bgmVolume ?? video.settings.bgm.volume,
      },
    };
    video.updated_at = new Date().toISOString();
    this.videos.set(id, video);
    return { video_id: id, tts: video.settings.tts, bgm: video.settings.bgm };
  }

  getVideoDownload(id: string) {
    const video = this.videos.get(id);
    if (!video) {
      return undefined;
    }
    return {
      download_url: video.video_url || `https://example.com/videos/${id}.mp4`,
      file_size: 25165824,
      duration: video.duration || 14.5,
      resolution: video.resolution || '1080x1920',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  exportVideo(id: string, aspect_ratio: string, resolution: string) {
    if (!this.videos.has(id)) {
      return undefined;
    }
    return { export_task_id: `exp-${randomUUID()}`, status: 'queued', estimated_seconds: 60, aspect_ratio, resolution };
  }

  getMetrics(videoId: string) {
    const metric = this.videoMetrics.get(videoId);
    return metric ? { ...metric, watch_time_distribution: metric.watch_time_distribution.map((point) => ({ ...point })), shot_boundaries: [...metric.shot_boundaries] } : undefined;
  }

  diagnoseVideo(videoId: string) {
    const metric = this.videoMetrics.get(videoId);
    if (!metric) {
      return undefined;
    }
    const diagnosis: DiagnosisReportRecord = {
      id: randomUUID(),
      video_id: videoId,
      status: 'analyzing',
      issues: metric.needs_optimization
        ? [{ shot_index: 0, issue_type: 'hook_weak', severity: 'high', description: '开场 Hook 力度不足', optimized_prompt: '提升前3秒冲击力' }]
        : [],
      suggestions: metric.needs_optimization
        ? [{ shot_index: 0, optimized_prompt: '开场3秒用特写镜头展示痛点，再给出解决方案' }]
        : [],
      created_at: new Date().toISOString(),
    };
    this.diagnosisReports.set(videoId, diagnosis);
    return { diagnosis_id: diagnosis.id, status: diagnosis.status };
  }

  getDiagnosis(videoId: string) {
    const diagnosis = this.diagnosisReports.get(videoId);
    if (!diagnosis) {
      return undefined;
    }
    return { diagnosis_id: diagnosis.id, status: 'completed', issues: diagnosis.issues, created_at: diagnosis.created_at };
  }

  searchGenes(category?: string, keyword?: string, vectorQuery?: string, limit = 10) {
    const normalizedKeyword = keyword?.trim().toLowerCase();
    const normalizedVector = vectorQuery?.trim().toLowerCase();
    return [...this.viralGenes.values()]
      .filter((gene) => (category ? gene.category === category : true))
      .filter((gene) => (normalizedKeyword ? gene.strategy_summary.toLowerCase().includes(normalizedKeyword) : true))
      .filter((gene) => (normalizedVector ? gene.strategy_summary.toLowerCase().includes(normalizedVector) : true))
      .slice(0, limit)
      .map((gene) => ({ ...gene, factors: { ...gene.factors }, storyboard_structure: { ...gene.storyboard_structure } }));
  }

  getGene(id: string) {
    const gene = this.viralGenes.get(id);
    return gene ? { ...gene, factors: { ...gene.factors }, storyboard_structure: { ...gene.storyboard_structure } } : undefined;
  }

  searchViralLibrary(keyword = '', category?: string, platform = 'all', sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'desc', limit = 12) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const items = [...this.viralLibrary.values()]
      .filter((item) => (category ? item.analysis_report.category === category || item.title.includes(category) : true))
      .filter((item) => (platform !== 'all' ? item.platform === platform : true))
      .filter((item) => (normalizedKeyword ? item.title.toLowerCase().includes(normalizedKeyword) || JSON.stringify(item.analysis_report).toLowerCase().includes(normalizedKeyword) : true))
      .sort((left, right) => {
        const leftValue = sortBy === 'score' ? (left.performance_score || 0) : Date.parse(left.created_at);
        const rightValue = sortBy === 'score' ? (right.performance_score || 0) : Date.parse(right.created_at);
        return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      })
      .slice(0, limit)
      .map((item) => ({ ...item, analysis_report: { ...item.analysis_report } }));
    return items;
  }

  importViralLibrary(url: string, category?: string) {
    const item: ViralLibraryRecord = {
      id: randomUUID(),
      title: '导入的公开视频',
      platform: url.includes('tiktok') ? 'tiktok' : url.includes('youtube') ? 'youtube' : 'other',
      source_url: url,
      declared_at: new Date().toISOString(),
      thumbnail_url: 'https://example.com/viral/import-thumb.jpg',
      status: 'analyzing',
      performance_score: null,
      analysis_report: {
        category: category || 'other',
        hook: '导入分析中',
        shot_count: 0,
        rhythm: '待分析',
        cta: '待分析',
        style_tags: [],
      },
      created_at: new Date().toISOString(),
    };
    this.viralLibrary.set(item.id, item);
    return { id: item.id, status: item.status, task_id: `vl-task-${randomUUID()}` };
  }

  uploadAnalyzeViralLibrary(title?: string, category?: string) {
    const item: ViralLibraryRecord = {
      id: randomUUID(),
      title: title || '本地视频',
      platform: 'local',
      source_url: null,
      declared_at: new Date().toISOString(),
      thumbnail_url: 'https://example.com/viral/local-thumb.jpg',
      status: 'analyzing',
      performance_score: null,
      analysis_report: {
        category: category || 'other',
        hook: '本地视频解析中',
        shot_count: 0,
        rhythm: '待分析',
        cta: '待分析',
        style_tags: [],
      },
      created_at: new Date().toISOString(),
    };
    this.viralLibrary.set(item.id, item);
    return { id: item.id, status: item.status, task_id: `vl-task-${randomUUID()}` };
  }

  getViralLibrary(id: string) {
    const item = this.viralLibrary.get(id);
    return item ? { ...item, analysis_report: { ...item.analysis_report } } : undefined;
  }

  referenceViralLibrary(id: string, scriptId: string) {
    const item = this.viralLibrary.get(id);
    const script = this.scripts.get(scriptId);
    if (!item || !script) {
      return undefined;
    }
    script.storyboard = script.storyboard.slice(0, 1).concat({
      index: script.storyboard.length,
      description: `借鉴 ${item.title}`,
      camera_motion: 'pan-left',
      duration: 3,
      voiceover: '参考爆款结构生成',
      subtitle: '借鉴优化',
      reference_image_url: item.thumbnail_url,
    });
    script.updated_at = new Date().toISOString();
    this.scripts.set(scriptId, script);
    return { script_id: scriptId, task_id: `ref-task-${randomUUID()}`, status: 'generating' };
  }
}