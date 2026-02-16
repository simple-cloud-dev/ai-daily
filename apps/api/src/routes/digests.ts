import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { EngagementInputSchema } from '@ai-daily/types';

import { requireUserAuth } from '../auth/jwt.js';
import { validateWithSchema } from '../security/validation.js';
import type { DigestService } from '../services/digestService.js';

const DigestIdParamSchema = z.object({ id: z.string().uuid() }).strict();
const DigestItemParamSchema = z.object({ digestItemId: z.string().uuid() }).strict();
const ListQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export async function registerDigestRoutes(
  app: FastifyInstance,
  service: DigestService,
): Promise<void> {
  app.get('/digests', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const query = validateWithSchema(ListQuerySchema, request.query, 'query');
    return service.listDigests(userId, query);
  });

  app.post('/digests/generate', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const appBaseUrl = app.config.CORS_ALLOWED_ORIGINS[0] ?? 'http://localhost:5173';
    const digest = await service.generateForUser(userId, appBaseUrl);
    return digest;
  });

  app.get('/digests/:id', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(DigestIdParamSchema, request.params, 'params');
    return service.getDigestById(userId, params.id);
  });

  app.post('/bookmarks', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(DigestItemParamSchema, request.body, 'body');
    await service.bookmarkItem(userId, body.digestItemId);
    return { status: 'ok' };
  });

  app.delete('/bookmarks/:digestItemId', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(DigestItemParamSchema, request.params, 'params');
    await service.unbookmarkItem(userId, params.digestItemId);
    return { status: 'ok' };
  });

  app.post('/digests/items/:digestItemId/read', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(DigestItemParamSchema, request.params, 'params');
    await service.markRead(userId, params.digestItemId);
    return { status: 'ok' };
  });

  app.post('/engagement', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(EngagementInputSchema, request.body, 'body');
    await service.trackEngagement(userId, body);
    return { status: 'ok' };
  });

  app.get('/analytics', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    return service.analytics(userId);
  });
}
