import { http, HttpResponse, delay } from 'msw';
import type { ParsedProduct, Product } from '@/types';

/**
 * Products 模块 Mock
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 4 章
 *
 * 注意：parse-url / parse-image 故意延迟 1.5s 以演示解析等待 + Skeleton
 */

const sampleParsed: ParsedProduct = {
  name: 'ProSound Ultra Wireless · 降噪蓝牙耳机',
  category: '电子产品',
  selling_points: [
    '40dB 深度主动降噪',
    '正版 40mm 高保真扬声器',
    '持久 32 小时长效续航',
    '三麦克风通话降噪系统',
  ],
  target_audience: '追求高品质音乐体验的都市白领，频繁出差或通勤人群，需要专注工作的远程办公人士',
  usage_scene: '通勤地铁屏蔽噪音、会议视频通话、运动健身、深夜专心学习',
  price_anchor: '原价 ¥598，现 ¥398',
  cover_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
};

/** 模拟存储：projectId → product */
const productsStore = new Map<string, Product>();

export const productHandlers = [
  // POST /api/products/parse-url
  http.post('/api/products/parse-url', async ({ request }) => {
    await delay(1500); // 模拟 AI 解析耗时
    const body = (await request.json()) as { project_id: string; url: string };
    const product: Product = {
      ...sampleParsed,
      project_id: body.project_id,
      updated_at: new Date().toISOString(),
    };
    productsStore.set(body.project_id, product);
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: product, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/products/parse-image
  http.post('/api/products/parse-image', async ({ request }) => {
    await delay(1500);
    const fd = await request.formData();
    const projectId = String(fd.get('project_id') || 'demo');
    const product: Product = {
      ...sampleParsed,
      project_id: projectId,
      updated_at: new Date().toISOString(),
    };
    productsStore.set(projectId, product);
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: product, traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/products/:project_id
  http.get('/api/products/:project_id', ({ params }) => {
    const product = productsStore.get(String(params.project_id));
    if (!product) {
      return HttpResponse.json(
        { code: 404, msg: '商品信息不存在', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: product, traceId: `mock-${Date.now()}`,
    });
  }),

  // PUT /api/products/:project_id
  http.put('/api/products/:project_id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<ParsedProduct>;
    const projectId = String(params.project_id);
    const existing = productsStore.get(projectId) || {
      ...sampleParsed,
      project_id: projectId,
      updated_at: new Date().toISOString(),
    };
    const merged: Product = {
      ...existing,
      ...body,
      project_id: projectId,
      updated_at: new Date().toISOString(),
    } as Product;
    productsStore.set(projectId, merged);
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: merged, traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/products/:project_id/confirm
  http.post('/api/products/:project_id/confirm', ({ params }) => {
    const exists = productsStore.has(String(params.project_id));
    if (!exists) {
      return HttpResponse.json(
        { code: 400, msg: '请先填写商品信息', total: 0, data: null, traceId: `mock-${Date.now()}` },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      code: 200, msg: null, total: 0, data: null, traceId: `mock-${Date.now()}`,
    });
  }),
];
