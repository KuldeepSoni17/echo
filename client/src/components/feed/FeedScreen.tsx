import { useEffect, useRef } from 'react';
import { useFeed } from '../../hooks/useFeed';
import { FeedCard } from './FeedCard';
import { FeedCardSkeleton } from '../ui/LoadingSkeleton';

export function FeedScreen() {
  const { posts, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load next page when the sentinel div scrolls into view
  useEffect(() => {
    if (!bottomRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => <FeedCardSkeleton key={i} />)}
      </div>
    );
  }

  if (isError || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <span className="text-4xl mb-4">{isError ? '😕' : '🎙️'}</span>
        <p className="text-echo-primary font-semibold mb-1">
          {isError ? 'Something went wrong' : 'Nothing here yet'}
        </p>
        <p className="text-echo-secondary text-sm">
          {isError ? 'Try again later.' : 'Follow people or record your first voice post.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} isActive={false} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={bottomRef} className="py-2 flex justify-center">
        {isFetchingNextPage && (
          <svg className="animate-spin w-5 h-5 text-echo-muted" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
    </div>
  );
}
