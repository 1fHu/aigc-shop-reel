/**
 * 商品（Product）相关类型
 * 严格按《VidCraft API 接口规范文档 v1.0》第 4 章对齐
 */

/**
 * 商品解析返回结构（POST /api/products/parse-url 和 parse-image 共用）
 */
export interface ParsedProduct {
  name: string;
  category: string;
  selling_points: string[];   // ≤ 5 条
  target_audience: string;
  usage_scene: string;
  price_anchor: string;       // 如 "原价¥199，现¥89"
  cover_url: string;
}

/**
 * 手动填写 / 更新商品的 payload
 * PUT /api/products/:project_id
 */
export interface UpdateProductPayload {
  name: string;
  category: string;
  selling_points: string[];
  target_audience?: string;
  usage_scene?: string;
  price_anchor?: string;
}

/**
 * GET /api/products/:project_id 返回结构（与 ParsedProduct 一致 + 元数据）
 */
export interface Product extends ParsedProduct {
  project_id: string;
  updated_at: string;
}
