import api from './api';
import type {
  ViralCard,
  ViralImportResult,
  ViralReferenceResult,
  ViralSearchQuery,
} from '@/types';

/**
 * 爆款模板库（GeneBank）模块 API
 * 端点对应后端 `backend/src/modules/viral-library/`
 *
 * 注意：前端页面路径是 `/gene-bank`，但 API 走 `/api/viral-library/*`
 * 这是团队约定：UI 上叫"风格模板 / 爆款基因"，后端模块叫 viral-library
 */
export const genebankService = {
  /** 搜索爆款视频卡片 */
  search(query: ViralSearchQuery = {}): Promise<ViralCard[]> {
    return api.get('/viral-library/search', { params: query });
  },

  /** 获取单条爆款视频详情（含完整 AI 拆解报告） */
  getById(id: string): Promise<ViralCard> {
    return api.get(`/viral-library/${id}`);
  },

  /** 导入站外公开视频 URL 触发 AI 异步拆解 */
  importUrl(payload: { url: string; category?: string }): Promise<ViralImportResult> {
    return api.post('/viral-library/import-url', payload);
  },

  /** 一键借鉴：把当前爆款应用为指定剧本的参考结构 */
  reference(viralId: string, scriptId: string): Promise<ViralReferenceResult> {
    return api.post(`/viral-library/${viralId}/reference`, { script_id: scriptId });
  },
};
