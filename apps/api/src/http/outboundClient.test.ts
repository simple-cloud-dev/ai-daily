import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FetchOutboundHttpClient,
} from './outboundClient.js';
import {
  ExternalServiceTimeoutError,
} from '../security/errors.js';

describe('FetchOutboundHttpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('retries retryable status codes and eventually succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new FetchOutboundHttpClient({
      timeoutMs: 500,
      maxRetries: 2,
      retryDelayMs: 0,
    });

    const response = await client.request({
      url: 'https://dependency.internal/ready',
      requestId: 'req-123',
      expectOk: true,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCallInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const requestHeaders = new Headers(firstCallInit?.headers);
    expect(requestHeaders.get('x-request-id')).toBe('req-123');
  });

  it('times out and fails after retries are exhausted', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new FetchOutboundHttpClient({
      timeoutMs: 10,
      maxRetries: 1,
      retryDelayMs: 0,
    });

    await expect(client.request({
      url: 'https://dependency.internal/slow',
      expectOk: true,
    })).rejects.toBeInstanceOf(ExternalServiceTimeoutError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
