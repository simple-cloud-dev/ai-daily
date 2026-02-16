import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import type { AppConfig } from './config.js';
import { InMemoryDatabaseClient } from './db/client.js';
import type { OutboundHttpClient } from './http/outboundClient.js';
import { FetchOutboundHttpClient } from './http/outboundClient.js';
import { createAppLifecycle, type AppLifecycle } from './lifecycle.js';
import {
  InMemoryDailySummaryRepository,
} from './repositories/dailySummaryRepository.js';
import { registerDailySummaryRoutes } from './routes/dailySummaries.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSecurity } from './security/registerSecurity.js';
import { DailySummaryService } from './services/dailySummaryService.js';

type BuildAppOptions = {
  logger?: boolean;
  summaryService?: DailySummaryService;
  outboundHttpClient?: OutboundHttpClient;
  lifecycle?: AppLifecycle;
};

export async function buildApp(
  config: AppConfig,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
          level: config.NODE_ENV === 'production' ? 'info' : 'debug',
        },
    requestIdHeader: 'x-request-id',
    replyHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: config.MAX_REQUEST_SIZE_BYTES,
  });

  registerSecurity(app, config);

  const lifecycle = options.lifecycle ?? createAppLifecycle();
  const outboundHttpClient =
    options.outboundHttpClient ??
    new FetchOutboundHttpClient({
      timeoutMs: config.OUTBOUND_HTTP_TIMEOUT_MS,
      maxRetries: config.OUTBOUND_HTTP_MAX_RETRIES,
      retryDelayMs: config.OUTBOUND_HTTP_RETRY_DELAY_MS,
    });
  const service = options.summaryService ?? buildDefaultSummaryService();

  await registerHealthRoutes(app, {
    config,
    lifecycle,
    outboundHttpClient,
  });
  await registerDailySummaryRoutes(app, service, config);

  return app;
}

function buildDefaultSummaryService(): DailySummaryService {
  const db = new InMemoryDatabaseClient();
  const summaryRepository = new InMemoryDailySummaryRepository(db);
  return new DailySummaryService(summaryRepository);
}
