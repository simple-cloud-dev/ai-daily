import { describe, expect, it } from 'vitest';

import { CreateDailySummaryInputSchema } from './index.js';

describe('CreateDailySummaryInputSchema', () => {
  it('rejects empty title', () => {
    const result = CreateDailySummaryInputSchema.safeParse({
      title: '',
      content: 'valid',
    });

    expect(result.success).toBe(false);
  });
});
