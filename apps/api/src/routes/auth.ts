import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  AuthResponseSchema,
  GoogleAuthInputSchema,
  LoginInputSchema,
  SignupInputSchema,
} from '@ai-daily/types';

import { GoogleTokenVerifier } from '../auth/google.js';
import { requireUserAuth } from '../auth/jwt.js';
import { validateWithSchema } from '../security/validation.js';
import type { UserAccountService } from '../services/userAccountService.js';

const VerifyEmailSchema = z.object({ token: z.string().min(8) }).strict();
const ForgotPasswordSchema = z.object({ email: z.string().email() }).strict();
const ResetPasswordSchema = z
  .object({
    token: z.string().min(8),
    password: z.string().min(8).max(128),
  })
  .strict();

const UpdateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    email: z.string().email().optional(),
    timezone: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export async function registerAuthRoutes(
  app: FastifyInstance,
  service: UserAccountService,
): Promise<void> {
  const googleVerifier = new GoogleTokenVerifier(app.config);

  app.post('/auth/signup', async (request, reply) => {
    const body = validateWithSchema(SignupInputSchema, request.body, 'body');

    try {
      const result = await service.signup({
        ...body,
        timezone: body.timezone ?? 'UTC',
      });
      reply.setCookie('session', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: app.config.NODE_ENV === 'production',
        path: '/',
      });
      return AuthResponseSchema.parse(result);
    } catch (error) {
      reply.code(400).send({
        code: 'SIGNUP_FAILED',
        message: error instanceof Error ? error.message : 'Unable to sign up',
      });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const body = validateWithSchema(LoginInputSchema, request.body, 'body');

    try {
      const result = await service.login(body);
      reply.setCookie('session', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: app.config.NODE_ENV === 'production',
        path: '/',
      });
      return AuthResponseSchema.parse(result);
    } catch {
      reply.code(401).send({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
  });

  app.post('/auth/google', async (request, reply) => {
    const body = validateWithSchema(GoogleAuthInputSchema, request.body, 'body');

    try {
      const identity = await googleVerifier.verifyIdToken(body.idToken);
      const result = await service.loginWithGoogle(identity, body.timezone ?? 'UTC');
      reply.setCookie('session', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: app.config.NODE_ENV === 'production',
        path: '/',
      });
      return AuthResponseSchema.parse(result);
    } catch {
      reply.code(401).send({
        code: 'GOOGLE_AUTH_FAILED',
        message: 'Google sign-in failed',
      });
    }
  });

  app.post('/auth/verify-email', async (request, reply) => {
    const body = validateWithSchema(VerifyEmailSchema, request.body, 'body');

    try {
      await service.verifyEmail(body.token);
      return { status: 'ok' };
    } catch {
      reply.code(400).send({
        code: 'INVALID_TOKEN',
        message: 'Verification link is invalid or expired',
      });
    }
  });

  app.post('/auth/forgot-password', async (request) => {
    const body = validateWithSchema(ForgotPasswordSchema, request.body, 'body');
    await service.createPasswordReset(body.email);
    return { status: 'ok' };
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const body = validateWithSchema(ResetPasswordSchema, request.body, 'body');

    try {
      await service.resetPassword(body.token, body.password);
      return { status: 'ok' };
    } catch {
      reply.code(400).send({
        code: 'INVALID_TOKEN',
        message: 'Password reset token is invalid or expired',
      });
    }
  });

  app.get('/me', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      reply.code(404).send({ code: 'NOT_FOUND', message: 'User not found' });
      return;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailVerified: Boolean(user.emailVerified),
    };
  });

  app.patch('/me', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const body = validateWithSchema(UpdateProfileSchema, request.body, 'body');

    try {
      const user = await service.updateProfile(userId, body);
      return user;
    } catch {
      reply.code(400).send({ code: 'UPDATE_FAILED', message: 'Unable to update profile' });
    }
  });

  app.delete('/me', { preHandler: [requireUserAuth] }, async (request, reply) => {
    const userId = request.currentUser?.userId;
    if (!userId) {
      reply.code(401).send({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    await service.deleteAccount(userId);
    reply.clearCookie('session');
    return { status: 'ok' };
  });

  app.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('session', { path: '/' });
    return { status: 'ok' };
  });
}
