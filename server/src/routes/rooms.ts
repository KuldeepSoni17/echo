import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticateJWT, optionalAuth } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createNotification } from '../services/notificationService';
import { getIo } from '../utils/socketRef';
import { success } from '../utils/response';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { buildCursorWhere, buildCursorResponse } from '../utils/pagination';

export const roomRoutes = Router();

// POST /api/rooms — create room
const createRoomSchema = z.object({
  title: z.string().min(1).max(100).trim(),
});

roomRoutes.post(
  '/',
  authenticateJWT,
  validate(createRoomSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { title } = req.body as z.infer<typeof createRoomSchema>;

    // Allow only one active room per user
    const existingRoom = await prisma.room.findFirst({
      where: { hostId: userId, isLive: true },
    });
    if (existingRoom) {
      throw new ValidationError('You already have an active room. End it before creating a new one.');
    }

    const room = await prisma.room.create({
      data: { hostId: userId, title },
      include: { host: { select: { id: true, username: true, displayName: true, avatarColor: true } } },
    });

    // Notify followers
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
      take: 1000,
    });

    for (const { followerId } of followers) {
      await createNotification(followerId, 'ROOM_STARTED', userId);
    }

    res.status(201).json(success(room));
  },
);

// GET /api/rooms/live — active rooms
roomRoutes.get('/live', optionalAuth, async (req: Request, res: Response) => {
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 20;
  const cursorWhere = buildCursorWhere(cursor);

  const rooms = await prisma.room.findMany({
    where: {
      isLive: true,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarColor: true } },
    },
    orderBy: [{ listenerCount: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(rooms, limit)));
});

// GET /api/rooms/:id — room detail
roomRoutes.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const room = await prisma.room.findUnique({
    where: { id: req.params['id'] },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarColor: true } },
    },
  });

  if (!room) throw new NotFoundError('Room not found');
  res.json(success(room));
});

// POST /api/rooms/:id/join
roomRoutes.post('/:id/join', authenticateJWT, async (req: Request, res: Response) => {
  const roomId = req.params['id']!;
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, isLive: true, listenerCount: true },
  });

  if (!room) throw new NotFoundError('Room not found');
  if (!room.isLive) throw new ValidationError('Room is no longer live');

  await prisma.room.update({
    where: { id: roomId },
    data: { listenerCount: { increment: 1 } },
  });

  // Emit socket event to room
  getIo().to(`room:${roomId}`).emit('room:user_joined', {
    userId: req.user!.id,
    username: req.user!.username,
  });

  res.json(success({ joined: true, listenerCount: room.listenerCount + 1 }));
});

// POST /api/rooms/:id/leave
roomRoutes.post('/:id/leave', authenticateJWT, async (req: Request, res: Response) => {
  const roomId = req.params['id']!;
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, isLive: true, listenerCount: true },
  });

  if (!room) throw new NotFoundError('Room not found');

  const newCount = Math.max(0, room.listenerCount - 1);
  await prisma.room.update({
    where: { id: roomId },
    data: { listenerCount: newCount },
  });

  getIo().to(`room:${roomId}`).emit('room:user_left', {
    userId: req.user!.id,
    username: req.user!.username,
  });

  res.json(success({ left: true, listenerCount: newCount }));
});

// POST /api/rooms/:id/raise-hand
roomRoutes.post('/:id/raise-hand', authenticateJWT, async (req: Request, res: Response) => {
  const roomId = req.params['id']!;
  const userId = req.user!.id;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, isLive: true, hostId: true, speakerQueue: true },
  });

  if (!room) throw new NotFoundError('Room not found');
  if (!room.isLive) throw new ValidationError('Room is no longer live');

  const queue = room.speakerQueue as string[];

  if (!queue.includes(userId)) {
    queue.push(userId);
    await prisma.room.update({
      where: { id: roomId },
      data: { speakerQueue: queue },
    });
  }

  // Notify host
  getIo().to(`user:${room.hostId}`).emit('room:hand_raised', { userId, roomId });

  res.json(success({ inQueue: true, position: queue.indexOf(userId) + 1 }));
});

// POST /api/rooms/:id/grant-speaker/:userId
roomRoutes.post(
  '/:id/grant-speaker/:userId',
  authenticateJWT,
  async (req: Request, res: Response) => {
    const roomId = req.params['id']!;
    const targetUserId = req.params['userId']!;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, isLive: true, hostId: true, speakerQueue: true },
    });

    if (!room) throw new NotFoundError('Room not found');
    if (!room.isLive) throw new ValidationError('Room is no longer live');
    if (room.hostId !== req.user!.id) throw new ForbiddenError('Only the host can grant speaker access');

    // Remove from queue
    const queue = (room.speakerQueue as string[]).filter((id) => id !== targetUserId);
    await prisma.room.update({
      where: { id: roomId },
      data: { speakerQueue: queue },
    });

    // Notify the granted user
    getIo().to(`user:${targetUserId}`).emit('room:speaker_granted', { roomId });
    getIo().to(`room:${roomId}`).emit('room:new_speaker', { userId: targetUserId });

    res.json(success({ granted: true }));
  },
);

// POST /api/rooms/:id/end
roomRoutes.post('/:id/end', authenticateJWT, async (req: Request, res: Response) => {
  const roomId = req.params['id']!;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, hostId: true, isLive: true },
  });

  if (!room) throw new NotFoundError('Room not found');
  if (room.hostId !== req.user!.id && !req.user!.isAdmin) {
    throw new ForbiddenError('Only the host can end the room');
  }
  if (!room.isLive) throw new ValidationError('Room is already ended');

  await prisma.room.update({
    where: { id: roomId },
    data: { isLive: false, endedAt: new Date() },
  });

  getIo().to(`room:${roomId}`).emit('room:ended', { roomId });

  res.json(success({ ended: true }));
});
