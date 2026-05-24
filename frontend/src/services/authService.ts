import api from './api';
import type { LoginPayload, LoginResponse, User } from '@/types';

/**
 * Auth 模块 API
 *
 * 设计约定（所有 service 都应遵循）：
 * 1. 一个文件 = 一个业务模块
 * 2. 导出一个 *Service 对象，方法名用动词（login / fetchProfile / logout）
 * 3. 接受简单参数，返回 Promise<DTO>，axios 拦截器已自动解包 response.data
 * 4. 不在 service 里调 message/toast（拦截器已统一处理错误）
 * 5. 不持有 state（state 放 store 里）
 */
export const authService = {
  /** 登录 */
  login(payload: LoginPayload): Promise<LoginResponse> {
    return api.post('/auth/login', payload);
  },

  /** 游客一键体验 */
  guestLogin(): Promise<LoginResponse> {
    return api.post('/auth/guest');
  },

  /** 拉取当前用户 */
  fetchProfile(): Promise<User> {
    return api.get('/auth/me');
  },

  /** 登出 */
  logout(): Promise<void> {
    return api.post('/auth/logout');
  },
};
