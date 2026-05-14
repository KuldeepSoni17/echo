import api from './client';
import type { User } from '../types';

export interface OTPVerifyResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

export const authApi = {
  sendOTP: (phoneNumber: string) =>
    api.post<void>('/auth/send-otp', { phoneNumber }),

  verifyOTP: (phoneNumber: string, code: string) =>
    api.post<OTPVerifyResponse>('/auth/verify-otp', { phoneNumber, code }),

  completeProfile: (username: string, displayName: string) =>
    api.post<{ token: string; user: User }>('/auth/complete-profile', {
      username,
      displayName,
    }),

  checkUsername: (username: string) =>
    api.get<{ available: boolean }>(`/auth/check-username/${username}`),

  logout: () => api.post<void>('/auth/logout'),
};
