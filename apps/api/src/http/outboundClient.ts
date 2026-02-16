import { setTimeout as sleep } from 'node:timers/promises';

import {
  ExternalServiceTimeoutError,
  ExternalServiceUnavailableError,
} from '../security/errors.js';

type OutboundHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OutboundRequest = {
  url: string;
  method?: OutboundHttpMethod;
  headers?: HeadersInit;
  body?: BodyInit | null;
  requestId?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  expectOk?: boolean;
};

export type OutboundHttpClient = {
  request(input: OutboundRequest): Promise<Response>;
};

export type OutboundClientConfig = {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
};

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function isRetryableStatus(statusCode: number): boolean {
  return RETRYABLE_STATUS_CODES.has(statusCode);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export class FetchOutboundHttpClient implements OutboundHttpClient {
  constructor(private readonly config: OutboundClientConfig) {}

  async request(input: OutboundRequest): Promise<Response> {
    const timeoutMs = input.timeoutMs ?? this.config.timeoutMs;
    const maxRetries = input.maxRetries ?? this.config.maxRetries;
    const retryDelayMs = input.retryDelayMs ?? this.config.retryDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(input, timeoutMs);

        if (input.expectOk && !response.ok) {
          if (isRetryableStatus(response.status) && attempt < maxRetries) {
            await sleep(retryDelayMs * 2 ** attempt);
            continue;
          }

          throw new ExternalServiceUnavailableError(
            `Dependency returned status ${response.status}`,
          );
        }

        if (isRetryableStatus(response.status) && attempt < maxRetries) {
          await sleep(retryDelayMs * 2 ** attempt);
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof ExternalServiceUnavailableError) {
          throw error;
        }

        if (attempt >= maxRetries) {
          if (isTimeoutError(error)) {
            throw new ExternalServiceTimeoutError(
              `Dependency request timed out after ${timeoutMs}ms`,
            );
          }

          if (error instanceof Error) {
            throw new ExternalServiceUnavailableError(error.message);
          }

          throw new ExternalServiceUnavailableError('Dependency request failed');
        }

        await sleep(retryDelayMs * 2 ** attempt);
      }
    }

    throw new ExternalServiceUnavailableError('Dependency request failed');
  }

  private fetchWithTimeout(input: OutboundRequest, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    const headers = new Headers(input.headers);
    if (input.requestId) {
      headers.set('x-request-id', input.requestId);
    }

    return fetch(input.url, {
      method: input.method ?? 'GET',
      headers,
      body: input.body,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timer);
    });
  }
}
