import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '../api/posts';
import type { Post, PaginatedResponse } from '../types';

export function useFeed() {
  const query = useInfiniteQuery<PaginatedResponse<Post>, Error>({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined;
      return postsApi.getFeed(cursor);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 60_000,
  });

  const posts: Post[] = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    posts,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}
