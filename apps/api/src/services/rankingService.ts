import type { FetchedContent } from './sourceFetchers.js';

export class RankingService {
  dedupe(items: readonly FetchedContent[]): readonly FetchedContent[] {
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = `${item.title.toLowerCase().trim()}|${this.normalizeUrl(item.url)}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  rank(items: readonly FetchedContent[], keywords: readonly string[]): Array<FetchedContent & { score: number }> {
    const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

    return [...items]
      .map((item) => {
        const text = `${item.title} ${item.content}`.toLowerCase();
        const keywordScore = normalizedKeywords.reduce((score, keyword) => {
          return score + (text.includes(keyword) ? 1 : 0);
        }, 0);
        const freshnessHours = Math.max(
          1,
          (Date.now() - item.publishedAt.getTime()) / (1000 * 60 * 60),
        );
        const freshnessScore = Math.max(0, 24 - freshnessHours) / 24;

        return {
          ...item,
          score: keywordScore * 0.7 + freshnessScore * 0.3,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      if (parsed.searchParams.has('utm_source')) parsed.searchParams.delete('utm_source');
      if (parsed.searchParams.has('utm_medium')) parsed.searchParams.delete('utm_medium');
      return parsed.toString();
    } catch {
      return url;
    }
  }
}
