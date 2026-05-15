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

interface FeedCardProps {
  post: Post;
  isActive: boolean;
}

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: 'FIRE', emoji: '🔥' },
  { type: 'HEART', emoji: '❤️' },
  { type: 'LAUGH', emoji: '😂' },
  { type: 'WOW', emoji: '😮' },
  { type: 'SAD', emoji: '😢' },
];

export function FeedCard({ post, isActive }: FeedCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEchoRecorder, setShowEchoRecorder] = useState(false);
  const [showReplyRecorder, setShowReplyRecorder] = useState(false);
  const [localReaction, setLocalReaction] = useState<ReactionType | null>(
    post.userHasReacted ?? null,
  );

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

  const isAnon = post.isAnonymous && !post.isGhostRevealed;

  return (
    <div className="bg-echo-card border border-echo-muted/10 rounded-2xl p-4 relative">

      {/* Header: avatar + name + meta */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => !isAnon && post.author && navigate(`/profile/${post.author.username}`)}
          className="flex-shrink-0 mt-0.5"
        >
          <Avatar user={isAnon ? null : post.author} size={38} animated={isActive} anonymous={isAnon} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {/* Name + username */}
            <div className="min-w-0">
              {isAnon ? (
                <span className="text-echo-secondary text-sm font-medium">👻 Anonymous</span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => post.author && navigate(`/profile/${post.author.username}`)}
                    className="text-echo-primary text-sm font-semibold hover:underline truncate"
                  >
                    {post.author?.displayName ?? 'Unknown'}
                  </button>
                  {post.author?.isVerified && <span className="text-echo-accent text-xs">✓</span>}
                  <span className="text-echo-muted text-xs truncate">@{post.author?.username}</span>
                  {(post.author?.streakCount ?? 0) >= 7 && (
                    <span className="text-xs text-orange-400">🔥{post.author?.streakCount}</span>
                  )}
                </div>
              )}
            </div>

            {/* Right: mood + time + menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <MoodBadge mood={post.moodTag} size="sm" />
              <span className="text-echo-muted text-xs">{formatRelativeTime(post.createdAt)}</span>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-echo-muted hover:text-echo-secondary p-0.5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Transcription preview */}
          {post.transcription && (
            <p className="text-echo-secondary text-xs mt-1 leading-relaxed line-clamp-2">
              {post.transcription}
            </p>
          )}
        </div>
      </div>

      {/* Waveform player */}
      <div className="mt-3">
        <WaveformPlayer
          audioUrl={post.presignedAudioUrl ?? ''}
          peaks={post.waveformPeaks}
          color={post.author?.avatarColor ?? '#7C5CFF'}
          duration={post.audioDuration}
          autoPlay={false}
        />
      </div>

      {/* Reactions + actions */}
      <div className="mt-3 flex items-center justify-between">
        {/* Reactions */}
        <div className="flex items-center gap-1">
          {REACTIONS.map(({ type, emoji }) => {
            const count = (post.reactionCounts?.[type] ?? 0) + (localReaction === type ? 1 : 0);
            const active = localReaction === type;
            return (
              <button
                key={type}
                onClick={() => handleReaction(type)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all
                  ${active
                    ? 'bg-echo-accent/15 text-echo-primary scale-105'
                    : 'text-echo-muted hover:bg-echo-elevated hover:text-echo-secondary'
                  }`}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Echo + Reply */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEchoRecorder(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-echo-muted
              hover:bg-echo-elevated hover:text-echo-secondary transition-all"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {post.echoCount > 0 && <span>{post.echoCount}</span>}
          </button>

          <button
            onClick={() => setShowReplyRecorder(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-echo-muted
              hover:bg-echo-elevated hover:text-echo-secondary transition-all"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {post.replyCount > 0 && <span>{post.replyCount}</span>}
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-4 top-10 bg-echo-elevated border border-echo-muted/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[140px]">
            {post.author && (
              <button className="w-full text-left px-4 py-2.5 text-sm text-echo-primary hover:bg-echo-card"
                onClick={() => { setShowMenu(false); navigate(`/profile/${post.author!.username}`); }}>
                View profile
              </button>
            )}
            <button className="w-full text-left px-4 py-2.5 text-sm text-echo-primary hover:bg-echo-card"
              onClick={() => setShowMenu(false)}>
              Share
            </button>
            <button className="w-full text-left px-4 py-2.5 text-sm text-echo-danger hover:bg-echo-card"
              onClick={() => { setShowMenu(false); setShowReport(true); }}>
              Report
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      {showReport && (
        <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />
      )}
      {showEchoRecorder && (
        <VoiceRecorder mode="echo" postId={post.id} originalWaveformPeaks={post.waveformPeaks}
          onClose={() => setShowEchoRecorder(false)} />
      )}
      {showReplyRecorder && (
        <VoiceRecorder mode="comment" postId={post.id} onClose={() => setShowReplyRecorder(false)} />
      )}
    </div>
  );
}
