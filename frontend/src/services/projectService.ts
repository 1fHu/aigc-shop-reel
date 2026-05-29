import api from './api';
import type {
  CreateProjectPayload,
  ProjectListItem,
  ProjectListQuery,
} from '@/types';

/**
 * Project 模块 API
 * 端点按《VidCraft API 接口规范文档 v1.0》第 3 章
 *
 * 注意：v1.0 的 GET /api/projects 只支持 page / limit / keyword 三个参数。
 * 按状态筛选目前在前端 client-side 完成（数据量小够用）。
 * 数据量大时建议后端补 ?status= 查询参数。
 */
export const projectService = {
  /** 获取项目列表 */
  list(query?: ProjectListQuery): Promise<ProjectListItem[]> {
    return api.get('/projects', { params: query });
  },

  /** 获取项目详情 */
  detail(id: string): Promise<ProjectListItem> {
    return api.get(`/projects/${id}`);
  },

  /** 创建项目 */
  create(payload: CreateProjectPayload): Promise<ProjectListItem> {
    return api.post('/projects', payload);
  },

  /** 删除项目 */
  remove(id: string): Promise<void> {
    return api.delete(`/projects/${id}`);
  },
};
