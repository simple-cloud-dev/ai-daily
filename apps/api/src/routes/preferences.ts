import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  UpdateUserPreferencesInputSchema,
  UpsertCustomSourceInputSchema,
} from '@ai-daily/types';

import { requireUserAuth } from '../auth/jwt.js';
import { validateWithSchema } from '../security/validation.js';
import type { PreferencesService } from '../services/preferencesService.js';

const EmailSchema = z.object({ email: z.string().email() }).strict();
const SourceSelectionSchema = z
  .object({
    sourceId: z.string().uuid(),
    isEnabled: z.boolean(),
  })
  .strict();
const KeywordSchema = z.object({ keyword: z.string().trim().min(1).max(120) }).strict();

export async function registerPreferencesRoutes(
  app: FastifyInstance,
  service: PreferencesService,
): Promise<void> {
  app.get('/preferences', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const [preferences, deliveryEmails, sources, customSources, keywords] = await Promise.all([
      service.getPreferences(userId),
      service.listDeliveryEmails(userId),
      service.listSources(userId),
      service.listCustomSources(userId),
      service.listKeywords(userId),
    ]);

    return {
      preferences,
      deliveryEmails,
      sources,
      customSources,
      keywords,
    };
  });

  app.patch('/preferences', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(UpdateUserPreferencesInputSchema, request.body, 'body');
    const preferences = await service.updatePreferences(userId, body);
    return preferences;
  });

  app.get('/preferences/delivery-emails', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    return service.listDeliveryEmails(userId);
  });

  app.post('/preferences/delivery-emails', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(EmailSchema, request.body, 'body');
    const created = await service.addDeliveryEmail(userId, body.email);
    return created;
  });

  app.post('/preferences/delivery-emails/:id/primary', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(z.object({ id: z.string().uuid() }).strict(), request.params, 'params');
    await service.setPrimaryDeliveryEmail(userId, params.id);
    return { status: 'ok' };
  });

  app.delete('/preferences/delivery-emails/:id', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(z.object({ id: z.string().uuid() }).strict(), request.params, 'params');
    await service.deleteDeliveryEmail(userId, params.id);
    return { status: 'ok' };
  });

  app.patch('/preferences/sources', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(SourceSelectionSchema, request.body, 'body');
    await service.updateSourceSelection(userId, body.sourceId, body.isEnabled);
    return { status: 'ok' };
  });

  app.get('/preferences/custom-sources', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    return service.listCustomSources(userId);
  });

  app.post('/preferences/custom-sources', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(UpsertCustomSourceInputSchema, request.body, 'body');
    return service.upsertCustomSource(userId, {
      ...body,
      isEnabled: body.isEnabled ?? true,
    });
  });

  app.patch('/preferences/custom-sources/:id', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(z.object({ id: z.string().uuid() }).strict(), request.params, 'params');
    const body = validateWithSchema(UpsertCustomSourceInputSchema, request.body, 'body');
    return service.upsertCustomSource(
      userId,
      {
        ...body,
        isEnabled: body.isEnabled ?? true,
      },
      params.id,
    );
  });

  app.delete('/preferences/custom-sources/:id', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(z.object({ id: z.string().uuid() }).strict(), request.params, 'params');
    await service.deleteCustomSource(userId, params.id);
    return { status: 'ok' };
  });

  app.get('/preferences/keywords', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    return service.listKeywords(userId);
  });

  app.post('/preferences/keywords', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(KeywordSchema, request.body, 'body');
    return service.addKeyword(userId, body.keyword);
  });

  app.delete('/preferences/keywords/:id', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const params = validateWithSchema(z.object({ id: z.string().uuid() }).strict(), request.params, 'params');
    await service.deleteKeyword(userId, params.id);
    return { status: 'ok' };
  });
}
