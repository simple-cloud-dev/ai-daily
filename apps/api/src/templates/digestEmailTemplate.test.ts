import { describe, expect, it } from 'vitest';

import { renderDigestEmailHtml } from './digestEmailTemplate.js';

describe('renderDigestEmailHtml', () => {
  it('includes digest items and links', () => {
    const html = renderDigestEmailHtml({
      userName: 'Test User',
      preferencesUrl: 'https://app.example.com/settings',
      unsubscribeUrl: 'https://app.example.com/unsub',
      digest: {
        id: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        sentAt: null,
        status: 'PENDING',
        periodStart: null,
        periodEnd: null,
        items: [
          {
            id: crypto.randomUUID(),
            sourceId: null,
            title: 'Item A',
            url: 'https://example.com/a',
            sourceLabel: 'Example',
            summary: 'Summary A',
            publishedAt: new Date().toISOString(),
            relevanceScore: 0.9,
            topic: null,
            readAt: null,
            isBookmarked: false,
          },
        ],
      },
    });

    expect(html).toContain('Item A');
    expect(html).toContain('Manage preferences');
    expect(html).toContain('https://example.com/a');
  });
});
