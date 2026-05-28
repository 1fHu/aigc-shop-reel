/**
 * 商品（Product）相关类型
 * 严格按后端 dto/update-product.dto.ts 对齐（后端 v1.1+）
 */

/** 品类枚举（后端 PRODUCT_CATEGORIES，9 个值） */
export const PRODUCT_CATEGORIES = [
  'fashion', 'beauty', 'home', 'electronics',
  'food', 'sports', 'mother_baby', 'pet', 'other',
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

/** 中文展示名 */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  fashion:     '服饰',
  beauty:      '美妆',
  home:        '家居',
  electronics: '电子产品',
  food:        '食品',
  sports:      '运动',
  mother_baby: '母婴',
  pet:         '宠物',
  other:       '其他',
};

/** 安全展示 category：枚举值显示中文，否则原样返回（兜底 legacy 数据） */
export function categoryLabel(value: string | undefined | null): string {
  if (!value) return '';
  return (PRODUCT_CATEGORY_LABELS as Record<string, string>)[value] || value;
}

/**
 * 商品解析返回结构（POST /api/products/parse-url 和 parse-image 共用）
 */
export interface ParsedProduct {
  name: string;
  category: string;            // 枚举 ProductCategory，但容忍 legacy 字符串
  selling_points: string[];    // ≤ 5 条
  target_audience: string;
  usage_scene: string;
  price_anchor: string;        // 如 "原价¥199，现¥89"
  cover_url: string;
}

/**
 * 手动填写 / 更新商品的 payload
 * PUT /api/products/:project_id
 * 后端 dto：name(max 200) / category(enum, required) / selling_points(1-5)
 * 可选：target_audience(max 200) / usage_scene(max 200) / price_anchor(max 100)
 */
export interface UpdateProductPayload {
  name: string;
  category: ProductCategory;
  selling_points: string[];
  target_audience?: string;
  usage_scene?: string;
  price_anchor?: string;
}

/**
 * GET /api/products/:project_id 返回结构（与 ParsedProduct 一致 + 元数据）
 * 注：GET 多返一个 `confirmed`，PUT / parse 不返；用 optional 兼容
 */
export interface Product extends ParsedProduct {
  project_id: string;
  updated_at: string;
  confirmed?: boolean;     // 仅 GET /products/:project_id 返回，true = 已 confirm 进入下一阶段
}
