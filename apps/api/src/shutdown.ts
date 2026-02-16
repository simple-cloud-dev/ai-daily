import type { FastifyInstance } from 'fastify';

import type { AppLifecycle } from './lifecycle.js';

type ShutdownControllerOptions = {
  gracePeriodMs: number;
  onExit?: (code: number) => void;
};

export type ShutdownController = {
  initiate(signal: NodeJS.Signals): Promise<void>;
};

export function createShutdownController(
  app: FastifyInstance,
  lifecycle: AppLifecycle,
  options: ShutdownControllerOptions,
): ShutdownController {
  const onExit = options.onExit ?? process.exit;
  let closePromise: Promise<void> | null = null;

  return {
    async initiate(signal: NodeJS.Signals): Promise<void> {
      if (closePromise) {
        return closePromise;
      }

      lifecycle.markShuttingDown();
      app.log.info(
        {
          signal,
          gracePeriodMs: options.gracePeriodMs,
        },
        'shutdown initiated',
      );

      const forcedExitTimer = setTimeout(() => {
        app.log.error('graceful shutdown timed out');
        onExit(1);
      }, options.gracePeriodMs);
      forcedExitTimer.unref();

      closePromise = app
        .close()
        .then(() => {
          clearTimeout(forcedExitTimer);
          app.log.info('shutdown complete');
          onExit(0);
        })
        .catch((error: unknown) => {
          clearTimeout(forcedExitTimer);
          app.log.error({ err: error }, 'shutdown failed');
          onExit(1);
        });

      return closePromise;
    },
  };
}

export function installShutdownSignalHandlers(
  shutdownController: ShutdownController,
  processRef: NodeJS.Process = process,
): void {
  processRef.once('SIGINT', () => {
    void shutdownController.initiate('SIGINT');
  });
  processRef.once('SIGTERM', () => {
    void shutdownController.initiate('SIGTERM');
  });
}
