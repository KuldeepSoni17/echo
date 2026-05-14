import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users';
import { useNotificationStore } from '../stores/notificationStore';
import { Avatar } from '../components/ui/Avatar';
import { formatDistanceToNow } from '../utils/formatDuration';
import type { Notification, NotificationType } from '../types';

const notificationIcon: Record<NotificationType, string> = {
  NEW_ECHO: '🔁',
  NEW_REPLY: '💬',
  NEW_FOLLOWER: '👤',
  CHALLENGE_LIVE: '🏆',
  GHOST_REVEAL: '👻',
  STREAK_REMINDER: '🔥',
  ROOM_STARTED: '🎙️',
};

const notificationText: Record<NotificationType, (actor?: string) => string> = {
  NEW_ECHO: (actor) => `${actor ?? 'Someone'} echoed your post`,
  NEW_REPLY: (actor) => `${actor ?? 'Someone'} replied to your post`,
  NEW_FOLLOWER: (actor) => `${actor ?? 'Someone'} started following you`,
  CHALLENGE_LIVE: () => 'A new challenge is now live!',
  GHOST_REVEAL: (actor) => `${actor ?? 'Someone'} revealed their anonymous post`,
  STREAK_REMINDER: () => "Don't forget to post today to keep your streak!",
  ROOM_STARTED: (actor) => `${actor ?? 'Someone'} started a live room`,
};

function NotificationItem({ notification }: { notification: Notification }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (notification.post) navigate(`/post/${notification.post.id}`);
    else if (notification.actor) navigate(`/profile/${notification.actor.username}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
        !notification.isRead ? 'bg-accent/5' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar user={notification.actor ?? null} size={40} />
        <span className="absolute -bottom-1 -right-1 text-base leading-none">
          {notificationIcon[notification.type]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">
          {notificationText[notification.type](notification.actor?.displayName)}
        </p>
        <p className="text-xs text-echo-muted mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt))}
        </p>
      </div>
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
      )}
    </button>
  );
}

export default function NotificationsScreen() {
  const { clearUnread } = useNotificationStore();
  const qc = useQueryClient();

  const { data, fetchNextPage, hasNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => usersApi.getNotifications(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  });

  const readAll = useMutation({
    mutationFn: () => usersApi.markAllNotificationsRead(),
    onSuccess: () => {
      clearUnread();
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.pages.flatMap((p) => p.items) ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="h-full flex flex-col bg-echo-bg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h1 className="text-lg font-semibold text-white">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => readAll.mutate()}
            className="text-sm text-accent hover:text-accent/80"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-echo-muted">
            <span className="text-4xl mb-3">🔔</span>
            <p className="text-sm">No notifications yet</p>
          </div>
        )}

        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} />
        ))}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            className="w-full py-4 text-sm text-accent hover:text-accent/80"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
