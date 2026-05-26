import { http, HttpResponse } from 'msw';
import type { ProjectListItem } from '@/types';

/**
 * 项目模块 Mock
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 3 章
 */

const mockProjects: ProjectListItem[] = [
  {
    id: 'proj-001',
    name: 'Summer Skin Glow',
    cover_url: 'https://picsum.photos/seed/skin/600/360',
    video_count: 1,
    status: 'completed',
    updated_at: '2026-05-25T10:00:00Z',
  },
  {
    id: 'proj-002',
    name: 'Tech Gear Pro',
    cover_url: 'https://picsum.photos/seed/tech/600/360',
    video_count: 0,
    status: 'in_progress',
    updated_at: '2026-05-25T11:45:00Z',
  },
  {
    id: 'proj-003',
    name: 'Kitchen Essentials',
    cover_url: 'https://picsum.photos/seed/kitchen/600/360',
    video_count: 2,
    status: 'completed',
    updated_at: '2026-05-24T09:00:00Z',
  },
  {
    id: 'proj-004',
    name: 'Urban Style Edit',
    cover_url: 'https://picsum.photos/seed/urban/600/360',
    video_count: 1,
    status: 'completed',
    updated_at: '2026-05-23T16:00:00Z',
  },
];

export const projectHandlers = [
  // GET /api/projects?page=&limit=&keyword=
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword') || '';
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 20;

    const filtered = keyword
      ? mockProjects.filter((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
      : mockProjects;

    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      code: 200,
      msg: null,
      total: filtered.length,
      data: items,
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/projects
  http.post('/api/projects', async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: {
        id: `proj-${Date.now()}`,
        name: body.name,
        cover_url: '',
        video_count: 0,
        status: 'draft' as const,
        updated_at: new Date().toISOString(),
      } satisfies ProjectListItem,
      traceId: `mock-${Date.now()}`,
    });
  }),
];
