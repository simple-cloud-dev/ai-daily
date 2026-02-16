import { randomUUID } from 'node:crypto';

import type { CreateDailySummaryInput, DailySummary } from '@ai-daily/types';

import type { DatabaseClient } from '../db/client.js';
import type { DailySummaryRepository } from './dailySummaryRepository.js';

type DailySummaryRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export class SqlDailySummaryRepository implements DailySummaryRepository {
  constructor(private readonly db: DatabaseClient) {}

  async initialize(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS daily_summaries (
        id UUID PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  async list(): Promise<readonly DailySummary[]> {
    const rows = await this.db.query<DailySummaryRow>(`
      SELECT id, title, content, created_at
      FROM daily_summaries
      ORDER BY created_at DESC, id DESC
    `);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  async create(input: CreateDailySummaryInput): Promise<DailySummary> {
    const record: DailySummary = {
      id: randomUUID(),
      title: input.title,
      content: input.content,
      createdAt: new Date().toISOString(),
    };

    await this.db.execute(
      `
        INSERT INTO daily_summaries (id, title, content, created_at)
        VALUES ($1, $2, $3, $4)
      `,
      [record.id, record.title, record.content, record.createdAt],
    );

    return record;
  }
}
