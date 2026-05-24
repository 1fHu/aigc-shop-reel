import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { authService } from '@/services/authService';
import type { LoginPayload, User } from '@/types';

/**
 * Auth Store —— Zustand store 的标准样板
 *
 * 设计约定（所有 store 都应遵循）：
 * 1. State 和 Actions 写在同一个 interface 里
 * 2. Action 命名用动词：login / logout / loadProfile / reset
 * 3. 异步 action 调 service 层，把结果写回 state
 * 4. 用 devtools 中间件方便 Redux DevTools 调试
 * 5. 需要持久化的 store（如 auth token）用 persist
 * 6. Hook 命名：use<Name>Store
 * 7. 业务组件用 selector 订阅：useAuthStore(s => s.user)，避免无关 re-render
 */

interface AuthState {
  // -------- state --------
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;

  // -------- actions --------
  login: (payload: LoginPayload) => Promise<void>;
  guestLogin: () => Promise<void>;
  loadProfile: () => Promise<void>;
  logout: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        login: async (payload) => {
          set({ loading: true }, false, 'auth/login/start');
          try {
            const { token, user } = await authService.login(payload);
            localStorage.setItem('vidcraft_token', token);
            set(
              { token, user, isAuthenticated: true, loading: false },
              false,
              'auth/login/success',
            );
          } catch (err) {
            set({ loading: false }, false, 'auth/login/error');
            throw err;
          }
        },

        guestLogin: async () => {
          set({ loading: true }, false, 'auth/guest/start');
          try {
            const { token, user } = await authService.guestLogin();
            localStorage.setItem('vidcraft_token', token);
            set(
              { token, user, isAuthenticated: true, loading: false },
              false,
              'auth/guest/success',
            );
          } catch (err) {
            set({ loading: false }, false, 'auth/guest/error');
            throw err;
          }
        },

        loadProfile: async () => {
          const user = await authService.fetchProfile();
          set({ user, isAuthenticated: true }, false, 'auth/loadProfile');
        },

        logout: async () => {
          try {
            await authService.logout();
          } finally {
            localStorage.removeItem('vidcraft_token');
            set({ ...initialState }, false, 'auth/logout');
          }
        },

        reset: () => set({ ...initialState }, false, 'auth/reset'),
      }),
      {
        name: 'vidcraft-auth',
        // 只持久化必要字段，避免 loading / 临时状态被冻结
        partialize: (state) => ({
          token: state.token,
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
export const selectIsGuest = (s: AuthState) => s.user?.isGuest ?? false;
