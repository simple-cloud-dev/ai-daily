import nodemailer from 'nodemailer';

import type { Digest } from '@ai-daily/types';

import type { AppConfig } from '../config.js';
import { renderDigestEmailHtml } from '../templates/digestEmailTemplate.js';

export class EmailService {
  private readonly transporter;

  constructor(private readonly config: AppConfig) {
    if (config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USER && config.SMTP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASSWORD,
        },
      });
      return;
    }

    this.transporter = null;
  }

  async sendDigest(params: {
    to: string;
    digest: Digest;
    userName: string | null;
    appBaseUrl: string;
  }): Promise<void> {
    const html = renderDigestEmailHtml({
      digest: params.digest,
      userName: params.userName,
      preferencesUrl: `${params.appBaseUrl}/settings`,
      unsubscribeUrl: `${params.appBaseUrl}/settings?tab=delivery`,
    });

    if (!this.transporter) {
      // Safe fallback for local environments without SMTP credentials.
      console.info(`[email:mock] to=${params.to} items=${params.digest.items.length}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.RESEND_FROM_EMAIL,
      to: params.to,
      subject: `AI Daily Digest · ${new Date(params.digest.generatedAt).toLocaleDateString()}`,
      html,
    });
  }
}
