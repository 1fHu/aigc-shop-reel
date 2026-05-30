export type MaterialStatus = 'parsing' | 'ready' | 'failed';
export type MaterialFileType = 'image' | 'video';

/** GET /api/materials 列表条目 */
export interface MaterialListItem {
  id: string;
  file_type: MaterialFileType;
  file_name: string;
  file_size: number;
  thumbnail_url: string;
  status: MaterialStatus;
  tags: string[];
  duration: number | null;
  created_at: string;
  analysis: Record<string, unknown>;
}

/** POST /api/materials/upload 返回条目 */
export interface MaterialUploadItem {
  id: string;
  file_type: MaterialFileType;
  file_url: string;
  status: MaterialStatus;
  thumbnail_url: string;
}

/** GET /api/materials/:id 详情 */
export interface MaterialDetail {
  id: string;
  project_id: string;
  file_url: string;
  file_type: MaterialFileType;
  file_name: string;
  file_size: number;
  analysis: Record<string, unknown>;
  embedding: string;
  tags: string[];
  thumbnail_url: string;
  status: MaterialStatus;
  duration: number | null;
  slices: Array<Record<string, unknown>>;
  created_at: string;
}
