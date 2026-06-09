/**
 * 剧本（Script）与分镜（Scene）相关类型
 * 严格按《VidCraft API 接口规范文档 v1.0》第 5 章对齐
 *
 * ⚠️ 部分字段在 spec 中未完全详尽，前端按 prototype 设计与合理假设补全，
 * 与后端联调时需校验：详见 commit message 中标记的 TBD 项
 */

import type { ParsedProduct } from './product';

/** 剧本创作模式 */
export type ScriptMode = 'reference' | 'template' | 'auto';

/** 中文展示名（UI 用） */
export const SCRIPT_MODE_LABELS: Record<ScriptMode, string> = {
  reference: '爆款仿写',
  template:  '灵感模板',
  auto:      '自动化生成',
};

/** 创作因子的 5 个维度 */
export type FactorKey = 'visual_style' | 'opener' | 'narration' | 'pacing' | 'cta';

/** 当前剧本的因子状态：每个维度选了哪个值 */
export type FactorState = Record<FactorKey, string>;

/**
 * 因子库定义（GET /api/factors 返回结构）
 * 每个维度的标签 + 可选值列表
 */
export interface FactorGroup {
  key: FactorKey;
  label: string;          // 中文展示名，如 "视觉风格"
  options: string[];      // 可选值，如 ["电影级精致", "极简主义", ...]
}

/** 单个分镜 */
export interface Scene {
  id: string;
  index: number;          // 0-based
  duration: number;       // 秒
  thumb_url: string;
  description: string;    // 画面描述 / Prompt
  camera_motion: string;  // 镜头运动
  bgm: string;
  voiceover: string;      // 配音文案
  subtitle: string;       // 字幕
  // 素材召回绑定（后端权威，前端只读；可删除→回退默认占位图）
  material_id?: string | null;
  material_use_mode?: 'none' | 'direct' | 'adapted';
  material_score?: number | null;
}

/** 操作历史条目 */
export interface ScriptHistoryEntry {
  id: string;
  timestamp: string;        // ISO 时间
  message: string;          // 中文描述，如 '替换 "视觉风格" → 电影级精致'
  affected_scene_ids: string[];
}

/** GET /api/scripts/:id 返回的完整剧本 */
export interface Script {
  id: string;
  project_id: string;
  mode: ScriptMode;
  factors: FactorState;
  scenes: Scene[];
  total_duration: number;   // 秒
  version: string;          // 'v1.2.4'
  history: ScriptHistoryEntry[];
  product_snapshot?: ParsedProduct;   // 关联商品快照（用于编辑器右上提示）
  created_at: string;
  updated_at: string;
}

/** PUT /api/scripts/:id/storyboard 请求体 */
export interface SaveStoryboardPayload {
  storyboard: Scene[];       // 完整最新顺序与内容（后端字段名 storyboard）
}

/** POST /api/scripts/:id/regenerate-shot 请求体 */
export interface RegenerateShotPayload {
  scene_id: string;
  hint?: string;            // 可选：用户改动后的 prompt 提示
}

/** POST /api/scripts/:id/replace-factor 请求体 */
export interface ReplaceFactorPayload {
  factor: FactorKey;
  value: string;
}

/** POST /api/scripts/:id/replace-factor 响应 */
export interface ReplaceFactorResult {
  updated_scenes: Scene[];           // 受影响并被重生的分镜
  history_entry: ScriptHistoryEntry; // 新增的历史条目
}

/** POST /api/scripts/generate 请求体 */
export interface GenerateScriptPayload {
  project_id: string;
  strategy_type?: string;
  mode?: ScriptMode;
  reference_video_id?: string;
  template_id?: string;
  /** 因子面板当前选择（5 维中文标签）；后端归一为枚举码后注入分镜 prompt，优先级高于 reference_video_id */
  factors?: FactorState;
}

/** SSE 流式生成的事件类型 */
export type GenerateStreamEvent =
  | { type: 'meta'; script_id: string; total_scenes: number }
  | { type: 'scene'; scene: Scene }
  | { type: 'done'; script_id: string }
  | { type: 'error'; msg: string };
