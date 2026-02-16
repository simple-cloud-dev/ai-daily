import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireUserAuth } from '../auth/jwt.js';
import { validateWithSchema } from '../security/validation.js';
import type { DigestService } from '../services/digestService.js';
import type { PreferencesService } from '../services/preferencesService.js';

const OnboardingSchema = z
  .object({
    topics: z.array(z.string().trim().min(1)).default([]),
    sourceIds: z.array(z.string().uuid()).default([]),
    frequency: z.enum(['DAILY', 'TWICE_DAILY', 'WEEKLY', 'WEEKDAY_ONLY']).default('DAILY'),
    deliveryTime: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
    timezone: z.string().default('UTC'),
    deliveryEmail: z.string().email(),
    sendSampleDigest: z.boolean().default(true),
  })
  .strict();

export async function registerOnboardingRoutes(
  app: FastifyInstance,
  preferencesService: PreferencesService,
  digestService: DigestService,
): Promise<void> {
  app.post('/onboarding/complete', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(OnboardingSchema, request.body, 'body');

    await preferencesService.updatePreferences(userId, {
      frequency: body.frequency,
      deliveryTime: body.deliveryTime,
      timezone: body.timezone,
    });

    const existingEmails = await preferencesService.listDeliveryEmails(userId);
    if (!existingEmails.some((email) => email.email === body.deliveryEmail)) {
      await preferencesService.addDeliveryEmail(userId, body.deliveryEmail);
    }

    for (const sourceId of body.sourceIds ?? []) {
      await preferencesService.updateSourceSelection(userId, sourceId, true);
    }

    for (const topic of body.topics ?? []) {
      await preferencesService.addKeyword(userId, topic);
    }

    let digestId: string | null = null;
    if (body.sendSampleDigest) {
      const appBaseUrl = app.config.CORS_ALLOWED_ORIGINS[0] ?? 'http://localhost:5173';
      const digest = await digestService.generateForUser(userId, appBaseUrl);
      digestId = digest.id;
    }

    return {
      status: 'ok',
      sampleDigestId: digestId,
    };
  });
}
