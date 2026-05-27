import { http, HttpResponse } from 'msw';
import type { AuthTokens, User } from '@/types';

/**
 * Auth 模块 Mock
 * 端点严格按《VidCraft API 接口规范文档 v1.0》第 1-2 章
 *
 * 注意所有响应都遵循统一格式 { code, msg, total, data, traceId }
 */

const mockGuestUser: User = {
  id: '00000000-0000-0000-0000-000000000001',
  nickname: '体验用户',
  is_guest: true,
  video_quota: 2,
};

const mockAuthTokens: AuthTokens = {
  accessToken: 'mock-access-token-guest',
  refreshToken: 'mock-refresh-token-guest',
  user: mockGuestUser,
};

export const authHandlers = [
  // POST /api/auth/guest-login
  http.post('/api/auth/guest-login', () => {
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: mockAuthTokens,
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/auth/login
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: {
        accessToken: 'mock-access-token-user',
        refreshToken: 'mock-refresh-token-user',
        user: {
          id: 'usr-mock-001',
          email: body.email,
          nickname: body.email.split('@')[0],
          is_guest: false,
          plan_type: 'free',
          video_quota: 3,
        } satisfies User,
      } satisfies AuthTokens,
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/auth/logout
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: null,
      traceId: `mock-${Date.now()}`,
    });
  }),

  // GET /api/auth/profile
  http.get('/api/auth/profile', () => {
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: mockGuestUser,
      traceId: `mock-${Date.now()}`,
    });
  }),

  // POST /api/auth/refresh
  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      code: 200,
      msg: null,
      total: 0,
      data: mockAuthTokens,
      traceId: `mock-${Date.now()}`,
    });
  }),
];
