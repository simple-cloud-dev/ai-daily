import { describe, expect, it, vi } from 'vitest';

import type { DailySummaryRepository } from '../repositories/dailySummaryRepository.js';
import { DailySummaryService } from './dailySummaryService.js';

describe('DailySummaryService unit', () => {
  it('delegates list to repository', async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(async () => {
      throw new Error('not used');
    });
    const repository: DailySummaryRepository = { list, create };
    const service = new DailySummaryService(repository);

    await service.list();

    expect(list).toHaveBeenCalledTimes(1);
  });

  it('validates and normalizes create payload before repository call', async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(async () => ({
      id: '9b3e2f14-7aad-4e2e-8f41-5f04f72f7937',
      title: 'trimmed title',
      content: 'trimmed content',
      createdAt: '2026-02-16T00:00:00.000Z',
    }));
    const repository: DailySummaryRepository = { list, create };
    const service = new DailySummaryService(repository);

    await service.create({
      title: '  trimmed title  ',
      content: '  trimmed content  ',
    });

    expect(create).toHaveBeenCalledWith({
      title: 'trimmed title',
      content: 'trimmed content',
    });
  });

  it('rejects invalid payload without touching repository', async () => {
    const list = vi.fn(async () => []);
    const create = vi.fn(async () => {
      throw new Error('not used');
    });
    const repository: DailySummaryRepository = { list, create };
    const service = new DailySummaryService(repository);

    expect(() => service.create({ title: '', content: 'x' })).toThrowError();
    expect(create).not.toHaveBeenCalled();
  });
});
