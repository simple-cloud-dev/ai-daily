import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  CreateDailySummaryInputSchema,
  DailySummaryListSchema,
  DailySummarySchema,
} from '@ai-daily/types';

import type { AppConfig } from '../config.js';
import { authenticate, authorize } from '../security/auth.js';
import { validateWithSchema } from '../security/validation.js';
import type { DailySummaryService } from '../services/dailySummaryService.js';

const EmptyQuerySchema = z.object({}).strict();

export async function registerDailySummaryRoutes(
  app: FastifyInstance,
  service: DailySummaryService,
  config: AppConfig,
): Promise<void> {
  const requireAuth = authenticate(config);

  app.get('/daily-summaries', {
    preHandler: [requireAuth, authorize('reader')],
  }, async (request) => {
    validateWithSchema(EmptyQuerySchema, request.query, 'query');

    const items = await service.list();
    return DailySummaryListSchema.parse(items);
  });

  app.post('/daily-summaries', {
    preHandler: [requireAuth, authorize('writer')],
  }, async (request) => {
    const body = validateWithSchema(CreateDailySummaryInputSchema, request.body, 'body');
    const item = await service.create(body);
    return DailySummarySchema.parse(item);
  });
}
