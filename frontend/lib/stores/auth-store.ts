'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'OFFICER' | 'REGISTRAR' | 'ADMIN';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
        // Set cookie so Next.js middleware can read it for route protection
        document.cookie = `accessToken=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        set({ user, accessToken });
      },
      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        document.cookie = 'accessToken=; path=/; max-age=0';
        set({ user: null, accessToken: null });
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user }) },
  ),
);
