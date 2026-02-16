import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { startDigestScheduler } from './jobs/digestScheduler.js';
import { createAppLifecycle } from './lifecycle.js';
import { createShutdownController, installShutdownSignalHandlers } from './shutdown.js';

const config = loadConfig();
const lifecycle = createAppLifecycle();
const app = await buildApp(config, { lifecycle });
const port = config.PORT;
const scheduler = startDigestScheduler({
  config,
  prisma: app.prisma,
  digestService: app.digestService,
  appBaseUrl: config.CORS_ALLOWED_ORIGINS[0] ?? 'http://localhost:5173',
  logger: app.log,
});
const shutdownController = createShutdownController(app, lifecycle, {
  gracePeriodMs: config.SHUTDOWN_GRACE_PERIOD_MS,
});
installShutdownSignalHandlers(shutdownController);

app.addHook('onClose', async () => {
  await scheduler?.stop();
  await app.prisma.$disconnect();
});

void app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(
      {
        port,
      },
      'API listening',
    );
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
