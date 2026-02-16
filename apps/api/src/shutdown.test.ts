import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { createAppLifecycle } from './lifecycle.js';
import { createShutdownController } from './shutdown.js';

function createTestApp(closeImpl?: () => Promise<void>): FastifyInstance {
  return {
    close: vi.fn(closeImpl ?? (() => Promise.resolve())),
    log: {
      info: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as FastifyInstance;
}

describe('createShutdownController', () => {
  it('marks app as draining and closes only once', async () => {
    const app = createTestApp();
    const lifecycle = createAppLifecycle();
    const onExit = vi.fn();
    const shutdown = createShutdownController(app, lifecycle, {
      gracePeriodMs: 500,
      onExit,
    });

    await shutdown.initiate('SIGTERM');
    await shutdown.initiate('SIGINT');

    expect(lifecycle.isShuttingDown()).toBe(true);
    expect(app.close).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledWith(0);
  });

  it('forces process exit when graceful shutdown exceeds timeout', async () => {
    vi.useFakeTimers();

    const app = createTestApp(
      () =>
        new Promise<void>(() => {
          // Intentionally never resolves.
        }),
    );
    const lifecycle = createAppLifecycle();
    const onExit = vi.fn();
    const shutdown = createShutdownController(app, lifecycle, {
      gracePeriodMs: 50,
      onExit,
    });

    void shutdown.initiate('SIGTERM');
    await vi.advanceTimersByTimeAsync(50);

    expect(onExit).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });
});
