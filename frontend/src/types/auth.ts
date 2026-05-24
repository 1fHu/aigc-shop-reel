/**
 * 用户与认证相关类型
 */

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  role: 'guest' | 'merchant' | 'admin';
  isGuest: boolean;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
