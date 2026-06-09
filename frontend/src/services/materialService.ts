import api from './api';
import type { MaterialDetail, MaterialGlobalSearchItem, MaterialListItem, MaterialUploadItem } from '@/types';

export const materialService = {
	list(projectId: string, type: 'all' | 'image' | 'video' = 'all', page = 1, limit = 24): Promise<MaterialListItem[]> {
		return api.get('/materials', { params: { project_id: projectId, type, page, limit } });
	},

	/** 跨项目按文件名/标签检索当前用户素材（顶栏全局搜索） */
	globalSearch(q: string, type: 'all' | 'image' | 'video' = 'all', limit = 20): Promise<MaterialGlobalSearchItem[]> {
		return api.get('/materials/global-search', { params: { q, type, limit } });
	},

	upload(projectId: string, files: File[]): Promise<MaterialUploadItem[]> {
		const fd = new FormData();
		fd.append('project_id', projectId);
		files.forEach((file) => fd.append('files', file));
		return api.post('/materials/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
	},

	getById(id: string): Promise<MaterialDetail> {
		return api.get(`/materials/${id}`);
	},

	delete(id: string): Promise<void> {
		return api.delete(`/materials/${id}`);
	},
};
