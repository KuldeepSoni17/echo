import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export function setupSocketHandlers(io: Server): void {
  // Authenticate on connection
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;

    if (!token) {
      // Allow unauthenticated connections for public feeds (read-only)
      next();
      return;
    }

    try {
      const payload = verifyToken(token);
      if (payload.type !== 'access') {
        next(new Error('Invalid token type'));
        return;
      }
      socket.userId = payload.userId;
      socket.username = payload.username;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const { userId, username } = socket;

    if (userId) {
      // Join personal notification room
      void socket.join(`user:${userId}`);
      logger.debug({ userId, username, socketId: socket.id }, 'User connected');
    }

    // ─── Room Events ────────────────────────────────────────────────────────────

    // Join a live room
    socket.on('room:join', async (data: { roomId: string }) => {
      if (!data?.roomId) return;

      const room = await prisma.room.findUnique({
        where: { id: data.roomId, isLive: true },
        select: { id: true },
      }).catch(() => null);

      if (!room) {
        socket.emit('error', { message: 'Room not found or not live' });
        return;
      }

      void socket.join(`room:${data.roomId}`);

      if (userId) {
        socket.to(`room:${data.roomId}`).emit('room:user_joined', {
          userId,
          username,
        });
      }

      logger.debug({ userId, roomId: data.roomId }, 'Socket joined room');
    });

    // Leave a live room
    socket.on('room:leave', (data: { roomId: string }) => {
      if (!data?.roomId) return;

      void socket.leave(`room:${data.roomId}`);

      if (userId) {
        socket.to(`room:${data.roomId}`).emit('room:user_left', { userId, username });
      }
    });

    // Raise hand in a room
    socket.on('room:raise_hand', async (data: { roomId: string }) => {
      if (!userId || !data?.roomId) return;

      const room = await prisma.room.findUnique({
        where: { id: data.roomId, isLive: true },
        select: { hostId: true, speakerQueue: true },
      }).catch(() => null);

      if (!room) return;

      const queue = room.speakerQueue as string[];
      if (!queue.includes(userId)) {
        queue.push(userId);
        await prisma.room.update({
          where: { id: data.roomId },
          data: { speakerQueue: queue },
        }).catch(() => {});
      }

      // Notify host via their personal room
      io.to(`user:${room.hostId}`).emit('room:hand_raised', {
        userId,
        username,
        roomId: data.roomId,
        position: queue.indexOf(userId) + 1,
      });
    });

    // Grant speaker permission (host only)
    socket.on('room:grant_speaker', async (data: { roomId: string; targetUserId: string }) => {
      if (!userId || !data?.roomId || !data?.targetUserId) return;

      const room = await prisma.room.findUnique({
        where: { id: data.roomId, isLive: true },
        select: { hostId: true, speakerQueue: true },
      }).catch(() => null);

      if (!room || room.hostId !== userId) return;

      // Remove from queue
      const queue = (room.speakerQueue as string[]).filter((id) => id !== data.targetUserId);
      await prisma.room.update({
        where: { id: data.roomId },
        data: { speakerQueue: queue },
      }).catch(() => {});

      // Notify the granted user
      io.to(`user:${data.targetUserId}`).emit('room:speaker_granted', {
        roomId: data.roomId,
      });

      // Broadcast to room
      io.to(`room:${data.roomId}`).emit('room:new_speaker', {
        userId: data.targetUserId,
      });
    });

    // Relay audio chunk to room (real-time audio streaming)
    socket.on('room:audio_chunk', (data: { roomId: string; chunk: ArrayBuffer }) => {
      if (!userId || !data?.roomId || !data?.chunk) return;

      // Relay to all room members except sender
      socket.to(`room:${data.roomId}`).emit('room:audio_chunk', {
        userId,
        username,
        chunk: data.chunk,
        timestamp: Date.now(),
      });
    });

    // End room (host only)
    socket.on('room:end', async (data: { roomId: string }) => {
      if (!userId || !data?.roomId) return;

      const room = await prisma.room.findUnique({
        where: { id: data.roomId, isLive: true },
        select: { hostId: true },
      }).catch(() => null);

      if (!room || room.hostId !== userId) return;

      await prisma.room.update({
        where: { id: data.roomId },
        data: { isLive: false, endedAt: new Date() },
      }).catch(() => {});

      io.to(`room:${data.roomId}`).emit('room:ended', { roomId: data.roomId });
    });

    // ─── Post Feed Events ────────────────────────────────────────────────────────

    // Subscribe to new posts from a specific user (for live feeds)
    socket.on('feed:subscribe_user', (data: { targetUserId: string }) => {
      if (!data?.targetUserId) return;
      void socket.join(`feed:${data.targetUserId}`);
    });

    socket.on('feed:unsubscribe_user', (data: { targetUserId: string }) => {
      if (!data?.targetUserId) return;
      void socket.leave(`feed:${data.targetUserId}`);
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      logger.debug({ userId, socketId: socket.id, reason }, 'Socket disconnected');
    });
  });
}

/**
 * Broadcast a new post to all subscribers of the author's feed.
 * Call this from post creation handlers.
 */
export function broadcastNewPost(
  io: Server,
  authorId: string,
  postData: Record<string, unknown>,
): void {
  io.to(`feed:${authorId}`).emit('feed:new_post', { post: postData });
}
