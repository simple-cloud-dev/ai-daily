import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

import { buildApp } from './app.js';
import type { AppConfig } from './config.js';
import { PostgresDatabaseClient } from './db/postgresClient.js';
import { SqlDailySummaryRepository } from './repositories/sqlDailySummaryRepository.js';
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

const describeIntegration =
  process.env.RUN_DOCKER_TESTS === '1' ? describe : describe.skip;

describeIntegration('Daily summaries API + Postgres integration', () => {
  const config = createConfig();
  let app: Awaited<ReturnType<typeof buildApp>> | null = null;
  let db: PostgresDatabaseClient | null = null;
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>> | null = null;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const pool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    db = new PostgresDatabaseClient(pool);
    const repository = new SqlDailySummaryRepository(db);
    await repository.initialize();
    const service = new DailySummaryService(repository);

    app = await buildApp(config, {
      logger: false,
      summaryService: service,
    });
  }, 120_000);

  beforeEach(async () => {
    if (!db) {
      throw new Error('Database client not initialized');
    }
    await db.execute('TRUNCATE TABLE daily_summaries');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (db) {
      await db.close();
    }
    if (container) {
      await container.stop();
    }
  });

  it('persists created records and returns them through list route', async () => {
    if (!app) {
      throw new Error('Application not initialized');
    }

    const createResponse = await app.inject({
      method: 'POST',
      url: '/daily-summaries',
      headers: {
        authorization: `Bearer ${config.API_WRITE_TOKEN}`,
      },
      payload: {
        title: 'Integration title',
        content: 'Integration content',
      },
    });

    expect(createResponse.statusCode).toBe(200);
    const created = createResponse.json();
    expect(created.title).toBe('Integration title');
    expect(created.content).toBe('Integration content');

    const listResponse = await app.inject({
      method: 'GET',
      url: '/daily-summaries',
      headers: {
        authorization: `Bearer ${config.API_READ_TOKEN}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual([created]);
  });

  it('returns unauthorized for protected routes without a token', async () => {
    if (!app) {
      throw new Error('Application not initialized');
    }

    const response = await app.inject({
      method: 'GET',
      url: '/daily-summaries',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('unauthorized');
  });
});
