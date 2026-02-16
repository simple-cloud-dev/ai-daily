import {
  type CreateDailySummaryInput,
  type DailySummary,
  CreateDailySummaryInputSchema,
} from '@ai-daily/types';

import type { DailySummaryRepository } from '../repositories/dailySummaryRepository.js';

export class DailySummaryService {
  constructor(private readonly repository: DailySummaryRepository) {}

  list(): Promise<readonly DailySummary[]> {
    return this.repository.list();
  }

  create(input: unknown): Promise<DailySummary> {
    const parsed: CreateDailySummaryInput = CreateDailySummaryInputSchema.parse(input);
    return this.repository.create(parsed);
  }
}
