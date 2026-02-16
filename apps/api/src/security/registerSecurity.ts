import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AppConfig } from '../config.js';
import {
  ForbiddenOriginError,
  mapErrorToHttp,
  RateLimitedError,
} from './errors.js';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

function appendVary(reply: FastifyReply, value: string): void {
  const existing = reply.getHeader('Vary');
  if (!existing) {
    reply.header('Vary', value);
    return;
  }

  const existingValue = Array.isArray(existing) ? existing.join(', ') : String(existing);
  if (!existingValue.includes(value)) {
    reply.header('Vary', `${existingValue}, ${value}`);
  }
}

export function registerSecurity(app: FastifyInstance, config: AppConfig): void {
  const allowedOrigins = new Set(config.CORS_ALLOWED_ORIGINS);
  const rateLimitStore = new Map<string, RateLimitBucket>();

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const origin = request.headers.origin;
    if (origin) {
      if (!allowedOrigins.has(origin)) {
        throw new ForbiddenOriginError('Origin not allowed');
      }

      reply.header('Access-Control-Allow-Origin', origin);
      appendVary(reply, 'Origin');
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Authorization,Content-Type');
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Access-Control-Max-Age', '600');
    }

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
      return;
    }

    const now = Date.now();
    const bucketKey = `${request.ip}:${request.method}:${request.url.split('?')[0]}`;
    const bucket = rateLimitStore.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      rateLimitStore.set(bucketKey, {
        count: 1,
        resetAt: now + config.RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    bucket.count += 1;
    if (bucket.count > config.RATE_LIMIT_MAX) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      throw new RateLimitedError(retryAfterSeconds);
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=(), payment=()',
    );
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");

    if (config.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return payload;
  });

  app.setErrorHandler((error, request, reply) => {
    const isProduction = config.NODE_ENV === 'production';
    const mapped = mapErrorToHttp(error, isProduction);

    request.log.error(
      {
        err: error,
        code: mapped.body.code,
        statusCode: mapped.statusCode,
        requestId: request.id,
      },
      'request failed',
    );

    if (mapped.headers) {
      for (const [headerName, headerValue] of Object.entries(mapped.headers)) {
        reply.header(headerName, headerValue);
      }
    }

    reply.code(mapped.statusCode).send(mapped.body);
  });
}
