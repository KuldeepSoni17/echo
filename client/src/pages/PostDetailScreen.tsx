import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '../api/posts';
import { WaveformPlayer } from '../components/ui/WaveformPlayer';
import { Avatar } from '../components/ui/Avatar';
import { MoodBadge } from '../components/ui/MoodBadge';
import { VoiceRecorder } from '../components/feed/VoiceRecorder';
import { formatDuration } from '../utils/formatDuration';
import type { Comment } from '../types';

function ArrowLeft() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function CommentCard({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3 p-4 border-b border-white/5">
      <Avatar user={comment.author ?? null} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-white">
            {comment.isAnonymous ? '👻 Anonymous' : comment.author?.displayName ?? 'Unknown'}
          </span>
          <span className="text-xs text-echo-muted font-mono">
            {formatDuration(comment.audioDuration)}
          </span>
        </div>
        {comment.presignedAudioUrl && (
          <WaveformPlayer
            audioUrl={comment.presignedAudioUrl}
            peaks={comment.waveformPeaks}
            color="#7C5CFF"
            duration={comment.audioDuration}
          />
        )}
      </div>
    </div>
  );
}

export default function PostDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRecorder, setShowRecorder] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPost(id!),
    enabled: !!id,
  });

  const {
    data: commentsData,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['comments', id],
    queryFn: ({ pageParam }) => postsApi.getComments(id!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: !!id,
  });

  const comments = commentsData?.pages.flatMap((p) => p.items) ?? [];

  if (postLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-echo-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-echo-bg gap-4">
        <p className="text-echo-secondary">Post not found.</p>
        <button onClick={() => navigate(-1)} className="text-accent text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-echo-bg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="text-echo-secondary hover:text-white">
          <ArrowLeft />
        </button>
        <h1 className="text-white font-semibold">Voice Post</h1>
        {post.moodTag && <MoodBadge mood={post.moodTag} size="sm" />}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Avatar user={post.isAnonymous ? null : (post.author ?? null)} size={40} />
            <div>
              <p className="text-sm font-semibold text-white">
                {post.isAnonymous ? '👻 Anonymous' : post.author?.displayName ?? 'Unknown'}
              </p>
              {!post.isAnonymous && post.author && (
                <p className="text-xs text-echo-secondary">@{post.author.username}</p>
              )}
            </div>
          </div>
          {post.presignedAudioUrl && (
            <WaveformPlayer
              audioUrl={post.presignedAudioUrl}
              peaks={post.waveformPeaks}
              color="#7C5CFF"
              duration={post.audioDuration}
            />
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-echo-muted">
            <span>{post.playCount} plays</span>
            <span>{post.echoCount} echoes</span>
            <span>{post.replyCount} replies</span>
          </div>
          {post.transcription && (
            <p className="mt-3 text-sm text-echo-secondary italic border-l-2 border-accent/40 pl-3">
              "{post.transcription}"
            </p>
          )}
        </div>

        <div>
          <div className="px-4 py-2 text-xs font-semibold text-echo-muted uppercase tracking-wider">
            Voice Replies ({post.replyCount})
          </div>
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-echo-muted">
              <MicIcon />
              <p className="text-sm mt-2">Be the first to reply</p>
            </div>
          )}
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              className="w-full py-3 text-sm text-accent hover:text-accent/80"
            >
              Load more replies
            </button>
          )}
          <div className="h-20" />
        </div>
      </div>

      <div className="p-4 border-t border-white/5 bg-echo-card">
        <button
          onClick={() => setShowRecorder(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-echo-elevated text-echo-secondary hover:text-white hover:bg-white/5 transition-colors"
        >
          <span className="text-accent"><MicIcon /></span>
          <span className="text-sm">Add a voice reply…</span>
        </button>
      </div>

      {showRecorder && (
        <VoiceRecorder
          mode="comment"
          postId={id}
          onSuccess={() => setShowRecorder(false)}
          onClose={() => setShowRecorder(false)}
        />
      )}
    </div>
  );
}
