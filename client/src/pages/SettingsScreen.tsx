import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api/users';
import { Button } from '../components/ui/Button';

function ArrowLeft() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-echo-muted mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [ghostDefault, setGhostDefault] = useState(false);
  const [notifEcho, setNotifEcho] = useState(true);
  const [notifReply, setNotifReply] = useState(true);
  const [notifFollow, setNotifFollow] = useState(true);
  const [notifStreak, setNotifStreak] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateProfile = useMutation({
    mutationFn: () => usersApi.updateMe({ displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/auth/phone', { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-echo-bg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-echo-secondary hover:text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4">
        {/* Account */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-echo-muted uppercase tracking-wider mb-3">
            Account
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-echo-secondary block mb-1">Phone Number</label>
              <div className="px-3 py-2.5 rounded-lg bg-echo-elevated text-echo-muted text-sm">
                {user?.phoneNumber ?? '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-echo-secondary block mb-1">Username</label>
              <div className="px-3 py-2.5 rounded-lg bg-echo-elevated text-echo-muted text-sm">
                @{user?.username ?? '—'}
              </div>
            </div>
            <div>
              <label className="text-xs text-echo-secondary block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-echo-elevated text-white text-sm border border-white/10 focus:border-accent focus:outline-none"
                maxLength={50}
              />
            </div>
            <Button
              onClick={() => updateProfile.mutate()}
              loading={updateProfile.isPending}
              disabled={displayName === user?.displayName}
              size="sm"
            >
              {saveSuccess ? '✓ Saved' : 'Save Changes'}
            </Button>
          </div>
        </section>

        {/* Privacy */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold text-echo-muted uppercase tracking-wider mb-1">
            Privacy
          </h2>
          <ToggleRow
            label="Ghost Mode by Default"
            description="New posts will be anonymous unless you change it"
            checked={ghostDefault}
            onChange={setGhostDefault}
          />
        </section>

        {/* Notifications */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold text-echo-muted uppercase tracking-wider mb-1">
            Notifications
          </h2>
          <ToggleRow label="Echo notifications" checked={notifEcho} onChange={setNotifEcho} />
          <ToggleRow label="Reply notifications" checked={notifReply} onChange={setNotifReply} />
          <ToggleRow label="New follower notifications" checked={notifFollow} onChange={setNotifFollow} />
          <ToggleRow
            label="Streak reminders"
            description="Daily reminder at 9pm if you haven't posted"
            checked={notifStreak}
            onChange={setNotifStreak}
          />
        </section>

        {/* Streak */}
        <section className="mt-8">
          <h2 className="text-xs font-semibold text-echo-muted uppercase tracking-wider mb-3">
            Streak
          </h2>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-echo-card border border-white/5">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-2xl font-bold text-white">{user?.streakCount ?? 0}</p>
              <p className="text-xs text-echo-secondary">day streak</p>
            </div>
            <div className="ml-auto flex gap-2">
              {[7, 30, 100, 365].map((milestone) => (
                <div
                  key={milestone}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    (user?.streakCount ?? 0) >= milestone
                      ? 'bg-accent text-white'
                      : 'bg-echo-elevated text-echo-muted'
                  }`}
                  title={`${milestone}-day streak`}
                >
                  {milestone >= 100 ? `${milestone / 100}c` : `${milestone}d`}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="mt-8 mb-6">
          <h2 className="text-xs font-semibold text-echo-muted uppercase tracking-wider mb-3">
            Account Actions
          </h2>
          <div className="space-y-3">
            <Button variant="ghost" onClick={handleLogout} className="w-full">
              Log Out
            </Button>
            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full"
              >
                Delete Account
              </Button>
            ) : (
              <div className="p-4 rounded-xl bg-echo-danger/10 border border-echo-danger/30">
                <p className="text-sm text-white mb-3">
                  Are you sure? This cannot be undone. All your posts will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1">
                    Delete Forever
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
