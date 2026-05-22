import { create } from 'zustand';

// TODO: auth state (user, token, login/logout actions)

interface AuthState {
  user: null;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  isAuthenticated: false,
}));
