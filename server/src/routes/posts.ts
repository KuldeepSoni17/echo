import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MoodTag, ReactionType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { authenticateJWT, optionalAuth } from '../middleware/authenticate';
import { postCreateLimit, commentLimit, reactionLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { createNotification } from '../services/notificationService';
import { queueTranscription } from '../jobs/transcriptionWorker';
import { getPresignedUrl } from '../services/s3Service';
import { buildCursorWhere, buildCursorResponse } from '../utils/pagination';
import { success } from '../utils/response';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../utils/errors';
import { updateStreak } from './posts.helpers';

export const postRoutes = Router();

const FEED_PAGE_SIZE = 20;
const TRENDING_CACHE_KEY = 'trending:posts';
const TRENDING_TTL = 300; // 5 minutes
const PLAYED_SET_TTL = 604800; // 7 days

// POST /api/posts — create post
const createPostSchema = z.object({
  audioKey: z.string().min(1),
  audioDuration: z.number().min(3).max(30),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1).max(200),
  moodTag: z.nativeEnum(MoodTag),
  isAnonymous: z.boolean().default(false),
  parentEchoId: z.string().uuid().optional(),
  challengeId: z.string().uuid().optional(),
});

postRoutes.post(
  '/',
  authenticateJWT,
  postCreateLimit,
  validate(createPostSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof createPostSchema>;

    // Validate challenge if provided
    if (body.challengeId) {
      const challenge = await prisma.challenge.findUnique({
        where: { id: body.challengeId },
      });
      if (!challenge) throw new NotFoundError('Challenge not found');
      const now = new Date();
      if (now < challenge.startsAt || now > challenge.endsAt) {
        throw new ValidationError('Challenge is not currently active');
      }
    }

    // Generate presigned URL for the audio
    const audioUrl = await getPresignedUrl(body.audioKey, 3600 * 24 * 7);

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        audioUrl: body.audioKey, // store S3 key, generate URLs on demand
        audioDuration: body.audioDuration,
        waveformPeaks: body.waveformPeaks,
        moodTag: body.moodTag,
        isAnonymous: body.isAnonymous,
        parentEchoId: body.parentEchoId ?? null,
        challengeId: body.challengeId ?? null,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarColor: true },
        },
      },
    });

    // Increment challenge entry count
    if (body.challengeId) {
      await prisma.challenge.update({
        where: { id: body.challengeId },
        data: { entryCount: { increment: 1 } },
      });
    }

    // Increment parent echo count
    if (body.parentEchoId) {
      await prisma.post.update({
        where: { id: body.parentEchoId },
        data: { echoCount: { increment: 1 } },
      });
    }

    // Update streak
    await updateStreak(userId);

    // Queue transcription
    await queueTranscription(post.id, body.audioKey);

    // Notify followers
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
      take: 1000, // batch limit
    });

    for (const { followerId } of followers) {
      await createNotification(followerId, 'NEW_ECHO', userId, post.id);
    }

    // Invalidate trending cache
    await redis.del(TRENDING_CACHE_KEY);

    res.status(201).json(
      success({
        ...post,
        audioUrl,
      }),
    );
  },
);

// GET /api/posts/feed — home feed
postRoutes.get('/feed', authenticateJWT, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const cursor = req.query['cursor'] as string | undefined;
  const limit = FEED_PAGE_SIZE;

  // Track played posts
  const playedKey = `feed:played:${userId}`;
  const playedIds = await redis.smembers(playedKey);

  // Get following IDs
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  followingIds.push(userId); // include own posts

  // Get blocked user IDs
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));

  const cursorWhere = buildCursorWhere(cursor);

  // Feed query with weighted scoring (applied in application layer)
  // Raw SQL for accurate weighted scoring with time decay
  const safeBlockedIds =
    blockedIds.length > 0 ? blockedIds : ['00000000-0000-0000-0000-000000000000'];
  const cursorClause = cursorWhere.createdAt
    ? `AND p."createdAt" < '${cursorWhere.createdAt.lt.toISOString()}'`
    : '';

  const posts = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      authorId: string;
      audioUrl: string;
      audioDuration: number;
      waveformPeaks: unknown;
      transcription: string | null;
      moodTag: string;
      isAnonymous: boolean;
      isGhostRevealed: boolean;
      parentEchoId: string | null;
      challengeId: string | null;
      playCount: number;
      echoCount: number;
      replyCount: number;
      isDeleted: boolean;
      createdAt: Date;
      username: string;
      displayName: string;
      avatarColor: string;
    }>
  >(
    `SELECT
      p.id,
      p."authorId",
      p."audioUrl",
      p."audioDuration",
      p."waveformPeaks",
      p."transcription",
      p."moodTag",
      p."isAnonymous",
      p."isGhostRevealed",
      p."parentEchoId",
      p."challengeId",
      p."playCount",
      p."echoCount",
      p."replyCount",
      p."isDeleted",
      p."createdAt",
      u.username,
      u."displayName",
      u."avatarColor",
      (
        EXTRACT(EPOCH FROM (NOW() - p."createdAt")) / 3600.0 * -0.5
        + p."playCount" * 0.1
        + p."echoCount" * 0.5
        + p."replyCount" * 0.3
      ) AS score
    FROM "Post" p
    JOIN "User" u ON u.id = p."authorId"
    WHERE
      p."isDeleted" = false
      AND p."authorId" = ANY($1::uuid[])
      AND p."authorId" != ALL($2::uuid[])
      ${cursorClause}
    ORDER BY score DESC, p."createdAt" DESC
    LIMIT $3`,
    followingIds,
    safeBlockedIds,
    limit + 1,
  );

  const response = buildCursorResponse(
    posts.map((p) => ({ ...p, createdAt: new Date(p.createdAt) })),
    limit,
  );

  // Mark posts as seen
  if (response.items.length > 0) {
    const pipeline = redis.pipeline();
    for (const post of response.items) {
      pipeline.sadd(playedKey, post.id);
    }
    pipeline.expire(playedKey, PLAYED_SET_TTL);
    await pipeline.exec();
  }

  res.json(success(response, { playedCount: playedIds.length }));
});

