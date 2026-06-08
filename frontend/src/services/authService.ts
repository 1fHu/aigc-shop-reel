import api from './api';
import type { AuthTokens, LoginPayload, RegisterPayload, User } from '@/types';

/**
 * Auth 模块 API
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 1-2 章
 *
 * 设计约定（所有 service 都应遵循）：
 * 1. 一个文件 = 一个业务模块
 * 2. 导出一个 *Service 对象，方法名用动词
 * 3. 接受简单参数，返回 Promise<DTO>，axios 拦截器已自动解包 response.data
 * 4. 不在 service 里调 message/toast（拦截器已统一处理错误）
 * 5. 不持有 state（state 放 store 里）
 */
export const authService = {
  /** 游客一键登录 */
  guestLogin(): Promise<AuthTokens> {
    return api.post('/auth/guest-login');
  },

  /** 用户注册 */
  register(payload: RegisterPayload): Promise<AuthTokens> {
    return api.post('/auth/register', payload);
  },

  /** 用户登录 */
  login(payload: LoginPayload): Promise<AuthTokens> {
    return api.post('/auth/login', payload);
  },

  /** 刷新 Access Token */
  refresh(refreshToken: string): Promise<AuthTokens> {
    return api.post('/auth/refresh', { refreshToken });
  },

  /** 安全登出（必须带 refreshToken 由后端拉黑） */
  logout(refreshToken: string): Promise<void> {
    return api.post('/auth/logout', { refreshToken });
  },

  /** 获取当前用户信息与配额 */
  getProfile(): Promise<User> {
    return api.get('/auth/profile');
  },

  /** 更新昵称 / 头像 / 偏好 */
  updateProfile(payload: { nickname?: string; avatar?: string; preferences?: Record<string, unknown> }): Promise<User> {
    return api.put('/auth/profile', payload);
  },

  /** 修改密码 */
  changePassword(payload: { currentPassword: string; newPassword: string; confirmNewPassword: string }): Promise<{ changed: boolean }> {
    return api.put('/auth/password', payload);
  },

  /** 上传头像 */
  uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
