import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { authService } from '@/services/authService';
import type { LoginPayload, RegisterPayload, User } from '@/types';

/**
 * Auth Store
 *
 * Token 存储约定：
 * - accessToken: sessionStorage 'vidcraft_access_token'（axios 拦截器读取，关闭标签页即清除）
 * - refreshToken: sessionStorage 'vidcraft_refresh_token'
 * - 不使用 localStorage 存储敏感 token，降低 XSS 风险
 * - 不持久化 user state，应用启动时通过 loadProfile() 从服务端重新获取
 */

const ACCESS_TOKEN_KEY = 'vidcraft_access_token';
const REFRESH_TOKEN_KEY = 'vidcraft_refresh_token';

interface AuthState {
  // -------- state --------
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;

  // -------- actions --------
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  guestLogin: () => Promise<void>;
  loadProfile: () => Promise<void>;
  refreshAccess: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
};

/**
 * 把鉴权响应（accessToken + refreshToken + user）持久化到 localStorage + store
 */
function persistTokens(accessToken: string, refreshToken: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      ...initialState,

        login: async (payload) => {
          set({ loading: true }, false, 'auth/login/start');
          try {
            const { accessToken, refreshToken, user } = await authService.login(payload);
            persistTokens(accessToken, refreshToken);
            set(
              { accessToken, refreshToken, user, isAuthenticated: true, loading: false },
              false,
              'auth/login/success',
            );
          } catch (err) {
            set({ loading: false }, false, 'auth/login/error');
            throw err;
          }
        },

        register: async (payload) => {
          set({ loading: true }, false, 'auth/register/start');
          try {
            const { accessToken, refreshToken, user } = await authService.register(payload);
            persistTokens(accessToken, refreshToken);
            set(
              { accessToken, refreshToken, user, isAuthenticated: true, loading: false },
              false,
              'auth/register/success',
            );
          } catch (err) {
            set({ loading: false }, false, 'auth/register/error');
            throw err;
          }
        },

        guestLogin: async () => {
          set({ loading: true }, false, 'auth/guest/start');
          try {
            const { accessToken, refreshToken, user } = await authService.guestLogin();
            persistTokens(accessToken, refreshToken);
            set(
              { accessToken, refreshToken, user, isAuthenticated: true, loading: false },
              false,
              'auth/guest/success',
            );
          } catch (err) {
            set({ loading: false }, false, 'auth/guest/error');
            throw err;
          }
        },

        loadProfile: async () => {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true }, false, 'auth/loadProfile');
        },

        refreshAccess: async () => {
          const refreshToken = get().refreshToken || sessionStorage.getItem(REFRESH_TOKEN_KEY);
          if (!refreshToken) throw new Error('No refresh token available');
          const tokens = await authService.refresh(refreshToken);
          persistTokens(tokens.accessToken, tokens.refreshToken);
          set(
            {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              user: tokens.user,
            },
            false,
            'auth/refreshAccess',
          );
        },

        logout: async () => {
          const refreshToken = get().refreshToken || sessionStorage.getItem(REFRESH_TOKEN_KEY) || '';
          try {
            if (refreshToken) {
              await authService.logout(refreshToken);
            }
          } finally {
            clearTokens();
            set({ ...initialState }, false, 'auth/logout');
          }
        },

        updateUser: (partial) => {
          set((state) => ({
            user: state.user ? { ...state.user, ...partial } : null,
          }), false, 'auth/updateUser');
        },

        reset: () => {
          clearTokens();
          set({ ...initialState }, false, 'auth/reset');
        },
      }),
      { name: 'AuthStore' },
    ),
  );

// -------- selectors（推荐组件中用这些，按需订阅） --------
export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectIsGuest = (s: AuthState) => s.user?.is_guest ?? false;
export const selectQuota = (s: AuthState) => s.user?.video_quota ?? 0;
