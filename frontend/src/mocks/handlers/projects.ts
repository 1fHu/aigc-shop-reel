import { http, HttpResponse } from 'msw';
import type { ProjectListItem } from '@/types';

/**
 * 项目模块 Mock
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 3 章
 *
 * 注意：使用 module-level mutable 数组模拟"数据库持久化"。
 * - 创建 / 删除会影响后续 GET 列表
 * - 页面刷新（重新加载 JS）会重置数据
 * - HMR 时也会重置（Vite 重新执行 handler 模块）
 */

const initialProjects: ProjectListItem[] = [
  {
    id: 'proj-001',
    name: 'Summer Skin Glow',
    cover_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=375&fit=crop',
    video_count: 1,
    status: 'finished',
    updated_at: '2026-05-25T10:00:00Z',
  },
  {
    id: 'proj-002',
    name: 'Tech Gear Pro',
    cover_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=375&fit=crop',
    video_count: 0,
    status: 'video_pending',
    updated_at: '2026-05-25T11:45:00Z',
  },
  {
    id: 'proj-003',
    name: 'Kitchen Essentials',
    cover_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=375&fit=crop',
    video_count: 2,
    status: 'finished',
    updated_at: '2026-05-24T09:00:00Z',
  },
  {
    id: 'proj-004',
    name: 'Urban Style Edit',
    cover_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=375&fit=crop',
    video_count: 1,
    status: 'finished',
    updated_at: '2026-05-23T16:00:00Z',
  },
];

/** 模拟"数据库"，POST / DELETE 直接改这个 */
const projectsStore: ProjectListItem[] = [...initialProjects];

/** 供其它 mock handler（如 videos）按 id 查项目真实状态用 */
export function findMockProject(id: string): ProjectListItem | undefined {
  return projectsStore.find((p) => p.id === id);
}

/** 给新建项目用的默认封面（picsum 按 id 种子生成稳定图片） */
function defaultCover(seed: string): string {
  return `https://picsum.photos/seed/${seed}/600/375`;
}

export const projectHandlers = [
  // GET /api/projects?page=&limit=&keyword=
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword') || '';
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 20;

    const filtered = keyword
      ? projectsStore.filter((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
      : projectsStore;

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
    const id = `proj-${Date.now()}`;
    const newProject: ProjectListItem = {
      id,
      name: body.name,
      cover_url: defaultCover(id),
      video_count: 0,
      status: 'material_pending',
      updated_at: new Date().toISOString(),
    };
    projectsStore.unshift(newProject);   // 加到最前
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: newProject,
      traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/projects/:id
  http.get('/api/projects/:id', ({ params }) => {
    const item = projectsStore.find((p) => p.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { code: 404, msg: '项目不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    // 详情含各阶段进度计数（对齐后端 GET /api/projects/:id）。
    // 素材待上传尚未进入剧本阶段 → script_count=0；其余阶段视为已生成剧本。
    const detail = {
      ...item,
      description: '',
      product_info: null,
      material_count: item.status === 'material_pending' ? 0 : 5,
      script_count: item.status === 'material_pending' ? 0 : 1,
      video_count: item.video_count,
    };
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: detail, traceId: `mock-${Date.now()}`,
    });
  }),

  // DELETE /api/projects/:id (request body 含 confirm_name)
  http.delete('/api/projects/:id', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { confirm_name?: string };
    const idx = projectsStore.findIndex((p) => p.id === params.id);
    if (idx < 0) {
      return HttpResponse.json(
        { code: 404, msg: '项目不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    if (body.confirm_name !== projectsStore[idx].name) {
      return HttpResponse.json(
        { code: 400, msg: '确认名称不匹配', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 400 },
      );
    }
    projectsStore.splice(idx, 1);
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: null, traceId: `mock-${Date.now()}`,
    });
  }),
];
