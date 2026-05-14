import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { Button } from '../components/ui/Button';
import { WaveformPlayer } from '../components/ui/WaveformPlayer';
import { Avatar } from '../components/ui/Avatar';
import type { Post, User } from '../types';

interface Report {
  id: string;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: string;
  reason: string;
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED';
  reporter: User;
  createdAt: string;
  post?: Post;
}

type AdminAction = 'DISMISS' | 'DELETE_CONTENT' | 'WARN_USER' | 'BAN_USER';

function ReportCard({ report, onAction }: { report: Report; onAction: (id: string, action: AdminAction) => void }) {
  return (
    <div className="bg-echo-card rounded-xl p-4 border border-white/5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-echo-danger/20 text-echo-danger">
            {report.reason.replace('_', ' ')}
          </span>
          <span className="ml-2 text-xs text-echo-muted">{report.targetType}</span>
        </div>
        <span className="text-xs text-echo-muted">
          {new Date(report.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Avatar user={report.reporter} size={24} />
        <span className="text-xs text-echo-secondary">
          Reported by @{report.reporter.username}
        </span>
      </div>

      {report.description && (
        <p className="text-xs text-echo-secondary mb-3 italic">"{report.description}"</p>
      )}

      {report.post?.presignedAudioUrl && (
        <div className="mb-3">
          <WaveformPlayer
            audioUrl={report.post.presignedAudioUrl}
            peaks={report.post.waveformPeaks}
            duration={report.post.audioDuration}
          />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(['DISMISS', 'DELETE_CONTENT', 'WARN_USER', 'BAN_USER'] as AdminAction[]).map((action) => (
          <button
            key={action}
            onClick={() => onAction(report.id, action)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              action === 'BAN_USER'
                ? 'bg-echo-danger/20 text-echo-danger hover:bg-echo-danger/30'
                : action === 'DELETE_CONTENT'
                ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                : 'bg-echo-elevated text-echo-secondary hover:text-white'
            }`}
          >
            {action.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChallengeForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.post('/admin/challenges', { title, startsAt, endsAt }).then((r) => r.data),
    onSuccess: () => {
      setTitle('');
      onCreated();
    },
  });

  return (
    <div className="bg-echo-card rounded-xl p-4 border border-white/5">
      <h3 className="text-sm font-semibold text-white mb-3">Create Challenge</h3>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Challenge title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-echo-elevated text-white text-sm border border-white/10 focus:border-accent focus:outline-none"
          maxLength={100}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-echo-muted block mb-1">Starts</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-2 py-2 rounded-lg bg-echo-elevated text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-echo-muted block mb-1">Ends</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-2 py-2 rounded-lg bg-echo-elevated text-white text-xs border border-white/10 focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <Button
          onClick={() => create.mutate()}
          loading={create.isPending}
          disabled={!title || !startsAt || !endsAt}
          size="sm"
        >
          Create Challenge
        </Button>
      </div>
    </div>
  );
}

export default function AdminScreen() {
  const [tab, setTab] = useState<'reports' | 'users' | 'challenges'>('reports');
  const [userSearch, setUserSearch] = useState('');
  const qc = useQueryClient();

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () =>
      api.get('/admin/reports?status=PENDING').then((r) => r.data?.data?.items ?? []),
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: () =>
      api.get(`/admin/users?q=${encodeURIComponent(userSearch)}`).then((r) => r.data?.data ?? []),
    enabled: tab === 'users',
  });

  const actionReport = useMutation({
    mutationFn: ({ id, action }: { id: string; action: AdminAction }) =>
      api.post(`/admin/reports/${id}/action`, { action }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reports'] }),
  });

  const banUser = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/users/${userId}/ban`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const unbanUser = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/admin/users/${userId}/unban`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const tabs = [
    { key: 'reports' as const, label: 'Reports', count: (reports as Report[] | undefined)?.length },
    { key: 'users' as const, label: 'Users' },
    { key: 'challenges' as const, label: 'Challenges' },
  ];

  return (
    <div className="min-h-screen bg-echo-bg">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">🛡️ Admin Dashboard</h1>

        <div className="flex gap-1 mb-6 bg-echo-card rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-accent text-white' : 'text-echo-secondary hover:text-white'
              }`}
            >
              {t.label}
              {t.count ? (
                <span className="ml-1.5 text-xs bg-echo-danger text-white px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'reports' && (
          <div className="space-y-4">
            {reportsLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!reportsLoading && (reports as Report[] | undefined)?.length === 0 && (
              <div className="text-center py-12 text-echo-muted">
                <p className="text-4xl mb-2">✅</p>
                <p>No pending reports</p>
              </div>
            )}
            {(reports as Report[] | undefined)?.map((r: Report) => (
              <ReportCard
                key={r.id}
                report={r}
                onAction={(id, action) => actionReport.mutate({ id, action })}
              />
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-echo-card text-white border border-white/10 focus:border-accent focus:outline-none"
            />
            {(users as (User & { isBanned: boolean })[] | undefined)?.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-4 bg-echo-card rounded-xl border border-white/5"
              >
                <Avatar user={u} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{u.displayName}</p>
                  <p className="text-xs text-echo-muted">@{u.username}</p>
                </div>
                {u.isBanned ? (
                  <Button size="sm" onClick={() => unbanUser.mutate(u.id)}>
                    Unban
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => banUser.mutate(u.id)}>
                    Ban
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'challenges' && (
          <ChallengeForm onCreated={() => qc.invalidateQueries({ queryKey: ['challenges'] })} />
        )}
      </div>
    </div>
  );
}
