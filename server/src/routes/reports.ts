import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ReportReason, TargetType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { authenticateJWT } from '../middleware/authenticate';
import { reportLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { success } from '../utils/response';
import { ConflictError } from '../utils/errors';

export const reportRoutes = Router();

const createReportSchema = z.object({
  targetType: z.nativeEnum(TargetType),
  targetId: z.string().uuid(),
  reason: z.nativeEnum(ReportReason),
  description: z.string().max(500).optional(),
});

// POST /api/reports — submit a report
reportRoutes.post(
  '/',
  authenticateJWT,
  reportLimit,
  validate(createReportSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof createReportSchema>;

    // Prevent duplicate reports from same user for same target
    const existing = await prisma.report.findFirst({
      where: {
        reporterId: userId,
        targetId: body.targetId,
        targetType: body.targetType,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new ConflictError('You have already reported this content');
    }

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        description: body.description ?? null,
      },
    });

    res.status(201).json(
      success({
        id: report.id,
        message: 'Report submitted successfully. Our team will review it shortly.',
      }),
    );
  },
);
