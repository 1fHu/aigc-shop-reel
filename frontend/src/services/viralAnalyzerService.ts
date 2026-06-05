import api from './api';

export interface AnalyzedVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  error_message: string | null;
  analysis: {
    hook: {
      time_range: string;
      content: string;
    };
    selling_points: string[];
    pacing: string;
    style: string;
  } | null;
  creative_factors: {
    visual_style: string;
    opener: string;
    narration: string;
    pacing: string;
    cta: string;
  } | null;
  created_at: string;
}

export interface AnalyzedVideoListItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  duration: number | null;
  created_at: string;
}

export const viralAnalyzerService = {
  /**
   * 上传视频文件
   */
  async upload(file: File): Promise<{ id: string; title: string; status: string; created_at: string }> {
    const formData = new FormData();
    formData.append('video', file);

    // axios 拦截器已自动解包 envelope，直接拿 data（约定见 authService）
    return api.post('/viral-analyzer/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 获取拆解历史列表
   */
  async getList(params: { page: number; limit: number }): Promise<{
    items: AnalyzedVideoListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    return api.get('/viral-analyzer/list', { params });
  },

  /**
   * 获取拆解详情
   */
  async getDetail(id: string): Promise<AnalyzedVideo> {
    return api.get(`/viral-analyzer/${id}`);
  },

  /**
   * 删除拆解记录
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/viral-analyzer/${id}`);
  },

  /**
   * 同步到基因库
   */
  async syncToGenebank(id: string): Promise<{ message: string; genebank_id: string }> {
    return await api.post(`/viral-analyzer/${id}/sync-to-genebank`);
  },
};
