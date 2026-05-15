import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../ui/Avatar';
import { MoodBadge } from '../ui/MoodBadge';
import { WaveformPlayer } from '../ui/WaveformPlayer';
import { ReportModal } from '../moderation/ReportModal';
import { VoiceRecorder } from './VoiceRecorder';
import { postsApi } from '../../api/posts';
import { formatRelativeTime } from '../../utils/formatDuration';
import type { Post, ReactionType } from '../../types';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'FIRE',  emoji: '🔥', label: 'Fire'  },
  { type: 'HEART', emoji: '❤️', label: 'Heart' },
  { type: 'LAUGH', emoji: '😂', label: 'Haha'  },
  { type: 'WOW',   emoji: '😮', label: 'Wow'   },
  { type: 'SAD',   emoji: '😢', label: 'Sad'   },
];

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function FeedCard({ post, isActive }: { post: Post; isActive: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu]               = useState(false);
  const [showReport, setShowReport]           = useState(false);
  const [showEcho, setShowEcho]               = useState(false);
  const [showReply, setShowReply]             = useState(false);
  const [localReaction, setLocalReaction]     = useState<ReactionType | null>(post.userHasReacted ?? null);

  const reactionMutation = useMutation({
    mutationFn: (type: ReactionType | null) =>
      type === null ? postsApi.removeReaction(post.id) : postsApi.reactToPost(post.id, type),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });

  const handleReaction = (type: ReactionType) => {
    const next = localReaction === type ? null : type;
    setLocalReaction(next);
    reactionMutation.mutate(next);
  };

  const isAnon   = post.isAnonymous && !post.isGhostRevealed;
  const accentColor = post.author?.avatarColor ?? '#7C5CFF';
  const totalReactions = post.reactionCounts
    ? Object.values(post.reactionCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <article className="relative bg-echo-card rounded-2xl overflow-hidden animate-slide-up
      border border-white/[0.04] hover:border-white/[0.08] transition-colors duration-200">

      {/* Colored left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: isAnon ? '#8888AA' : accentColor }} />

      <div className="pl-5 pr-4 pt-4 pb-3">

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => !isAnon && post.author && navigate(`/profile/${post.author.username}`)}
            className="flex-shrink-0"
          >
            <Avatar user={isAnon ? null : post.author} size={40} animated={isActive} anonymous={isAnon} />
          </button>

          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-1.5 flex-wrap pr-6">
              {isAnon ? (
                <span className="text-echo-secondary text-sm font-medium">👻 Anonymous</span>
              ) : (
                <>
                  <button
                    onClick={() => post.author && navigate(`/profile/${post.author.username}`)}
                    className="text-echo-primary text-[13px] font-semibold hover:underline leading-tight"
                  >
                    {post.author?.displayName ?? 'Unknown'}
                  </button>
                  {post.author?.isVerified && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#7C5CFF">
                      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                    </svg>
                  )}
                  <span className="text-echo-muted text-[12px]">@{post.author?.username}</span>
                </>
              )}
            </div>

            {/* Sub-row: streak + time */}
            <div className="flex items-center gap-2 mt-0.5">
              {(post.author?.streakCount ?? 0) >= 7 && (
                <span className="text-[11px] font-medium text-orange-400">
                  🔥 {post.author?.streakCount}d
                </span>
              )}
              <span className="text-echo-muted text-[11px]">{formatRelativeTime(post.createdAt)}</span>
              <span className="text-echo-muted text-[11px]">·</span>
              <span className="text-echo-muted text-[11px]">{fmt(post.playCount)} plays</span>
            </div>
          </div>

          {/* Mood + menu — top right */}
          <div className="absolute top-3.5 right-3 flex items-center gap-1.5">
            <MoodBadge mood={post.moodTag} size="sm" />
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 flex items-center justify-center rounded-full
                text-echo-muted hover:text-echo-secondary hover:bg-echo-elevated transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Transcription ─────────────────────────────── */}
        {post.transcription && (
          <p className="mt-2.5 text-echo-secondary text-[13px] leading-relaxed italic line-clamp-2
            pl-[52px]">
            "{post.transcription}"
          </p>
        )}

        {/* ── Waveform player ───────────────────────────── */}
        <div className="mt-3 px-1 py-3 bg-echo-elevated/50 rounded-xl">
          <WaveformPlayer
            audioUrl={post.presignedAudioUrl ?? ''}
            peaks={post.waveformPeaks}
            color={isAnon ? '#8888AA' : accentColor}
            duration={post.audioDuration}
            autoPlay={false}
          />
        </div>

        {/* ── Reactions + actions ───────────────────────── */}
        <div className="mt-3 flex items-center justify-between gap-1">
          {/* Reaction pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {REACTIONS.map(({ type, emoji }) => {
              const raw = post.reactionCounts?.[type] ?? 0;
              const count = raw + (localReaction === type ? 1 : 0);
              const active = localReaction === type;
              return (
                <button
                  key={type}
                  onClick={() => handleReaction(type)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px]
                    font-medium border transition-all duration-150 active:scale-90
                    ${active
                      ? 'bg-echo-accent/15 border-echo-accent/40 text-echo-primary'
                      : 'bg-transparent border-white/[0.06] text-echo-muted hover:border-white/20 hover:text-echo-secondary'
                    }`}
                >
                  <span className="leading-none">{emoji}</span>
                  {count > 0 && <span className="tabular-nums">{fmt(count)}</span>}
                </button>
              );
            })}
          </div>

          {/* Echo + reply */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setShowEcho(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-echo-muted
                hover:bg-echo-elevated hover:text-echo-secondary transition-all text-[12px]"
              title="Echo"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {post.echoCount > 0 && <span>{fmt(post.echoCount)}</span>}
            </button>

            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-echo-muted
                hover:bg-echo-elevated hover:text-echo-secondary transition-all text-[12px]"
              title="Reply"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {post.replyCount > 0 && <span>{fmt(post.replyCount)}</span>}
            </button>
          </div>
        </div>

        {/* Total reactions micro-summary */}
        {totalReactions > 0 && (
          <p className="mt-2 text-echo-muted text-[11px] pl-1">
            {fmt(totalReactions)} reaction{totalReactions !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Dropdown menu ─────────────────────────────── */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 top-10 bg-echo-elevated border border-white/[0.08]
            rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[160px] animate-slide-up">
            {post.author && !isAnon && (
              <button
                className="w-full text-left px-4 py-3 text-sm text-echo-primary hover:bg-echo-card transition-colors"
                onClick={() => { setShowMenu(false); navigate(`/profile/${post.author!.username}`); }}
              >
                View profile
              </button>
            )}
            <button className="w-full text-left px-4 py-3 text-sm text-echo-primary hover:bg-echo-card transition-colors"
              onClick={() => setShowMenu(false)}>
              Share
            </button>
            <div className="h-px bg-white/[0.06] mx-3" />
            <button className="w-full text-left px-4 py-3 text-sm text-echo-danger hover:bg-echo-card transition-colors"
              onClick={() => { setShowMenu(false); setShowReport(true); }}>
              Report
            </button>
          </div>
        </>
      )}

      {/* ── Modals ────────────────────────────────────── */}
      {showReport && <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />}
      {showEcho && (
        <VoiceRecorder mode="echo" postId={post.id} originalWaveformPeaks={post.waveformPeaks}
          onClose={() => setShowEcho(false)} />
      )}
      {showReply && (
        <VoiceRecorder mode="comment" postId={post.id} onClose={() => setShowReply(false)} />
      )}
    </article>
  );
}