// GET /api/posts/trending — trending posts (cached)
postRoutes.get('/trending', optionalAuth, async (_req: Request, res: Response) => {
  const cached = await redis.get(TRENDING_CACHE_KEY);
  if (cached) {
    res.json(success(JSON.parse(cached) as unknown));
    return;
  }

  const posts = await prisma.post.findMany({
    where: { isDeleted: false, createdAt: { gte: new Date(Date.now() - 48 * 3600 * 1000) } },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarColor: true },
      },
      _count: { select: { reactions: true, comments: true } },
    },
    orderBy: [{ playCount: 'desc' }, { echoCount: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });

  await redis.setex(TRENDING_CACHE_KEY, TRENDING_TTL, JSON.stringify(posts));
  res.json(success(posts));
});

// GET /api/posts/:id — single post
postRoutes.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params['id'], isDeleted: false },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarColor: true },
      },
      _count: { select: { reactions: true, comments: true } },
      challenge: { select: { id: true, title: true } },
    },
  });

  if (!post) throw new NotFoundError('Post not found');

  const audioUrl = await getPresignedUrl(post.audioUrl, 3600);

  res.json(success({ ...post, audioUrl }));
});

// POST /api/posts/:id/play — increment play count
postRoutes.post('/:id/play', optionalAuth, async (req: Request, res: Response) => {
  const postId = req.params['id']!;

  await prisma.post.updateMany({
    where: { id: postId, isDeleted: false },
    data: { playCount: { increment: 1 } },
  });

  // Track in user's played set
  if (req.user) {
    const playedKey = `feed:played:${req.user.id}`;
    await redis.sadd(playedKey, postId);
    await redis.expire(playedKey, PLAYED_SET_TTL);
  }

  res.json(success({ ok: true }));
});

// DELETE /api/posts/:id — soft delete
postRoutes.delete('/:id', authenticateJWT, async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params['id'] },
    select: { authorId: true, isDeleted: true },
  });

  if (!post || post.isDeleted) throw new NotFoundError('Post not found');
  if (post.authorId !== req.user!.id && !req.user!.isAdmin) {
    throw new ForbiddenError('You cannot delete this post');
  }

  await prisma.post.update({
    where: { id: req.params['id'] },
    data: { isDeleted: true },
  });

  await redis.del(TRENDING_CACHE_KEY);

  res.json(success({ deleted: true }));
});

// POST /api/posts/:id/echo — create echo
const echoPostSchema = z.object({
  audioKey: z.string().min(1),
  audioDuration: z.number().min(3).max(30),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1).max(200),
  moodTag: z.nativeEnum(MoodTag),
  overlayStartMs: z.number().min(0).default(0),
  isAnonymous: z.boolean().default(false),
});

