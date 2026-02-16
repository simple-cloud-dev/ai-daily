import type { CreateDailySummaryInput, DailySummary } from '@ai-daily/types';
import { randomUUID } from 'node:crypto';

import type { DatabaseClient } from '../db/client.js';

export interface DailySummaryRepository {
  list(): Promise<readonly DailySummary[]>;
  create(input: CreateDailySummaryInput): Promise<DailySummary>;
}

export class InMemoryDailySummaryRepository implements DailySummaryRepository {
  private readonly store: DailySummary[] = [];

  constructor(private readonly db: DatabaseClient) {
    void this.db;
  }

  async list(): Promise<readonly DailySummary[]> {
    return this.store;
  }

  async create(input: CreateDailySummaryInput): Promise<DailySummary> {
    const record: DailySummary = {
      id: randomUUID(),
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
    };

    this.store.push(record);
    return record;
  }
}
