import { describe, expect, it } from 'vitest';

import { DailySummaryService } from './services/dailySummaryService.js';
import {
  InMemoryDailySummaryRepository,
} from './repositories/dailySummaryRepository.js';
import { InMemoryDatabaseClient } from './db/client.js';

describe('DailySummaryService', () => {
  it('creates and lists summaries', async () => {
    const db = new InMemoryDatabaseClient();
    const repo = new InMemoryDailySummaryRepository(db);
    const service = new DailySummaryService(repo);

    await service.create({ title: 'T', content: 'C' });
    const all = await service.list();

    expect(all.length).toBe(1);
    expect(all[0]?.title).toBe('T');
  });
});
