import { prisma } from '../utils/prisma';
import { createNotification } from '../services/notificationService';
import { logger } from '../utils/logger';

/**
 * Sends streak reminder notifications to users who haven't posted today.
 * Respects the user's local timezone — notifies at approximately 9pm local time.
 *
 * This job should be scheduled to run every hour (e.g., via setInterval or a cron scheduler).
 * On each run it checks which timezones are currently at ~21:00 and notifies users in those zones.
 */
export async function runStreakReminderJob(): Promise<void> {
  logger.info('Running streak reminder job');

  const now = new Date();
  const targetHour = 21; // 9pm local time

  // Find users who:
  // 1. Have a streak (streakCount > 0) — they have something to protect
  // 2. Haven't posted today
  // 3. Are in a timezone where it's currently ~9pm
  const users = await prisma.user.findMany({
    where: {
      isBanned: false,
      streakCount: { gt: 0 },
      OR: [
        { lastPostedAt: null },
        {
          lastPostedAt: {
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()), // before start of today UTC
          },
        },
      ],
    },
    select: {
      id: true,
      timezone: true,
      lastPostedAt: true,
      streakCount: true,
    },
  });

  let notified = 0;

  for (const user of users) {
    try {
      // Determine local hour for this user
      const localHour = getLocalHour(now, user.timezone);

      // Notify if it's 9pm (21:00) in their timezone (±30 min window = hour === 21)
      if (localHour !== targetHour) continue;

      // Check they haven't posted today in their local timezone
      if (user.lastPostedAt) {
        const localLastPosted = toLocalDate(user.lastPostedAt, user.timezone);
        const localToday = toLocalDate(now, user.timezone);

        if (
          localLastPosted.localYear === localToday.localYear &&
          localLastPosted.localMonth === localToday.localMonth &&
          localLastPosted.localDay === localToday.localDay
        ) {
          continue; // Already posted today in their timezone
        }
      }

      await createNotification(user.id, 'STREAK_REMINDER');
      notified++;
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to send streak reminder');
    }
  }

  logger.info({ notified, total: users.length }, 'Streak reminder job complete');
}

function getLocalHour(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : -1;
  } catch {
    // Fallback to UTC
    return date.getUTCHours();
  }
}

interface LocalDate {
  localYear: number;
  localMonth: number;
  localDay: number;
}

function toLocalDate(date: Date, timezone: string): LocalDate {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    return { localYear: get('year'), localMonth: get('month'), localDay: get('day') };
  } catch {
    return {
      localYear: date.getUTCFullYear(),
      localMonth: date.getUTCMonth() + 1,
      localDay: date.getUTCDate(),
    };
  }
}

/**
 * Start the streak reminder scheduler.
 * Runs every hour to check for users in the 9pm window.
 */
export function startStreakReminderScheduler(): void {
  // Run immediately on start (in case server restarted at 9pm)
  void runStreakReminderJob().catch((err) =>
    logger.error({ err }, 'Streak reminder job error on startup'),
  );

  // Then run every hour
  const interval = setInterval(() => {
    void runStreakReminderJob().catch((err) =>
      logger.error({ err }, 'Streak reminder job error'),
    );
  }, 60 * 60 * 1000);

  // Allow process to exit even if interval is running
  interval.unref();

  logger.info('Streak reminder scheduler started (runs hourly)');
}
