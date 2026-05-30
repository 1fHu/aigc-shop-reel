import api from './api';
import type { MaterialDetail, MaterialListItem, MaterialUploadItem } from '@/types';

export const materialService = {
	list(projectId: string, type: 'all' | 'image' | 'video' = 'all', page = 1, limit = 24): Promise<MaterialListItem[]> {
		return api.get('/materials', { params: { project_id: projectId, type, page, limit } });
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
};
