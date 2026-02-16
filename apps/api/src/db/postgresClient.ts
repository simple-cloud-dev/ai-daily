import { Pool, type PoolConfig } from 'pg';

import type { DatabaseClient } from './client.js';

export class PostgresDatabaseClient implements DatabaseClient {
  constructor(private readonly pool: Pool) {}

  static fromConfig(config: PoolConfig): PostgresDatabaseClient {
    return new PostgresDatabaseClient(new Pool(config));
  }

  async query<T>(
    statement: string,
    params: readonly unknown[] = [],
  ): Promise<readonly T[]> {
    const result = await this.pool.query(statement, [...params]);
    return result.rows as readonly T[];
  }

  async execute(statement: string, params: readonly unknown[] = []): Promise<void> {
    await this.pool.query(statement, [...params]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
