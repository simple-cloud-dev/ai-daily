import { OAuth2Client } from 'google-auth-library';

import type { AppConfig } from '../config.js';

export type GoogleIdentity = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export class GoogleTokenVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly config: AppConfig) {
    this.client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    // Dev fallback token format: "dev-google:<email>:<name>"
    if (idToken.startsWith('dev-google:')) {
      const [, email, ...nameParts] = idToken.split(':');
      return {
        email,
        name: nameParts.length > 0 ? nameParts.join(':') : null,
        avatarUrl: null,
      };
    }

    if (!this.config.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new Error('Invalid Google token payload');
    }

    return {
      email: payload.email,
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    };
  }
}
