/**
 * 用户与认证相关类型
 * 严格按《VidCraft API 接口规范文档 v1.0》第 1-2 章对齐
 *
 * 注意：后端混用 camelCase 和 snake_case
 * - Token 类字段为 camelCase（accessToken / refreshToken）
 * - User 内部字段为 snake_case（is_guest / plan_type / video_quota）
 * 前端类型保留后端原始命名，避免转换层带来的不一致
 */

export type UserPlan = 'free' | 'pro' | 'team';

export interface User {
  id: string;
  email?: string | null;   // 游客用户没有 email
  nickname: string;
  avatar_url?: string | null;  // 后端 v1.1 实际字段名（snake_case 与项目约定一致）
  is_guest: boolean;
  plan_type?: UserPlan;    // 仅注册用户有
  video_quota: number;     // 剩余视频生成配额
  created_at?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 所有登录类接口（登录 / 注册 / 游客 / refresh）的统一返回结构
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
