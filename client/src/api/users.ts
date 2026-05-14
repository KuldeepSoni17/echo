import api from './client';
import type { User, Post, Notification, PaginatedResponse } from '../types';

export interface UpdateProfilePayload {
  displayName?: string;
  username?: string;
}

export const usersApi = {
  getProfile: (username: string) =>
    api.get<User>(`/users/${username}`).then((r) => r.data),

  getMe: () =>
    api.get<User>('/users/me').then((r) => r.data),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<User>('/users/me', payload).then((r) => r.data),

  updateMe: (payload: UpdateProfilePayload) =>
    api.patch<User>('/users/me', payload).then((r) => r.data),

  getUserPosts: (username: string, cursor?: string) =>
    api.get<PaginatedResponse<Post>>(`/users/${username}/posts`, {
      params: { cursor },
    }).then((r) => r.data),

  followUser: (username: string) =>
    api.post<void>(`/users/${username}/follow`).then((r) => r.data),

  unfollowUser: (username: string) =>
    api.delete<void>(`/users/${username}/follow`).then((r) => r.data),

  getFollowers: (username: string, cursor?: string) =>
    api.get<PaginatedResponse<User>>(`/users/${username}/followers`, { params: { cursor } }).then((r) => r.data),

  getFollowing: (username: string, cursor?: string) =>
    api.get<PaginatedResponse<User>>(`/users/${username}/following`, { params: { cursor } }).then((r) => r.data),

  getNotifications: (cursor?: string) =>
    api.get<PaginatedResponse<Notification>>('/users/me/notifications', { params: { cursor } }).then((r) => r.data),

  markAllNotificationsRead: () =>
    api.post<void>('/users/me/notifications/read-all').then((r) => r.data),

  markNotificationsRead: () =>
    api.post<void>('/users/me/notifications/read-all').then((r) => r.data),

  searchUsers: (query: string) =>
    api.get<User[]>('/search', { params: { q: query, type: 'users' } }).then((r) => r.data),

  searchAll: (query: string) =>
    api.get<{ users: User[]; posts: Post[] }>('/search', { params: { q: query } }).then((r) => r.data),

  blockUser: (userId: string) =>
    api.post<void>(`/users/${userId}/block`).then((r) => r.data),

  unblockUser: (userId: string) =>
    api.delete<void>(`/users/${userId}/block`).then((r) => r.data),

  getBlockedUsers: () =>
    api.get<User[]>('/users/me/blocked').then((r) => r.data),

  reportUser: (userId: string, reason: string, description?: string) =>
    api.post<void>('/reports', { targetType: 'USER', targetId: userId, reason, description }).then((r) => r.data),

  deleteAccount: () =>
    api.delete<void>('/users/me').then((r) => r.data),

  checkUsername: (username: string) =>
    api.get<{ available: boolean }>(`/users/check-username/${username}`).then((r) => r.data),
};
