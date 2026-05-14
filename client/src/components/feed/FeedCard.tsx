import { useState, useRef } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  const reactionMutation = useMutation({
    mutationFn: (type: ReactionType | null) => {
      if (type === null) return postsApi.removeReaction(post.id);
      return postsApi.reactToPost(post.id, type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleReaction = (type: ReactionType) => {
    const next = localReaction === type ? null : type;
    setLocalReaction(next);
    reactionMutation.mutate(next);
  };

  const totalReactions = post.reactionCounts
    ? Object.values(post.reactionCounts).reduce((a, b) => a + b, 0)
    : 0;

  const isAnon = post.isAnonymous && !post.isGhostRevealed;

  return (
    <div className="relative w-full h-full bg-echo-bg flex flex-col overflow-hidden select-none">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-card-gradient pointer-events-none z-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4 z-10 pt-safe">
        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-echo-secondary hover:text-echo-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute left-0 top-10 bg-echo-elevated rounded-2xl shadow-xl z-50 overflow-hidden min-w-[160px]">
              <button className="w-full text-left px-4 py-3 text-sm text-echo-primary hover:bg-echo-card"
                onClick={() => { setShowMenu(false); }}>
                Share
              </button>
              {post.author && (
                <button className="w-full text-left px-4 py-3 text-sm text-echo-primary hover:bg-echo-card"
                  onClick={() => { setShowMenu(false); navigate(`/profile/${post.author!.username}`); }}>
                  View Profile
                </button>
              )}
              <button className="w-full text-left px-4 py-3 text-sm text-echo-danger hover:bg-echo-card"
                onClick={() => { setShowMenu(false); setShowReport(true); }}>
                Report
              </button>
            </div>
          )}
        </div>

        {/* Mood badge + time */}
        <div className="flex flex-col items-end gap-1">
          <MoodBadge mood={post.moodTag} size="sm" />
          <span className="text-echo-muted text-xs">{formatRelativeTime(post.createdAt)}</span>
        </div>
      </div>

      {/* Center: Waveform */}
      <div className="absolute inset-0 flex items-center justify-center px-4 z-5">
        <div className="w-full px-4">
          {post.presignedAudioUrl && (
            <WaveformPlayer
              audioUrl={post.presignedAudioUrl}
              peaks={post.waveformPeaks}
              color={post.author?.avatarColor ?? '#7C5CFF'}
              duration={post.audioDuration}
              autoPlay={isActive}
            />
          )}
        </div>
      </div>

      {/* Bottom-left: author info */}
      <div className="absolute bottom-24 left-4 z-10 flex items-center gap-3 max-w-[65%]">
        <button
          onClick={() => !isAnon && post.author && navigate(`/profile/${post.author.username}`)}
          className="flex-shrink-0"
        >
          <Avatar user={isAnon ? null : post.author} size={44} animated={isActive} anonymous={isAnon} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isAnon ? (
              <span className="text-echo-primary font-semibold text-sm">Anonymous</span>
            ) : (
              <span className="text-echo-primary font-semibold text-sm truncate">
                {post.author?.displayName ?? post.author?.username ?? 'Unknown'}
              </span>
            )}
            {post.author?.isVerified && !isAnon && (
              <span className="text-echo-accent text-xs">✓</span>
            )}
          </div>
          {post.author && !isAnon && (
            <div className="flex items-center gap-2">
              <span className="text-echo-secondary text-xs">@{post.author.username}</span>
              {post.author.streakCount > 0 && (
                <span className="text-xs">🔥 {post.author.streakCount}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-echo-muted text-xs">▶ {post.playCount}</span>
            {post.echoCount > 0 && (
              <span className="text-echo-muted text-xs">↩ {post.echoCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar: actions */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-4">
        {/* Reactions */}
        {REACTIONS.map(({ type, emoji }) => (
          <button
            key={type}
            onClick={() => handleReaction(type)}
            className={`flex flex-col items-center gap-0.5 transition-transform active:scale-90
              ${localReaction === type ? 'scale-110' : ''}`}
          >
            <span className="text-2xl leading-none">{emoji}</span>
            <span className="text-echo-secondary text-[10px]">
              {(post.reactionCounts?.[type] ?? 0) + (localReaction === type ? 1 : 0)}
            </span>
          </button>
        ))}

        {/* Echo button */}
        <button
          onClick={() => setShowEchoRecorder(true)}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-echo-elevated flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="#8888AA" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-echo-secondary text-[10px]">{post.echoCount}</span>
        </button>

        {/* Reply button */}
        <button
          onClick={() => setShowReplyRecorder(true)}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-echo-elevated flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="#8888AA" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-echo-secondary text-[10px]">{post.replyCount}</span>
        </button>

        {/* Total reactions */}
        {totalReactions > 0 && (
          <span className="text-echo-muted text-[10px]">{totalReactions} ❤</span>
        )}
      </div>

      {/* Click overlay to dismiss menus */}
      {showMenu && (
        <div className="absolute inset-0 z-40" onClick={() => setShowMenu(false)} />
      )}

      {/* Modals */}
      {showReport && (
        <ReportModal
          targetType="POST"
          targetId={post.id}
          onClose={() => setShowReport(false)}
        />
      )}
      {showEchoRecorder && (
        <VoiceRecorder
          mode="echo"
          postId={post.id}
          originalWaveformPeaks={post.waveformPeaks}
          onClose={() => setShowEchoRecorder(false)}
        />
      )}
      {showReplyRecorder && (
        <VoiceRecorder
          mode="comment"
          postId={post.id}
          onClose={() => setShowReplyRecorder(false)}
        />
      )}
    </div>
  );
}
