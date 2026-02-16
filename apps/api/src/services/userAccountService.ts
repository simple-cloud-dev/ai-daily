import type { PrismaClient } from '@prisma/client';

import type {
  AuthResponse,
  LoginInput,
  SignupInput,
} from '@ai-daily/types';

import type { FastifyInstance } from 'fastify';

import type { GoogleIdentity } from '../auth/google.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createOpaqueToken } from '../auth/tokens.js';

export class UserAccountService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly app: FastifyInstance,
  ) {}

  async signup(input: SignupInput): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        timezone: input.timezone,
      },
    });

    await this.initializeUserDefaults(user.id, user.email);
    await this.createEmailVerificationToken(user.id);

    return this.toAuthResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailVerified: Boolean(user.emailVerified),
    });
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const matches = await verifyPassword(input.password, user.passwordHash);
    if (!matches) {
      throw new Error('Invalid credentials');
    }

    return this.toAuthResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailVerified: Boolean(user.emailVerified),
    });
  }

  async loginWithGoogle(identity: GoogleIdentity, timezone: string): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: identity.email } });

    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          email: identity.email,
          name: identity.name,
          avatarUrl: identity.avatarUrl,
          timezone,
          emailVerified: new Date(),
        },
      }));

    await this.initializeUserDefaults(user.id, user.email);

    return this.toAuthResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailVerified: Boolean(user.emailVerified),
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const verification = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verification || verification.expiresAt < new Date()) {
      throw new Error('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: new Date() },
      }),
      this.prisma.deliveryEmail.updateMany({
        where: { userId: verification.userId },
        data: { isVerified: true },
      }),
      this.prisma.emailVerificationToken.delete({ where: { id: verification.id } }),
    ]);
  }

  async createPasswordReset(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return 'ok';
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    this.app.log.info({ email, token }, 'Password reset token created');
    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.expiresAt < new Date()) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: reset.id } }),
    ]);
  }

  async updateProfile(
    userId: string,
    payload: { name?: string; avatarUrl?: string | null; email?: string; timezone?: string },
  ): Promise<AuthResponse['user']> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: payload.name,
        avatarUrl: payload.avatarUrl,
        timezone: payload.timezone,
        email: payload.email,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      emailVerified: Boolean(user.emailVerified),
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  private async initializeUserDefaults(userId: string, email: string): Promise<void> {
    const [preferences, deliveryCount, defaultSources, userSourceCount] = await Promise.all([
      this.prisma.userPreferences.findUnique({ where: { userId } }),
      this.prisma.deliveryEmail.count({ where: { userId } }),
      this.prisma.source.findMany({ where: { isDefault: true }, select: { id: true } }),
      this.prisma.userSource.count({ where: { userId } }),
    ]);

    if (!preferences) {
      await this.prisma.userPreferences.create({
        data: {
          userId,
        },
      });
    }

    if (deliveryCount === 0) {
      await this.prisma.deliveryEmail.create({
        data: {
          userId,
          email,
          isPrimary: true,
          isVerified: false,
        },
      });
    }

    if (userSourceCount === 0 && defaultSources.length > 0) {
      await this.prisma.userSource.createMany({
        data: defaultSources.map((source) => ({
          userId,
          sourceId: source.id,
          isEnabled: true,
        })),
      });
    }
  }

  private async createEmailVerificationToken(userId: string): Promise<string> {
    const token = createOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    this.app.log.info({ userId, token }, 'Email verification token created');
    return token;
  }

  private toAuthResponse(user: AuthResponse['user']): AuthResponse {
    const token = this.app.jwt.sign({ userId: user.id, email: user.email });
    return {
      token,
      user,
    };
  }
}
