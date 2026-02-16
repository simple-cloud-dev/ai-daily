import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import type { AppConfig } from './config.js';
import type { DailySummaryRepository } from './repositories/dailySummaryRepository.js';
import { DailySummaryService } from './services/dailySummaryService.js';

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    NODE_ENV: 'test',
    PORT: 4000,
    CORS_ALLOWED_ORIGINS: ['http://localhost:5173'],
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX: 100,
    MAX_REQUEST_SIZE_BYTES: 1_048_576,
    OUTBOUND_HTTP_TIMEOUT_MS: 500,
    OUTBOUND_HTTP_MAX_RETRIES: 1,
    OUTBOUND_HTTP_RETRY_DELAY_MS: 10,
    SHUTDOWN_GRACE_PERIOD_MS: 5_000,
    API_READ_TOKEN: 'test-read-token-1234',
    API_WRITE_TOKEN: 'test-write-token-1234',
    ...overrides,
  };
}

describe('API security baseline', () => {
  it('rejects unauthenticated access', async () => {
    const app = await buildApp(createConfig(), { logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/daily-summaries',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('unauthorized');

    await app.close();
  });

  it('blocks authz bypass with read-only token on write route', async () => {
    const config = createConfig();
    const app = await buildApp(config, { logger: false });

    const response = await app.inject({
      method: 'POST',
      url: '/daily-summaries',
      headers: {
        authorization: `Bearer ${config.API_READ_TOKEN}`,
      },
      payload: {
        title: 'Attempted bypass',
        content: 'Should be forbidden',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('forbidden');

    await app.close();
  });

  it('rejects validation failures and injection-shaped payloads', async () => {
    const config = createConfig();
    const app = await buildApp(config, { logger: false });

    const missingFieldResponse = await app.inject({
      method: 'POST',
      url: '/daily-summaries',
      headers: {
        authorization: `Bearer ${config.API_WRITE_TOKEN}`,
      },
      payload: {
        title: '',
      },
    });

    expect(missingFieldResponse.statusCode).toBe(400);
    expect(missingFieldResponse.json().code).toBe('validation_error');

    const injectionResponse = await app.inject({
      method: 'POST',
      url: '/daily-summaries',
      headers: {
        authorization: `Bearer ${config.API_WRITE_TOKEN}`,
      },
      payload: {
        title: { $gt: '' },
        content: 'x',
      },
    });

    expect(injectionResponse.statusCode).toBe(400);
    expect(injectionResponse.json().code).toBe('validation_error');

    await app.close();
  });

  it('rejects unexpected query parameters on protected routes', async () => {
    const config = createConfig();
    const app = await buildApp(config, { logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/daily-summaries?where[$ne]=1',
      headers: {
        authorization: `Bearer ${config.API_READ_TOKEN}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('validation_error');

    await app.close();
  });

  it('enforces strict CORS allowlist', async () => {
    const config = createConfig();
    const app = await buildApp(config, { logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'https://evil.example',
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('forbidden_origin');

    await app.close();
  });

  it('propagates request id headers', async () => {
    const app = await buildApp(createConfig(), { logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: {
        'x-request-id': 'test-request-id',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('test-request-id');

    await app.close();
  });

  it('enforces rate limiting', async () => {
    const config = createConfig({
      RATE_LIMIT_MAX: 2,
      RATE_LIMIT_WINDOW_MS: 60_000,
    });
    const app = await buildApp(config, { logger: false });

    await app.inject({ method: 'GET', url: '/health' });
    await app.inject({ method: 'GET', url: '/health' });
    const limited = await app.inject({ method: 'GET', url: '/health' });

    expect(limited.statusCode).toBe(429);
    expect(limited.json().code).toBe('rate_limited');
    expect(limited.headers['retry-after']).toBeDefined();

    await app.close();
  });

  it('does not expose stack traces in production errors', async () => {
    const failingRepo: DailySummaryRepository = {
      async list() {
        throw new Error('db connection leaked stack details');
      },
      async create() {
        throw new Error('db connection leaked stack details');
      },
    };
    const service = new DailySummaryService(failingRepo);
    const config = createConfig({ NODE_ENV: 'production' });
    const app = await buildApp(config, {
      logger: false,
      summaryService: service,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/daily-summaries',
      headers: {
        authorization: `Bearer ${config.API_READ_TOKEN}`,
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'internal_error',
      message: 'An internal error occurred',
    });
    expect(response.body).not.toContain('stack');
    expect(response.body).not.toContain('db connection leaked stack details');

    await app.close();
  });
});
