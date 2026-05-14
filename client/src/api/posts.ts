import api from './client';
import type { Post, Comment, PaginatedResponse, ReactionType, MoodTag } from '../types';

export interface CreatePostPayload {
  audioUrl: string;
  waveformPeaks: number[];
  audioDuration: number;
  moodTag: MoodTag;
  isAnonymous: boolean;
  challengeId?: string;
}

export interface CreateCommentPayload {
  audioUrl: string;
  waveformPeaks: number[];
  audioDuration: number;
  isAnonymous: boolean;
}

export interface CreateEchoPayload {
  audioUrl: string;
  waveformPeaks: number[];
  audioDuration: number;
  isAnonymous: boolean;
  moodTag: MoodTag;
  overlayStartMs?: number;
}

export const postsApi = {
  getFeed: (cursor?: string) =>
    api.get<PaginatedResponse<Post>>('/feed', { params: { cursor } }).then((r) => r.data),

  getPost: (postId: string) =>
    api.get<Post>(`/posts/${postId}`).then((r) => r.data),

  createPost: (payload: CreatePostPayload) =>
    api.post<Post>('/posts', payload).then((r) => r.data),

  deletePost: (postId: string) =>
    api.delete<void>(`/posts/${postId}`).then((r) => r.data),

  reactToPost: (postId: string, reactionType: ReactionType) =>
    api.post<void>(`/posts/${postId}/reactions`, { type: reactionType }).then((r) => r.data),

  removeReaction: (postId: string) =>
    api.delete<void>(`/posts/${postId}/reactions`).then((r) => r.data),

  createEcho: (postId: string, payload: CreateEchoPayload) =>
    api.post<Post>(`/posts/${postId}/echo`, payload).then((r) => r.data),

  getEchoChain: (postId: string) =>
    api.get<Post[]>(`/posts/${postId}/echo-chain`).then((r) => r.data),

  getComments: (postId: string, cursor?: string) =>
    api.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments`, {
      params: { cursor },
    }).then((r) => r.data),

  createComment: (postId: string, payload: CreateCommentPayload) =>
    api.post<Comment>(`/posts/${postId}/comments`, payload).then((r) => r.data),

  recordPlay: (postId: string) =>
    api.post<void>(`/posts/${postId}/play`).then((r) => r.data),

  getTrending: () =>
    api.get<Post[]>('/posts/trending').then((r) => r.data),

  revealGhost: (postId: string) =>
    api.post<Post>(`/posts/${postId}/reveal`).then((r) => r.data),

  reportPost: (postId: string, reason: string, description?: string) =>
    api.post<void>('/reports', { targetType: 'POST', targetId: postId, reason, description }).then((r) => r.data),
};
