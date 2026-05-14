import { prisma } from '../utils/prisma';

/**
 * Updates posting streak for a user.
 * Call after every successful post creation.
 */
export async function updateStreak(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastPostedAt: true, streakCount: true },
  });

  if (!user) return;

  const now = new Date();
  const lastPosted = user.lastPostedAt;

  let newStreak = user.streakCount;

  if (!lastPosted) {
    newStreak = 1;
  } else {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceLast = Math.floor((now.getTime() - lastPosted.getTime()) / msPerDay);

    if (daysSinceLast === 0) {
      // Already posted today — no change
    } else if (daysSinceLast === 1) {
      // Consecutive day — increment streak
      newStreak += 1;
    } else {
      // Streak broken — reset
      newStreak = 1;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastPostedAt: now,
      streakCount: newStreak,
    },
  });
}
