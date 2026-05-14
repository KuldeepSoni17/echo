import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { MoodTag } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { authenticateJWT, optionalAuth } from '../middleware/authenticate';
import { postCreateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { getPresignedUrl } from '../services/s3Service';
import { queueTranscription } from '../jobs/transcriptionWorker';
import { updateStreak } from './posts.helpers';
import { buildCursorWhere, buildCursorResponse } from '../utils/pagination';
import { success } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';

export const challengeRoutes = Router();

// GET /api/challenges/active — current active challenge(s)
challengeRoutes.get('/active', optionalAuth, async (_req: Request, res: Response) => {
  const now = new Date();

  const challenges = await prisma.challenge.findMany({
    where: {
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: 'desc' },
    take: 5,
  });

  res.json(success(challenges));
});

// GET /api/challenges/:id/entries — sorted entries for a challenge
challengeRoutes.get('/:id/entries', optionalAuth, async (req: Request, res: Response) => {
  const challengeId = req.params['id']!;
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 20;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true },
  });
  if (!challenge) throw new NotFoundError('Challenge not found');

  const cursorWhere = buildCursorWhere(cursor);

  const entries = await prisma.post.findMany({
    where: {
      challengeId,
      isDeleted: false,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarColor: true },
      },
      _count: { select: { reactions: true, comments: true } },
    },
    orderBy: [{ playCount: 'desc' }, { echoCount: 'desc' }, { createdAt: 'desc' }],
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(entries, limit)));
});

// POST /api/challenges/:id/enter — submit a challenge entry
const enterChallengeSchema = z.object({
  audioKey: z.string().min(1),
  audioDuration: z.number().min(3).max(30),
  waveformPeaks: z.array(z.number().min(0).max(1)).min(1).max(200),
  moodTag: z.nativeEnum(MoodTag),
  isAnonymous: z.boolean().default(false),
});

challengeRoutes.post(
  '/:id/enter',
  authenticateJWT,
  postCreateLimit,
  validate(enterChallengeSchema),
  async (req: Request, res: Response) => {
    const challengeId = req.params['id']!;
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof enterChallengeSchema>;

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundError('Challenge not found');

    const now = new Date();
    if (now < challenge.startsAt || now > challenge.endsAt) {
      throw new ValidationError('Challenge is not currently active');
    }

    // Check if user already submitted an entry for this challenge
    const existing = await prisma.post.findFirst({
      where: { authorId: userId, challengeId, isDeleted: false },
    });
    if (existing) {
      throw new ValidationError('You have already submitted an entry for this challenge');
    }

    const audioUrl = await getPresignedUrl(body.audioKey, 3600 * 24 * 7);

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        audioUrl: body.audioKey,
        audioDuration: body.audioDuration,
        waveformPeaks: body.waveformPeaks,
        moodTag: body.moodTag,
        isAnonymous: body.isAnonymous,
        challengeId,
      },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarColor: true },
        },
      },
    });

    await prisma.challenge.update({
      where: { id: challengeId },
      data: { entryCount: { increment: 1 } },
    });

    await updateStreak(userId);
    await queueTranscription(post.id, body.audioKey);

    res.status(201).json(success({ ...post, audioUrl }));
  },
);
