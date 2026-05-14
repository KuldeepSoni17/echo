import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ReportStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { authenticateJWT } from '../middleware/authenticate';
import { isAdmin } from '../middleware/isAdmin';
import { validate } from '../middleware/validate';
import { buildCursorWhere, buildCursorResponse } from '../utils/pagination';
import { success } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';

export const adminRoutes = Router();

// All admin routes require authentication + admin role
adminRoutes.use(authenticateJWT, isAdmin);

// GET /api/admin/reports — list reports by status
adminRoutes.get('/reports', async (req: Request, res: Response) => {
  const status = (req.query['status'] as ReportStatus | undefined) ?? 'PENDING';
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 50;
  const cursorWhere = buildCursorWhere(cursor);

  const validStatuses: ReportStatus[] = ['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const reports = await prisma.report.findMany({
    where: {
      status,
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    include: {
      reporter: { select: { id: true, username: true, displayName: true } },
      reviewer: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(reports, limit)));
});

// POST /api/admin/reports/:id/action — take action on a report
const reportActionSchema = z.object({
  action: z.enum(['dismiss', 'delete_content', 'warn_user', 'ban_user']),
});

adminRoutes.post('/reports/:id/action', validate(reportActionSchema), async (req: Request, res: Response) => {
  const reportId = req.params['id']!;
  const { action } = req.body as z.infer<typeof reportActionSchema>;
  const adminId = req.user!.id;

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new NotFoundError('Report not found');

  let newStatus: ReportStatus = 'REVIEWED';

  switch (action) {
    case 'dismiss':
      newStatus = 'DISMISSED';
      break;

    case 'delete_content':
      newStatus = 'ACTIONED';
      // Soft delete the content
      if (report.targetType === 'POST') {
        await prisma.post.updateMany({
          where: { id: report.targetId },
          data: { isDeleted: true },
        });
      } else if (report.targetType === 'COMMENT') {
        await prisma.comment.updateMany({
          where: { id: report.targetId },
          data: { isDeleted: true },
        });
      }
      break;

    case 'warn_user':
      newStatus = 'ACTIONED';
      // TODO: Send warning notification to user
      // For now just mark as actioned
      break;

    case 'ban_user':
      newStatus = 'ACTIONED';
      if (report.targetType === 'USER') {
        await prisma.user.update({
          where: { id: report.targetId },
          data: { isBanned: true },
        });
      } else {
        // Ban the author of the content
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: { authorId: true },
        });
        if (post) {
          await prisma.user.update({
            where: { id: post.authorId },
            data: { isBanned: true },
          });
        }
      }
      break;
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status: newStatus, reviewedBy: adminId },
  });

  res.json(success({ reportId, action, status: newStatus }));
});

// GET /api/admin/users — list users
adminRoutes.get('/users', async (req: Request, res: Response) => {
  const cursor = req.query['cursor'] as string | undefined;
  const search = req.query['search'] as string | undefined;
  const limit = 50;
  const cursorWhere = buildCursorWhere(cursor);

  const users = await prisma.user.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search } },
            ],
          }
        : {}),
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      phoneNumber: true,
      avatarColor: true,
      isVerified: true,
      isBanned: true,
      isAdmin: true,
      streakCount: true,
      createdAt: true,
      _count: { select: { posts: true, followers: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(users, limit)));
});

// POST /api/admin/users/:id/ban
adminRoutes.post('/users/:id/ban', async (req: Request, res: Response) => {
  const userId = req.params['id']!;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isAdmin: true } });
  if (!user) throw new NotFoundError('User not found');
  if (user.isAdmin) throw new ValidationError('Cannot ban an admin user');

  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: true },
  });

  res.json(success({ banned: true, userId }));
});

// POST /api/admin/users/:id/unban
adminRoutes.post('/users/:id/unban', async (req: Request, res: Response) => {
  const userId = req.params['id']!;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new NotFoundError('User not found');

  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: false },
  });

  res.json(success({ banned: false, userId }));
});

// POST /api/admin/challenges — create challenge
const createChallengeSchema = z.object({
  promptAudioUrl: z.string().min(1),
  title: z.string().min(1).max(100),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

adminRoutes.post('/challenges', validate(createChallengeSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof createChallengeSchema>;

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);

  if (endsAt <= startsAt) {
    throw new ValidationError('endsAt must be after startsAt');
  }

  const challenge = await prisma.challenge.create({
    data: {
      promptAudioUrl: body.promptAudioUrl,
      title: body.title,
      startsAt,
      endsAt,
    },
  });

  res.status(201).json(success(challenge));
});

// GET /api/admin/challenges — list all challenges
adminRoutes.get('/challenges', async (req: Request, res: Response) => {
  const cursor = req.query['cursor'] as string | undefined;
  const limit = 50;
  const cursorWhere = buildCursorWhere(cursor);

  const challenges = await prisma.challenge.findMany({
    where: {
      ...(cursorWhere.createdAt ? { createdAt: cursorWhere.createdAt } : {}),
    },
    orderBy: { startsAt: 'desc' },
    take: limit + 1,
  });

  res.json(success(buildCursorResponse(challenges, limit)));
});
