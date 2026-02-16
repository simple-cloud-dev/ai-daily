import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { HealthResponseSchema } from '@ai-daily/types';

import type { AppConfig } from '../config.js';
import type { OutboundHttpClient } from '../http/outboundClient.js';
import type { AppLifecycle } from '../lifecycle.js';
import { ServiceNotReadyError } from '../security/errors.js';
import { validateWithSchema } from '../security/validation.js';

const EmptyQuerySchema = z.object({}).strict();

type HealthRouteOptions = {
  config: AppConfig;
  lifecycle: AppLifecycle;
  outboundHttpClient: OutboundHttpClient;
};

function createHealthResponse() {
  return HealthResponseSchema.parse({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  options: HealthRouteOptions,
): Promise<void> {
  app.get('/health', async (request) => {
    validateWithSchema(EmptyQuerySchema, request.query, 'query');
    return createHealthResponse();
  });

  app.get('/healthz', async (request) => {
    validateWithSchema(EmptyQuerySchema, request.query, 'query');
    return createHealthResponse();
  });

  app.get('/readyz', async (request) => {
    validateWithSchema(EmptyQuerySchema, request.query, 'query');

    if (options.lifecycle.isShuttingDown()) {
      throw new ServiceNotReadyError('Server is shutting down');
    }

    if (options.config.READINESS_DEPENDENCY_URL) {
      await options.outboundHttpClient.request({
        url: options.config.READINESS_DEPENDENCY_URL,
        requestId: request.id,
        expectOk: true,
      });
    }

    return createHealthResponse();
  });
}
