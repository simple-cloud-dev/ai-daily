import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppConfig } from '../config.js';
import { ForbiddenError, UnauthorizedError } from './errors.js';

export type AuthRole = 'reader' | 'writer';

declare module 'fastify' {
  interface FastifyRequest {
    authRole?: AuthRole;
  }
}

function parseBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export function authenticate(config: AppConfig): preHandlerHookHandler {
  return async (request: FastifyRequest): Promise<void> => {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedError('Missing or invalid bearer token');
    }

    if (token === config.API_WRITE_TOKEN) {
      request.authRole = 'writer';
      return;
    }

    if (token === config.API_READ_TOKEN) {
      request.authRole = 'reader';
      return;
    }

    throw new UnauthorizedError('Invalid bearer token');
  };
}

export function authorize(requiredRole: AuthRole): preHandlerHookHandler {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const role = request.authRole;

    if (!role) {
      throw new UnauthorizedError('Authentication required');
    }

    if (requiredRole === 'writer' && role !== 'writer') {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}
