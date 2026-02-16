export interface DatabaseClient {
  query<T>(statement: string, params?: readonly unknown[]): Promise<readonly T[]>;
  execute(statement: string, params?: readonly unknown[]): Promise<void>;
}

export class InMemoryDatabaseClient implements DatabaseClient {
  async query<T>(_statement: string, _params?: readonly unknown[]): Promise<readonly T[]> {
    return [] as readonly T[];
  }

  async execute(_statement: string, _params?: readonly unknown[]): Promise<void> {
    return;
  }
}
