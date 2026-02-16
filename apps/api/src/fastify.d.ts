import type { PrismaClient } from '@prisma/client';

import type { AppConfig } from './config.js';
import type { DigestService } from './services/digestService.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    prisma: PrismaClient;
    digestService: DigestService;
  }
}
