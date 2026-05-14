import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { ChallengeCard } from './ChallengeCard';
import { usersApi } from '../../api/users';
import { postsApi } from '../../api/posts';
import api from '../../api/client';
import type { Challenge } from '../../types';

function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function ExploreScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounced(searchQuery, 300);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => usersApi.searchAll(debouncedQuery),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn: () => postsApi.getTrending(),
    staleTime: 60_000,
  });

  const { data: challenge } = useQuery({
    queryKey: ['active-challenge'],
    queryFn: () => api.get<Challenge>('/challenges/active').then((r) => r.data),
    staleTime: 120_000,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms-list'],
    queryFn: () => api.get('/rooms').then((r) => r.data),
    staleTime: 30_000,
  });

  const isSearching = debouncedQuery.trim().length >= 2;

  return (
    <div className="flex flex-col h-full bg-echo-bg overflow-y-auto pb-24">
      {/* Search bar */}
      <div className="sticky top-0 bg-echo-bg/95 backdrop-blur-md z-10 px-4 py-4 pt-safe border-b border-echo-elevated/40">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-echo-muted" width="18" height="18"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search people and voices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-echo-elevated text-echo-primary placeholder:text-echo-muted
              rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-echo-accent/30"
          />
        </div>
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="px-4 mt-4">
          {searching ? (
            <div className="text-echo-muted text-sm text-center py-8">Searching...</div>
          ) : searchResults ? (
            <div className="space-y-6">
              {searchResults.users.length > 0 && (
                <div>
                  <h3 className="text-echo-secondary text-xs font-semibold uppercase tracking-wider mb-3">People</h3>
                  <div className="space-y-2">
                    {searchResults.users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => navigate(`/profile/${user.username}`)}
                        className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-echo-elevated transition-colors"
                      >
                        <Avatar user={user} size={44} />
                        <div className="text-left">
                          <p className="text-echo-primary font-medium text-sm">{user.displayName}</p>
                          <p className="text-echo-secondary text-xs">@{user.username}</p>
                        </div>
                        {user.streakCount > 0 && (
                          <span className="ml-auto text-sm">🔥 {user.streakCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchResults.posts.length === 0 && searchResults.users.length === 0 && (
                <p className="text-echo-muted text-sm text-center py-8">No results for "{debouncedQuery}"</p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Default content */}
      {!isSearching && (
        <div className="px-4 mt-6 space-y-8">
          {/* Active Challenge */}
          {challenge && (
            <div>
              <h2 className="text-echo-primary font-bold text-base mb-3">Challenge</h2>
              <ChallengeCard challenge={challenge} />
            </div>
          )}

          {/* Trending posts */}
          {trending && trending.length > 0 && (
            <div>
              <h2 className="text-echo-primary font-bold text-base mb-3">Trending</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {trending.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="flex-shrink-0 w-48 bg-echo-card rounded-2xl p-4 snap-start"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar user={post.author} size={28} />
                      <span className="text-echo-primary text-xs font-medium truncate">
                        {post.author?.displayName ?? 'Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 h-8">
                      {(post.waveformPeaks ?? []).slice(0, 20).map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-echo-accent rounded-full"
                          style={{ height: `${Math.max(3, v * 32)}px` }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-echo-muted text-xs">
                      <span>🔥 {post.reactionCounts?.FIRE ?? 0}</span>
                      <span>▶ {post.playCount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Rooms */}
          {rooms && (rooms as { id: string; title: string; host: { displayName: string }; listenerCount: number }[]).length > 0 && (
            <div>
              <h2 className="text-echo-primary font-bold text-base mb-3">Live Rooms</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {(rooms as { id: string; title: string; host: { displayName: string }; listenerCount: number }[]).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    className="flex-shrink-0 w-44 bg-echo-card rounded-2xl p-4 snap-start border border-echo-elevated"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-echo-success animate-pulse" />
                      <span className="text-echo-success text-xs font-medium">LIVE</span>
                    </div>
                    <p className="text-echo-primary text-sm font-medium truncate">{room.title}</p>
                    <p className="text-echo-secondary text-xs mt-1">{room.host.displayName}</p>
                    <p className="text-echo-muted text-xs mt-1">👥 {room.listenerCount}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!challenge && !trending?.length && !rooms && (
            <div className="text-center py-16">
              <span className="text-4xl">🔍</span>
              <p className="text-echo-secondary text-sm mt-4">Search for people or voices above</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
