import api from './api';
import type { ParsedProduct, Product, UpdateProductPayload } from '@/types';

/**
 * 商品（Product）模块 API
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 4 章
 *
 * 注意：解析超时（spec 规定 15s）会返回 code 408；
 * 拦截器目前会按通用 5xx 分支处理，业务可在 UI 层捕获 408 单独提示。
 */
export const productService = {
  /** 解析商品链接 */
  parseUrl(payload: { project_id: string; url: string }): Promise<ParsedProduct> {
    return api.post('/products/parse-url', payload);
  },

  /** 解析商品主图（multipart/form-data） */
  parseImage(projectId: string, image: File): Promise<ParsedProduct> {
    const fd = new FormData();
    fd.append('project_id', projectId);
    fd.append('image', image);
    return api.post('/products/parse-image', fd, { timeout: 60000 });
  },

  /** 获取项目当前商品信息 */
  get(projectId: string): Promise<Product> {
    return api.get(`/products/${projectId}`);
  },

  /** 手动填写 / 更新商品信息 */
  update(projectId: string, payload: UpdateProductPayload): Promise<Product> {
    return api.put(`/products/${projectId}`, payload);
  },

  /** 确认商品信息，进入下一阶段（剧本生成） */
  confirm(projectId: string): Promise<void> {
    return api.post(`/products/${projectId}/confirm`);
  },
};
