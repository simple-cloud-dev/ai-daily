import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';

import type { AppConfig } from './config.js';
import { InMemoryDatabaseClient } from './db/client.js';
import type { OutboundHttpClient } from './http/outboundClient.js';
import { FetchOutboundHttpClient } from './http/outboundClient.js';
import { prisma } from './lib/prisma.js';
import { createAppLifecycle, type AppLifecycle } from './lifecycle.js';
import {
  InMemoryDailySummaryRepository,
} from './repositories/dailySummaryRepository.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDigestRoutes } from './routes/digests.js';
import { registerDailySummaryRoutes } from './routes/dailySummaries.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerPreferencesRoutes } from './routes/preferences.js';
import { registerSecurity } from './security/registerSecurity.js';
import { DigestService } from './services/digestService.js';
import { DailySummaryService } from './services/dailySummaryService.js';
import { EmailService } from './services/emailService.js';
import { PreferencesService } from './services/preferencesService.js';
import { SummarizerService } from './services/summarizerService.js';
import { UserAccountService } from './services/userAccountService.js';

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
  const app: FastifyInstance = Fastify({
    logger:
      options.logger === false
        ? false
        : {
          level: config.NODE_ENV === 'production' ? 'info' : 'debug',
        },
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: config.MAX_REQUEST_SIZE_BYTES,
  });

  registerSecurity(app, config);
  app.decorate('config', config);
  app.decorate('prisma', prisma);

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    cookie: {
      cookieName: 'session',
      signed: false,
    },
  });

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

  const accountService = new UserAccountService(prisma, app);
  const preferencesService = new PreferencesService(prisma);
  const digestService = new DigestService(
    prisma,
    new SummarizerService(config),
    new EmailService(config),
  );
  app.decorate('digestService', digestService);

  await registerAuthRoutes(app, accountService);
  await registerPreferencesRoutes(app, preferencesService);
  await registerDigestRoutes(app, digestService);
  await registerOnboardingRoutes(app, preferencesService, digestService);

  return app;
}

function buildDefaultSummaryService(): DailySummaryService {
  const db = new InMemoryDatabaseClient();
  const summaryRepository = new InMemoryDailySummaryRepository(db);
  return new DailySummaryService(summaryRepository);
}
