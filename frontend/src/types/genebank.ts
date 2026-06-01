/**
 * 爆款模板库（GeneBank / Viral Library）相关类型
 *
 * 端点：`/api/viral-library/*`（后端 viral-library 模块）
 * 前端页面：`/gene-bank`（ProjectEntryModal "风格模板" 入口跳过来）
 *
 * 说明：
 * 1. 前端类型严格按 backend `MockStoreService.searchViralLibrary` 返回结构对齐
 * 2. `analysis_report` 字段是 AI 拆解的核心产出（Hook / 卖点 / 节奏 / 风格）
 * 3. `recommended_factors` 是给 ScriptStudio 用的"创作因子推荐"，
 *    值必须能映射到 ScriptStudio 现有 5 个 factor option 列表
 *
 * ⚠️ Backend coordination：
 * - 当前后端 `analysis_report` 只含 hook/shot_count/rhythm/cta/style_tags
 * - 前端期望补 `selling_points`、`highlights`、`recommended_factors`、`visual_palette`
 * - 等 AI 分析器实现时，让后端按本类型扩展
 */

export type ViralPlatform = 'tiktok' | 'youtube' | 'instagram' | 'other' | 'local';
export type ViralStatus   = 'analyzing' | 'completed' | 'failed';

/** 平台中文展示名 */
export const VIRAL_PLATFORM_LABELS: Record<ViralPlatform, string> = {
  tiktok:    'TikTok',
  youtube:   'YouTube',
  instagram: 'Instagram',
  other:     '其他',
  local:     '本地上传',
};

/**
 * AI 拆解到的"推荐创作因子"
 * 值取自 ScriptStudio 已有的 5 个 factor 选项库
 */
export interface ViralRecommendedFactors {
  visual_style: string;   // 如：电影级精致 / 极简主义 / 夏日度假风
  opener:       string;   // 如：痛点提问 / 利益点切入
  narration:    string;   // 如：冷静知性 / 热情号召
  pacing:       string;   // 如：快节奏 / 中节奏
  cta:          string;   // 如：限时折扣 / 直接报价
}

/**
 * AI 拆解报告（每条爆款视频的核心产出）
 */
export interface ViralAnalysisReport {
  category: string;                 // 品类 fashion/beauty/...
  hook: string;                     // Hook 手法文字描述（"0-3s 产品大特写..."）
  shot_count: number;               // 总分镜数估算
  rhythm: string;                   // 节奏描述
  cta: string;                      // CTA 类型
  style_tags: string[];             // 视觉风格 chips

  // ⬇️ 以下字段为前端期望扩展，待后端 AI 分析器实现
  selling_points?: string[];        // 核心卖点列表
  highlights?: string[];            // 重点高亮项（前端 ✨ 显示）
  visual_palette?: string;          // 调色板描述 "cold_tech" / "warm_lifestyle"
  recommended_factors?: ViralRecommendedFactors;  // 推荐创作因子
}

/**
 * 爆款视频卡片（列表项 + 详情共用结构）
 */
export interface ViralCard {
  id: string;
  title: string;
  platform: ViralPlatform;
  source_url: string | null;
  declared_at: string;              // 合规声明时间
  thumbnail_url: string;
  status: ViralStatus;
  performance_score: number | null; // 0-100 性能评分
  analysis_report: ViralAnalysisReport;
  created_at: string;
}

/**
 * 列表查询参数（GET /api/viral-library/search）
 */
export interface ViralSearchQuery {
  keyword?: string;
  category?: string;
  platform?: ViralPlatform | 'all';
  sort_by?: 'created_at' | 'score';
  sort_order?: 'asc' | 'desc';
  limit?: number;
}

/**
 * POST /api/viral-library/import-url 响应
 * 异步触发拆解，返回 task_id
 */
export interface ViralImportResult {
  id: string;
  status: ViralStatus;
  task_id: string;
}

/**
 * POST /api/viral-library/:id/reference 响应
 * 将此爆款应用为剧本参考
 */
export interface ViralReferenceResult {
  script_id: string;
  task_id: string;
  status: string;
}
