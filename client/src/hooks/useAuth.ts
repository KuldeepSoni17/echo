import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { token, user, isAuthenticated, onboardingPhone, setAuth, setOnboardingPhone, logout } =
    useAuthStore();
  const navigate = useNavigate();

  const sendOTP = useCallback(
    async (phoneNumber: string) => {
      await authApi.sendOTP(phoneNumber);
      setOnboardingPhone(phoneNumber);
      navigate('/auth/verify');
    },
    [setOnboardingPhone, navigate],
  );

  const verifyOTP = useCallback(
    async (code: string) => {
      if (!onboardingPhone) throw new Error('No phone number set');
      const res = await authApi.verifyOTP(onboardingPhone, code);
      const { token, user, isNewUser } = res.data;
      setAuth(token, user);
      if (isNewUser) {
        navigate('/auth/setup');
      } else {
        navigate('/feed');
      }
    },
    [onboardingPhone, setAuth, navigate],
  );

  const completeProfile = useCallback(
    async (username: string, displayName: string) => {
      const res = await authApi.completeProfile(username, displayName);
      const { token, user } = res.data;
      setAuth(token, user);
      navigate('/feed');
    },
    [setAuth, navigate],
  );

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors
    } finally {
      logout();
      navigate('/auth/phone');
    }
  }, [logout, navigate]);

  return {
    token,
    user,
    isAuthenticated,
    onboardingPhone,
    sendOTP,
    verifyOTP,
    completeProfile,
    logout: handleLogout,
  };
}
