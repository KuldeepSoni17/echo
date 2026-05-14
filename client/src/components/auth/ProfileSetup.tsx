import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function ProfileSetup() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [availability, setAvailability] = useState<AvailabilityStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { completeProfile } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!username) {
      setAvailability('idle');
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setAvailability('invalid');
      return;
    }
    setAvailability('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authApi.checkUsername(username);
        setAvailability(res.data.available ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 300);
  }, [username]);

  const canSubmit =
    availability === 'available' &&
    displayName.trim().length >= 1 &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await completeProfile(username.trim(), displayName.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Setup failed. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = () => {
    switch (availability) {
      case 'checking':
        return <span className="text-echo-muted text-xs">Checking...</span>;
      case 'available':
        return <span className="text-echo-success text-xs">✓ Available</span>;
      case 'taken':
        return <span className="text-echo-danger text-xs">✗ Taken</span>;
      case 'invalid':
        return <span className="text-echo-danger text-xs">3–20 chars, letters/numbers/_</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-echo-bg flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-echo-primary">Set Up Profile</h1>
          <p className="text-echo-secondary text-sm mt-2">Choose your username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-echo-secondary text-sm mb-2">Username</label>
            <input
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={20}
              className="w-full bg-echo-elevated border border-echo-muted/30 text-echo-primary
                placeholder:text-echo-muted rounded-xl px-4 py-3.5 text-sm focus:outline-none
                focus:border-echo-accent"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
            />
            <div className="mt-1.5 h-4">{statusIcon()}</div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-echo-secondary text-sm mb-2">Display name</label>
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="w-full bg-echo-elevated border border-echo-muted/30 text-echo-primary
                placeholder:text-echo-muted rounded-xl px-4 py-3.5 text-sm focus:outline-none
                focus:border-echo-accent"
            />
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
            disabled={!canSubmit}
          >
            Complete Setup
          </Button>
        </form>
      </div>
    </div>
  );
}
