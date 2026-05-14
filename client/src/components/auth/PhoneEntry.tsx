import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { DEMO_USER } from '../../mocks/data';
import { DEMO_TOKEN } from '../../mocks/mockApi';

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+91', flag: '🇮🇳', name: 'IN' },
  { code: '+61', flag: '🇦🇺', name: 'AU' },
  { code: '+49', flag: '🇩🇪', name: 'DE' },
  { code: '+33', flag: '🇫🇷', name: 'FR' },
  { code: '+81', flag: '🇯🇵', name: 'JP' },
  { code: '+86', flag: '🇨🇳', name: 'CN' },
  { code: '+55', flag: '🇧🇷', name: 'BR' },
  { code: '+52', flag: '🇲🇽', name: 'MX' },
  { code: '+34', flag: '🇪🇸', name: 'ES' },
  { code: '+39', flag: '🇮🇹', name: 'IT' },
  { code: '+7', flag: '🇷🇺', name: 'RU' },
  { code: '+82', flag: '🇰🇷', name: 'KR' },
  { code: '+62', flag: '🇮🇩', name: 'ID' },
];

export function PhoneEntry() {
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOTP } = useAuth();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    setAuth(DEMO_TOKEN, DEMO_USER);
    navigate('/feed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError('');
    setLoading(true);
    try {
      await sendOTP(`${countryCode}${phone.replace(/\D/g, '')}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-echo-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-accent-gradient mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/40">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
              <path d="M17 11a1 1 0 00-2 0 3 3 0 01-6 0 1 1 0 00-2 0 5 5 0 0010 0z" />
              <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-echo-primary">Echo</h1>
          <p className="text-echo-secondary text-sm mt-2">Your voice. Your identity.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-echo-secondary text-sm mb-2">Phone number</label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-echo-elevated border border-echo-muted/30 text-echo-primary rounded-xl px-3 py-3.5
                  text-sm focus:outline-none focus:border-echo-accent w-28 flex-shrink-0"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code + c.name} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s\-()]/g, ''))}
                className="flex-1 bg-echo-elevated border border-echo-muted/30 text-echo-primary placeholder:text-echo-muted
                  rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-echo-accent"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-echo-danger text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={phone.replace(/\D/g, '').length < 7}
          >
            Send Code
          </Button>
        </form>

        {/* Demo bypass */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-echo-muted/20" />
          <span className="text-echo-muted text-xs">or</span>
          <div className="flex-1 h-px bg-echo-muted/20" />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          className="mt-4 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
            border border-dashed border-echo-accent/40 text-echo-accent text-sm font-medium
            hover:bg-echo-accent/10 hover:border-echo-accent/70 transition-all duration-200
            active:scale-[0.98]"
        >
          <span className="text-lg">🎧</span>
          Try Demo — no sign-up needed
        </button>

        <p className="text-echo-muted text-xs text-center mt-5">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
