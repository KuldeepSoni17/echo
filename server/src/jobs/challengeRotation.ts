import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { getIo } from '../utils/socketRef';

/**
 * Checks if the current challenge has ended.
 * If so, finds the next upcoming challenge and broadcasts a CHALLENGE_LIVE notification
 * to all users via socket.io.
 *
 * This job should run every 15 minutes or so.
 */
export async function runChallengeRotationJob(): Promise<void> {
  logger.info('Running challenge rotation job');

  const now = new Date();

  // Find any challenges that just went live in the last 15 minutes
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const newlyLiveChallenges = await prisma.challenge.findMany({
    where: {
      startsAt: {
        gte: fifteenMinutesAgo,
        lte: now,
      },
    },
  });

  for (const challenge of newlyLiveChallenges) {
    logger.info({ challengeId: challenge.id, title: challenge.title }, 'Challenge went live');

    // Broadcast to all connected clients (best-effort)
    try {
      getIo().emit('challenge:live', {
        id: challenge.id,
        title: challenge.title,
        promptAudioUrl: challenge.promptAudioUrl,
        endsAt: challenge.endsAt,
      });
    } catch {
      // Socket not available
    }

    // Create notifications for all verified, non-banned users in batches
    const BATCH_SIZE = 500;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const users = await prisma.user.findMany({
        where: { isVerified: true, isBanned: false },
        select: { id: true },
        skip,
        take: BATCH_SIZE,
      });

      if (users.length < BATCH_SIZE) {
        hasMore = false;
      }

      for (const user of users) {
        await prisma.notification
          .create({
            data: {
              recipientId: user.id,
              type: 'CHALLENGE_LIVE',
            },
          })
          .catch((err) =>
            logger.error({ err, userId: user.id }, 'Failed to create challenge notification'),
          );

        // Emit to user's personal socket room (best-effort)
        try {
          getIo().to(`user:${user.id}`).emit('notification', {
            type: 'CHALLENGE_LIVE',
            challenge: {
              id: challenge.id,
              title: challenge.title,
            },
          });
        } catch {
          // Socket not available
        }
      }

      skip += BATCH_SIZE;
    }
  }

  // Log challenges that ended recently (for monitoring)
  const recentlyEnded = await prisma.challenge.findMany({
    where: {
      endsAt: {
        gte: fifteenMinutesAgo,
        lte: now,
      },
    },
    select: { id: true, title: true, entryCount: true },
  });

  for (const challenge of recentlyEnded) {
    logger.info(
      { challengeId: challenge.id, title: challenge.title, entries: challenge.entryCount },
      'Challenge ended',
    );
  }

  logger.info(
    {
      newlyLive: newlyLiveChallenges.length,
      recentlyEnded: recentlyEnded.length,
    },
    'Challenge rotation job complete',
  );
}

/**
 * Start the challenge rotation scheduler.
 * Runs every 15 minutes.
 */
export function startChallengeRotationScheduler(): void {
  // Run on startup
  void runChallengeRotationJob().catch((err) =>
    logger.error({ err }, 'Challenge rotation job error on startup'),
  );

  // Then every 15 minutes
  const interval = setInterval(() => {
    void runChallengeRotationJob().catch((err) =>
      logger.error({ err }, 'Challenge rotation job error'),
    );
  }, 15 * 60 * 1000);

  interval.unref();

  logger.info('Challenge rotation scheduler started (runs every 15 minutes)');
}
