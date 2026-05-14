import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticateJWT, optionalAuth } from '../middleware/authenticate';
import { searchLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { markAllRead, createNotification } from '../services/notificationService';
import { buildCursorWhere, buildCursorResponse } from '../utils/pagination';
import { success } from '../utils/response';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors';

export const userRoutes = Router();

// GET /api/users/search — must be before /:username
const searchSchema = z.object({
  q: z.string().min(1).max(50),
  cursor: z.string().optional(),
});

userRoutes.get(
  '/search',
  authenticateJWT,
  searchLimit,
  async (req: Request, res: Response) => {
    const result = searchSchema.safeParse(req.query);
    if (!result.success) throw new ValidationError('Query parameter "q" is required');

    const { q, cursor } = result.data;
    const limit = 20;
    const cursorWhere = buildCursorWhere(cursor);

    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
        ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarColor: true,
        isVerified: true,
        streakCount: true,
        createdAt: true,
        _count: { select: { followers: true, posts: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    res.json(success(buildCursorResponse(users, limit)));
  },
);

// GET /api/users/me — own profile
userRoutes.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarColor: true,
      isVerified: true,
      isAdmin: true,
      streakCount: true,
      lastPostedAt: true,
      timezone: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, posts: true },
      },
    },
  });

  if (!user) throw new NotFoundError('User not found');
  res.json(success(user));
});

// PATCH /api/users/me — update profile
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).trim().optional(),
  timezone: z.string().max(50).optional(),
});

userRoutes.patch(
  '/me',
  authenticateJWT,
  validate(updateProfileSchema),
  async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof updateProfileSchema>;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarColor: true,
        timezone: true,
        isVerified: true,
        streakCount: true,
      },
    });

    res.json(success(user));
  },
);

// GET /api/users/me/notifications — paginated notifications
userRoutes.get('/me/notifications', authenticateJWT, async (req: Request, res: Response) => {
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 20;
  const cursorWhere = buildCursorWhere(cursor);

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: req.user!.id,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      actor: {
        select: { id: true, username: true, displayName: true, avatarColor: true },
      },
      post: { select: { id: true, moodTag: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(notifications, limit)));
});

// POST /api/users/me/notifications/read-all
userRoutes.post(
  '/me/notifications/read-all',
  authenticateJWT,
  async (req: Request, res: Response) => {
    await markAllRead(req.user!.id);
    res.json(success({ ok: true }));
  },
);

// GET /api/users/:username — public profile
userRoutes.get('/:username', optionalAuth, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarColor: true,
      isVerified: true,
      streakCount: true,
      createdAt: true,
      _count: {
        select: { followers: true, following: true, posts: true },
      },
    },
  });

  if (!user) throw new NotFoundError('User not found');

  // If viewer is authenticated, include follow relationship
  let isFollowing = false;
  let isBlocked = false;
  if (req.user) {
    const [follow, block] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: req.user.id, followingId: user.id },
        },
      }),
      prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: req.user.id, blockedId: user.id },
            { blockerId: user.id, blockedId: req.user.id },
          ],
        },
      }),
    ]);
    isFollowing = !!follow;
    isBlocked = !!block;
  }

  res.json(success({ ...user, isFollowing, isBlocked }));
});

// POST /api/users/:username/follow
userRoutes.post('/:username/follow', authenticateJWT, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const followerId = req.user!.id;

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('User not found');
  if (target.id === followerId) throw new ValidationError('Cannot follow yourself');

  // Check for existing block
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: followerId, blockedId: target.id },
        { blockerId: target.id, blockedId: followerId },
      ],
    },
  });
  if (block) throw new ForbiddenError('Cannot follow this user');

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId: target.id } },
    update: {},
    create: { followerId, followingId: target.id },
  });

  // Notify
  await createNotification(target.id, 'NEW_FOLLOWER', followerId);

  res.json(success({ following: true }));
});

// DELETE /api/users/:username/follow
userRoutes.delete('/:username/follow', authenticateJWT, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const followerId = req.user!.id;

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('User not found');

  await prisma.follow.deleteMany({
    where: { followerId, followingId: target.id },
  });

  res.json(success({ following: false }));
});

// GET /api/users/:username/followers
userRoutes.get('/:username/followers', optionalAuth, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 20;

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User not found');

  const cursorWhere = buildCursorWhere(cursor);

  const follows = await prisma.follow.findMany({
    where: {
      followingId: user.id,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarColor: true,
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const items = follows.map((f) => ({ ...f.follower, followedAt: f.createdAt }));
  res.json(success(buildCursorResponse(items as typeof items & { createdAt: Date }[], limit)));
});

// GET /api/users/:username/following
userRoutes.get('/:username/following', optionalAuth, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 20;

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new NotFoundError('User not found');

  const cursorWhere = buildCursorWhere(cursor);

  const follows = await prisma.follow.findMany({
    where: {
      followerId: user.id,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarColor: true,
          isVerified: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const items = follows.map((f) => ({ ...f.following, followedAt: f.createdAt }));
  res.json(success(buildCursorResponse(items as typeof items & { createdAt: Date }[], limit)));
});

// POST /api/users/:username/block
userRoutes.post('/:username/block', authenticateJWT, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const blockerId = req.user!.id;

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) throw new NotFoundError('User not found');
  if (target.id === blockerId) throw new ValidationError('Cannot block yourself');

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId: target.id } },
    update: {},
    create: { blockerId, blockedId: target.id },
  });

  // Remove any follow relationships in both directions
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: blockerId, followingId: target.id },
        { followerId: target.id, followingId: blockerId },
      ],
    },
  });

  res.json(success({ blocked: true }));
});

// DELETE /api/users/:username/block
userRoutes.delete('/:username/block', authenticateJWT, async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const blockerId = req.user!.id;

  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) throw new NotFoundError('User not found');

  await prisma.block.deleteMany({
    where: { blockerId, blockedId: target.id },
  });

  res.json(success({ blocked: false }));
});

