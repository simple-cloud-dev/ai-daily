import { describe, expect, it } from 'vitest';

import { RankingService } from './rankingService.js';

describe('RankingService', () => {
  it('deduplicates by normalized title/url', () => {
    const service = new RankingService();
    const items = [
      {
        sourceId: '1',
        sourceLabel: 'Source',
        title: 'New LLM Release',
        url: 'https://example.com/post?utm_source=foo',
        content: 'Details',
        publishedAt: new Date(),
        topic: null,
      },
      {
        sourceId: '1',
        sourceLabel: 'Source',
        title: 'new llm release',
        url: 'https://example.com/post',
        content: 'Other details',
        publishedAt: new Date(),
        topic: null,
      },
    ];

    expect(service.dedupe(items)).toHaveLength(1);
  });

  it('ranks keyword matches higher', () => {
    const service = new RankingService();
    const now = new Date();
    const ranked = service.rank(
      [
        {
          sourceId: '1',
          sourceLabel: 'A',
          title: 'General AI',
          url: 'https://a.com',
          content: 'Generic',
          publishedAt: now,
          topic: null,
        },
        {
          sourceId: '2',
          sourceLabel: 'B',
          title: 'LLM breakthrough',
          url: 'https://b.com',
          content: 'Model update',
          publishedAt: now,
          topic: null,
        },
      ],
      ['LLM'],
    );

    expect(ranked[0]?.title).toBe('LLM breakthrough');
  });
});
