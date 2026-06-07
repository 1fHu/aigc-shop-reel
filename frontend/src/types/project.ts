/**
 * 项目相关类型
 * 严格按《VidCraft API 接口规范文档 v1.0》第 3 章对齐
 */

export type ProjectStatus =
  | 'material_pending'
  | 'script_pending'
  | 'video_pending'
  | 'finished'
  | 'draft'
  | 'in_progress'
  | 'completed';

/**
 * 项目列表项（GET /api/projects 返回结构）
 */
export interface ProjectListItem {
  id: string;
  name: string;
  cover_url: string;
  video_count: number;
  status: ProjectStatus;
  updated_at: string;
}

/**
 * 项目详情（GET /api/projects/:id 返回结构）
 * 对齐《API 接口规范文档》第 3 章详情端点
 */
export interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  product_info?: Record<string, unknown> | null;
  material_count: number;
  script_count: number;
  video_count: number;
}

/**
 * 创建项目请求参数（POST /api/projects）
 */
export interface CreateProjectPayload {
  name: string;
  description?: string;
}

/**
 * 列表查询参数（GET /api/projects?page=&limit=&keyword=）
 */
export interface ProjectListQuery {
  page?: number;
  limit?: number;
  keyword?: string;
}
