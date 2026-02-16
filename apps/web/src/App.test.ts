import { describe, expect, it } from 'vitest';

import { HealthResponseSchema } from '@ai-daily/types';

describe('HealthResponseSchema', () => {
  it('accepts valid payload', () => {
    const result = HealthResponseSchema.safeParse({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });
});
