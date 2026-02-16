import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

export type AuthenticatedUser = {
  userId: string;
  email: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}

export const requireUserAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    await request.jwtVerify<AuthenticatedUser>();
    request.currentUser = request.user;
  } catch {
    reply.code(401).send({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
};
