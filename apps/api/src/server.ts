import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createAppLifecycle } from './lifecycle.js';
import { createShutdownController, installShutdownSignalHandlers } from './shutdown.js';

const config = loadConfig();
const lifecycle = createAppLifecycle();
const app = await buildApp(config, { lifecycle });
const port = config.PORT;
const shutdownController = createShutdownController(app, lifecycle, {
  gracePeriodMs: config.SHUTDOWN_GRACE_PERIOD_MS,
});
installShutdownSignalHandlers(shutdownController);

app
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
