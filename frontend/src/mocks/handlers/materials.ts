import { http, HttpResponse } from 'msw';

const materialsStore = new Map<string, { id: string }[]>();

export const materialHandlers = [
  // DELETE /api/materials/:id
  http.delete('/api/materials/:id', ({ params }) => {
    const { id } = params;
    // 从所有项目的素材列表中移除
    for (const [, items] of materialsStore) {
      const idx = items.findIndex((m) => m.id === id);
      if (idx !== -1) {
        items.splice(idx, 1);
        break;
      }
    }
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: { deleted: true, referenced_shots: 0 },
      traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/materials/global-search?q=...（顶栏全局搜索，mock 下素材库为空返回空集）
  http.get('/api/materials/global-search', () => {
    return HttpResponse.json({
      code: 200, msg: null, total: 0,
      data: [],
      traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/materials?project_id=...
  http.get('/api/materials', ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id') || '';
    const items = materialsStore.get(projectId) || [];
    return HttpResponse.json({
      code: 200, msg: null, total: items.length,
      data: items,
      traceId: `mock-${Date.now()}`,
    });
  }),
];
