import React, { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeed } from '../../hooks/useFeed';
import { useFeedStore } from '../../stores/feedStore';
import { FeedCard } from './FeedCard';
import { FeedCardSkeleton } from '../ui/LoadingSkeleton';

export function FeedScreen() {
  const { posts, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
  const { currentIndex, setCurrentIndex } = useFeedStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isDraggingRef = useRef(false);

  // Fetch more when near end
  useEffect(() => {
    if (currentIndex >= posts.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentIndex, posts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const goNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, posts.length, setCurrentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, setCurrentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 40) return;
    if (e.deltaY > 0) goNext();
    else goPrev();
  }, [goNext, goPrev]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-echo-bg">
        <FeedCardSkeleton />
      </div>
    );
  }

  if (isError || posts.length === 0) {
    return (
      <div className="w-full h-full bg-echo-bg flex flex-col items-center justify-center text-center px-8">
        {isError ? (
          <>
            <span className="text-4xl mb-4">😕</span>
            <p className="text-echo-primary font-semibold mb-2">Something went wrong</p>
            <p className="text-echo-secondary text-sm">Pull to refresh or try again later.</p>
          </>
        ) : (
          <>
            <span className="text-4xl mb-4">🎙️</span>
            <p className="text-echo-primary font-semibold mb-2">Nothing here yet</p>
            <p className="text-echo-secondary text-sm">
              Follow people or record your first voice post to get started.
            </p>
          </>
        )}
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-echo-bg"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentPost.id}
          className="absolute inset-0"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0.5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <FeedCard post={currentPost} isActive={true} />
        </motion.div>
      </AnimatePresence>

      {/* Swipe hint dots */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20">
        {posts.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, i) => {
          const idx = Math.max(0, currentIndex - 2) + i;
          return (
            <div
              key={idx}
              className={`rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-1.5 h-3 bg-white'
                  : 'w-1 h-1 bg-white/30'
              }`}
            />
          );
        })}
      </div>

      {/* Loading next page */}
      {isFetchingNextPage && (
        <div className="absolute bottom-28 left-0 right-0 flex justify-center">
          <div className="bg-echo-elevated/80 rounded-full px-3 py-1.5 text-echo-secondary text-xs flex items-center gap-2">
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}
