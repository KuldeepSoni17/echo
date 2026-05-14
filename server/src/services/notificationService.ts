import { NotificationType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { getIo } from '../utils/socketRef';

export async function createNotification(
  recipientId: string,
  type: NotificationType,
  actorId?: string,
  postId?: string,
): Promise<void> {
  // Don't notify users of their own actions
  if (actorId && actorId === recipientId) return;

  const notification = await prisma.notification.create({
    data: {
      recipientId,
      type,
      actorId: actorId ?? null,
      postId: postId ?? null,
    },
    include: {
      actor: {
        select: { id: true, username: true, displayName: true, avatarColor: true },
      },
      post: {
        select: { id: true, moodTag: true },
      },
    },
  });

  // Emit socket event to recipient's room (best-effort)
  try {
    getIo().to(`user:${recipientId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      actor: notification.actor,
      post: notification.post,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  } catch {
    // Socket server not yet available — notifications will be delivered on next poll
  }
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { recipientId: userId, isRead: false },
  });
}