postRoutes.post(
  '/:id/echo',
  authenticateJWT,
  postCreateLimit,
  validate(echoPostSchema),
  async (req: Request, res: Response) => {
    const originalPostId = req.params['id']!;
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof echoPostSchema>;

    const original = await prisma.post.findUnique({
      where: { id: originalPostId, isDeleted: false },
      select: { id: true, authorId: true },
    });
    if (!original) throw new NotFoundError('Original post not found');

    const audioUrl = await getPresignedUrl(body.audioKey, 3600 * 24 * 7);

    const echoPost = await prisma.post.create({
      data: {
        authorId: userId,
        audioUrl: body.audioKey,
        audioDuration: body.audioDuration,
        waveformPeaks: body.waveformPeaks,
        moodTag: body.moodTag,
        isAnonymous: body.isAnonymous,
        parentEchoId: originalPostId,
      },
    });

    await prisma.echo.create({
      data: {
        originalPostId,
        echoPostId: echoPost.id,
        echoDuration: body.audioDuration,
        overlayStartMs: body.overlayStartMs,
      },
    });

    await prisma.post.update({
      where: { id: originalPostId },
      data: { echoCount: { increment: 1 } },
    });

    await updateStreak(userId);
    await queueTranscription(echoPost.id, body.audioKey);

    // Notify original author
    await createNotification(original.authorId, 'NEW_ECHO', userId, echoPost.id);

    res.status(201).json(success({ ...echoPost, audioUrl }));
  },
);

// POST /api/posts/:id/comments — voice comment
const createCommentSchema = z.object({
  audioKey: z.string().min(1),
  audioDuration: z.number().min(1).max(30),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1).max(200),
  isAnonymous: z.boolean().default(false),
});

postRoutes.post(
  '/:id/comments',
  authenticateJWT,
  commentLimit,
  validate(createCommentSchema),
  async (req: Request, res: Response) => {
    const postId = req.params['id']!;
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof createCommentSchema>;

    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundError('Post not found');

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        audioUrl: body.audioKey,
        audioDuration: body.audioDuration,
        waveformPeaks: body.waveformPeaks,
        isAnonymous: body.isAnonymous,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarColor: true },
        },
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: { replyCount: { increment: 1 } },
    });

    // Notify post author
    await createNotification(post.authorId, 'NEW_REPLY', userId, postId);

    res.status(201).json(success(comment));
  },
);

// GET /api/posts/:id/comments — list comments
postRoutes.get('/:id/comments', optionalAuth, async (req: Request, res: Response) => {
  const postId = req.params['id']!;
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 20;

  const post = await prisma.post.findUnique({
    where: { id: postId, isDeleted: false },
    select: { id: true },
  });
  if (!post) throw new NotFoundError('Post not found');

  const cursorWhere = buildCursorWhere(cursor);

  const comments = await prisma.comment.findMany({
    where: {
      postId,
      isDeleted: false,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarColor: true },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(comments, limit)));
});

// POST /api/posts/:id/reactions — upsert reaction
const reactionSchema = z.object({
  type: z.nativeEnum(ReactionType),
});

postRoutes.post(
  '/:id/reactions',
  authenticateJWT,
  reactionLimit,
  validate(reactionSchema),
  async (req: Request, res: Response) => {
    const postId = req.params['id']!;
    const userId = req.user!.id;
    const { type } = req.body as z.infer<typeof reactionSchema>;

    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundError('Post not found');

    const reaction = await prisma.reaction.upsert({
      where: { postId_userId: { postId, userId } },
      update: { type },
      create: { postId, userId, type },
    });

    res.json(success(reaction));
  },
);

// DELETE /api/posts/:id/reactions — remove reaction
postRoutes.delete('/:id/reactions', authenticateJWT, async (req: Request, res: Response) => {
  const postId = req.params['id']!;
  const userId = req.user!.id;

  await prisma.reaction.deleteMany({
    where: { postId, userId },
  });

  res.json(success({ removed: true }));
});

// POST /api/posts/:id/reveal — ghost reveal
postRoutes.post('/:id/reveal', authenticateJWT, async (req: Request, res: Response) => {
  const postId = req.params['id']!;
  const userId = req.user!.id;

  const post = await prisma.post.findUnique({
    where: { id: postId, isDeleted: false },
    select: { id: true, authorId: true, isAnonymous: true, isGhostRevealed: true },
  });

  if (!post) throw new NotFoundError('Post not found');
  if (post.authorId !== userId) throw new ForbiddenError('You can only reveal your own posts');
  if (!post.isAnonymous) throw new ValidationError('Post is not anonymous');
  if (post.isGhostRevealed) throw new ConflictError('Already revealed');

  await prisma.post.update({
    where: { id: postId },
    data: { isGhostRevealed: true },
  });

  // Notify all people who reacted
  const reactors = await prisma.reaction.findMany({
    where: { postId },
    select: { userId: true },
    distinct: ['userId'],
  });

  for (const { userId: reactorId } of reactors) {
    await createNotification(reactorId, 'GHOST_REVEAL', userId, postId);
  }

  res.json(success({ revealed: true }));
});

