import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { authService } from '@/services/authService';
import type { LoginPayload, RegisterPayload, User } from '@/types';

/**
 * Auth Store —— Zustand store 的标准样板
 *
 * 设计约定（所有 store 都应遵循）：
 * 1. State 和 Actions 写在同一个 interface 里
 * 2. Action 命名用动词：login / logout / loadProfile / reset
 * 3. 异步 action 调 service 层，把结果写回 state
 * 4. 用 devtools 中间件方便 Redux DevTools 调试
 * 5. 需要持久化的 store（如 token）用 persist
 * 6. Hook 命名：use<Name>Store
 * 7. 业务组件用 selector 订阅：useAuthStore(s => s.user)，避免无关 re-render
 *
 * Token 存储约定：
 * - accessToken: localStorage 'vidcraft_access_token'（axios 拦截器读取）
 * - refreshToken: localStorage 'vidcraft_refresh_token'（refresh 流程使用）
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
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
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
          const refreshToken = get().refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
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
          try {
            await authService.logout();
          } finally {
            clearTokens();
            set({ ...initialState }, false, 'auth/logout');
          }
        },

        reset: () => {
          clearTokens();
          set({ ...initialState }, false, 'auth/reset');
        },
      }),
      {
        name: 'vidcraft-auth',
        // 只持久化必要字段
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      },
    ),
    { name: 'AuthStore' },
  ),
);

// -------- selectors（推荐组件中用这些，按需订阅） --------
export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectIsGuest = (s: AuthState) => s.user?.is_guest ?? false;
export const selectQuota = (s: AuthState) => s.user?.video_quota ?? 0;
