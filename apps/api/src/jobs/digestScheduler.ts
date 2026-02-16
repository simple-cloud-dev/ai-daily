import cron, { type ScheduledTask } from 'node-cron';

import type { PrismaClient } from '@prisma/client';

import type { AppConfig } from '../config.js';
import type { DigestService } from '../services/digestService.js';

function shouldRunNow(params: {
  frequency: 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'WEEKDAY_ONLY';
  deliveryTime: string;
  timezone: string;
  weeklyDay: number | null;
  now: Date;
}): boolean {
  const local = new Intl.DateTimeFormat('en-US', {
    timeZone: params.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(params.now);

  const hour = local.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = local.find((part) => part.type === 'minute')?.value ?? '00';
  const weekday = local.find((part) => part.type === 'weekday')?.value ?? 'Sun';

  const nowTime = `${hour}:${minute}`;
  const targetMinute = params.deliveryTime;
  const withinWindow = nowTime === targetMinute;
  if (!withinWindow) {
    return false;
  }

  if (params.frequency === 'DAILY') {
    return true;
  }

  if (params.frequency === 'TWICE_DAILY') {
    const [h, m] = params.deliveryTime.split(':').map((part) => Number(part));
    const eveningHour = (h + 10) % 24;
    const eveningTime = `${String(eveningHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return nowTime === params.deliveryTime || nowTime === eveningTime;
  }

  if (params.frequency === 'WEEKDAY_ONLY') {
    return !['Sat', 'Sun'].includes(weekday);
  }

  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  return dayIndex === (params.weeklyDay ?? 1);
}

export function startDigestScheduler(params: {
  config: AppConfig;
  prisma: PrismaClient;
  digestService: DigestService;
  appBaseUrl: string;
  logger: { info: (context: unknown, message?: string) => void; error: (context: unknown, message?: string) => void };
}): ScheduledTask | null {
  if (!params.config.ENABLE_SCHEDULER) {
    return null;
  }

  return cron.schedule(params.config.SCHEDULER_CRON, async () => {
    const now = new Date();

    const users = await params.prisma.user.findMany({
      include: {
        preferences: true,
      },
    });

    for (const user of users) {
      const preferences = user.preferences;
      if (!preferences || preferences.isPaused) {
        continue;
      }

      if (preferences.resumeDate && preferences.resumeDate > now) {
        continue;
      }

      const run = shouldRunNow({
        frequency: preferences.frequency,
        deliveryTime: preferences.deliveryTime,
        timezone: user.timezone,
        weeklyDay: preferences.weeklyDay,
        now,
      });

      if (!run) {
        continue;
      }

      try {
        await params.digestService.generateForUser(user.id, params.appBaseUrl);
      } catch (error) {
        params.logger.error({ error, userId: user.id }, 'digest generation failed');
      }
    }

    params.logger.info({ at: now.toISOString() }, 'digest scheduler tick complete');
  });
}
