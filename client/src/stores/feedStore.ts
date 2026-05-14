import { create } from 'zustand';

interface FeedState {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  playedPostIds: Set<string>;
  markPlayed: (postId: string) => void;
  resetFeed: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  currentIndex: 0,
  playedPostIds: new Set<string>(),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  markPlayed: (postId) =>
    set((state) => ({
      playedPostIds: new Set([...state.playedPostIds, postId]),
    })),

  resetFeed: () =>
    set({ currentIndex: 0, playedPostIds: new Set<string>() }),
}));
