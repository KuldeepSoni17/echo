import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  onboardingPhone: string | null;
  setAuth: (token: string, user: User) => void;
  setOnboardingPhone: (phone: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      onboardingPhone: null,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      setOnboardingPhone: (phone) =>
        set({ onboardingPhone: phone }),

      updateUser: (partial) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, ...partial } });
        }
      },

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false, onboardingPhone: null }),
    }),
    {
      name: 'echo-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
