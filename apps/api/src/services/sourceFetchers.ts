import Parser from 'rss-parser';

import type { PrismaClient } from '@prisma/client';

type FetchedContent = {
  sourceId: string | null;
  sourceLabel: string;
  title: string;
  url: string;
  content: string;
  publishedAt: Date;
  topic: string | null;
};

const rssParser = new Parser();

function extractTopic(title: string): string | null {
  const lowered = title.toLowerCase();
  if (lowered.includes('llm') || lowered.includes('language model')) return 'LLM';
  if (lowered.includes('vision')) return 'Computer Vision';
  if (lowered.includes('robot')) return 'Robotics';
  if (lowered.includes('regulation') || lowered.includes('policy')) return 'AI Policy';
  if (lowered.includes('agent')) return 'Agents';
  return null;
}

export class SourceFetchersService {
  constructor(private readonly prisma: PrismaClient) {}

  async fetchForUser(userId: string): Promise<readonly FetchedContent[]> {
    const [selectedSources, customSources] = await Promise.all([
      this.prisma.userSource.findMany({
        where: { userId, isEnabled: true },
        include: { source: true },
      }),
      this.prisma.customSource.findMany({
        where: { userId, isEnabled: true },
      }),
    ]);

    const rssUrls = [
      ...selectedSources
        .filter((item) => item.source.type === 'RSS')
        .map((item) => ({
          sourceId: item.sourceId,
          sourceLabel: item.source.name,
          url: item.source.url,
        })),
      ...customSources
        .filter((source) => source.type === 'RSS' || source.type === 'URL')
        .map((source) => ({
          sourceId: null,
          sourceLabel: source.name,
          url: source.value,
        })),
    ];

    const all = await Promise.all(
      rssUrls.map(async (source) => {
        try {
          const feed = await rssParser.parseURL(source.url);
          return (feed.items ?? []).slice(0, 15).flatMap((item) => {
            if (!item.link || !item.title) {
              return [];
            }

            const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

            return [
              {
                sourceId: source.sourceId,
                sourceLabel: source.sourceLabel,
                title: item.title,
                url: item.link,
                content:
                  item.contentSnippet ??
                  item.content ??
                  item.summary ??
                  item.title,
                publishedAt,
                topic: extractTopic(item.title),
              },
            ];
          });
        } catch {
          return [];
        }
      }),
    );

    const customKeywordItems = customSources
      .filter((source) => source.type === 'KEYWORD')
      .map((source) => ({
        sourceId: null,
        sourceLabel: source.name,
        title: `Keyword watch: ${source.value}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(source.value)}`,
        content: `Track new mentions and updates for ${source.value}.`,
        publishedAt: new Date(),
        topic: source.value,
      }));

    return [...all.flat(), ...customKeywordItems];
  }
}

export type { FetchedContent };
