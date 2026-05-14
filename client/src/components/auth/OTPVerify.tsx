import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

const OTP_LENGTH = 6;
const RESEND_DELAY = 300; // seconds (5 min)

export function OTPVerify() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(RESEND_DELAY);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyOTP } = useAuth();
  const onboardingPhone = useAuthStore((s) => s.onboardingPhone);
  const navigate = useNavigate();

  useEffect(() => {
    if (!onboardingPhone) navigate('/auth/phone');
  }, [onboardingPhone, navigate]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    [...pasted].forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const lastIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[lastIdx]?.focus();
  };

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isComplete) return;
    setError('');
    setLoading(true);
    try {
      await verifyOTP(code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code. Try again.';
      setError(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [isComplete, code, verifyOTP]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (isComplete) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, code]);

  const handleResend = async () => {
    if (!onboardingPhone || resendCountdown > 0) return;
    setResending(true);
    try {
      await authApi.sendOTP(onboardingPhone);
      setResendCountdown(RESEND_DELAY);
      setError('');
    } catch {
      setError('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  const mins = Math.floor(resendCountdown / 60);
  const secs = resendCountdown % 60;

  return (
    <div className="min-h-screen bg-echo-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate('/auth/phone')} className="mb-8 text-echo-secondary hover:text-echo-primary flex items-center gap-2">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-echo-primary">Enter Code</h1>
          <p className="text-echo-secondary text-sm mt-2">
            We sent a 6-digit code to<br />
            <span className="text-echo-primary font-medium">{onboardingPhone}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border
                  bg-echo-elevated text-echo-primary focus:outline-none transition-colors
                  ${d ? 'border-echo-accent' : 'border-echo-muted/30 focus:border-echo-accent'}`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <p className="text-echo-danger text-sm text-center mb-4">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!isComplete}
          >
            Verify
          </Button>
        </form>

        <div className="text-center mt-6">
          {resendCountdown > 0 ? (
            <p className="text-echo-muted text-sm">
              Resend in {mins}:{secs.toString().padStart(2, '0')}
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-echo-accent text-sm hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
