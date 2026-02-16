import type { PrismaClient } from '@prisma/client';

import type {
  Digest,
  DigestLength,
  EngagementInput,
  SummaryDepth,
} from '@ai-daily/types';

import type { EmailService } from './emailService.js';
import { RankingService } from './rankingService.js';
import { SourceFetchersService } from './sourceFetchers.js';
import type { SummarizerService } from './summarizerService.js';

const lengthMap: Record<DigestLength, number> = {
  BRIEF: 5,
  STANDARD: 10,
  COMPREHENSIVE: 20,
};

export class DigestService {
  private readonly fetchers: SourceFetchersService;
  private readonly ranking: RankingService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly summarizer: SummarizerService,
    private readonly emailService: EmailService,
  ) {
    this.fetchers = new SourceFetchersService(prisma);
    this.ranking = new RankingService();
  }

  async generateForUser(userId: string, appBaseUrl: string): Promise<Digest> {
    const [user, keywords, preferences, deliveryEmail] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.userKeyword.findMany({ where: { userId } }),
      this.prisma.userPreferences.findUnique({ where: { userId } }),
      this.prisma.deliveryEmail.findFirst({ where: { userId, isPrimary: true } }),
    ]);

    const fetched = await this.fetchers.fetchForUser(userId);
    const deduped = this.ranking.dedupe(fetched);
    const ranked = this.ranking.rank(
      deduped,
      keywords.map((keyword) => keyword.keyword),
    );

    const itemLimit = lengthMap[preferences?.digestLength ?? 'STANDARD'];
    const summaryDepth = (preferences?.summaryDepth ?? 'SHORT') as SummaryDepth;
    const language = preferences?.language ?? 'en';

    const selected = ranked.slice(0, itemLimit);

    const digest = await this.prisma.digest.create({
      data: {
        userId,
        status: 'PENDING',
        generatedAt: new Date(),
      },
    });

    await Promise.all(
      selected.map(async (item) => {
        const summary = await this.summarizer.summarize({
          title: item.title,
          content: item.content,
          language,
          depth: summaryDepth,
        });

        return this.prisma.digestItem.create({
          data: {
            digestId: digest.id,
            sourceId: item.sourceId,
            title: item.title,
            url: item.url,
            sourceLabel: item.sourceLabel,
            summary,
            publishedAt: item.publishedAt,
            relevanceScore: item.score,
            topic: item.topic,
          },
        });
      }),
    );

    const result = await this.getDigestById(userId, digest.id);

    if (deliveryEmail) {
      await this.emailService.sendDigest({
        to: deliveryEmail.email,
        digest: result,
        userName: user.name,
        appBaseUrl,
      });

      await this.prisma.digest.update({
        where: { id: digest.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } else {
      await this.prisma.digest.update({
        where: { id: digest.id },
        data: {
          status: 'FAILED',
        },
      });
    }

    return this.getDigestById(userId, digest.id);
  }

  async listDigests(userId: string, query?: { search?: string }): Promise<readonly Digest[]> {
    const where = query?.search
      ? {
        userId,
        items: {
          some: {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { summary: { contains: query.search, mode: 'insensitive' as const } },
              { topic: { contains: query.search, mode: 'insensitive' as const } },
            ],
          },
        },
      }
      : { userId };

    const digests = await this.prisma.digest.findMany({
      where,
      include: {
        items: {
          orderBy: {
            relevanceScore: 'desc',
          },
          include: {
            bookmarks: {
              where: { userId },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    });

    return digests.map((digest) => ({
      id: digest.id,
      generatedAt: digest.generatedAt.toISOString(),
      sentAt: digest.sentAt?.toISOString() ?? null,
      status: digest.status,
      periodStart: digest.periodStart?.toISOString() ?? null,
      periodEnd: digest.periodEnd?.toISOString() ?? null,
      items: digest.items.map((item) => ({
        id: item.id,
        sourceId: item.sourceId,
        title: item.title,
        url: item.url,
        sourceLabel: item.sourceLabel,
        summary: item.summary,
        publishedAt: item.publishedAt.toISOString(),
        relevanceScore: item.relevanceScore,
        topic: item.topic,
        readAt: item.readAt?.toISOString() ?? null,
        isBookmarked: item.bookmarks.length > 0,
      })),
    }));
  }

  async getDigestById(userId: string, digestId: string): Promise<Digest> {
    const digest = await this.prisma.digest.findFirstOrThrow({
      where: {
        id: digestId,
        userId,
      },
      include: {
        items: {
          include: {
            bookmarks: {
              where: { userId },
              select: { id: true },
            },
          },
          orderBy: {
            relevanceScore: 'desc',
          },
        },
      },
    });

    return {
      id: digest.id,
      generatedAt: digest.generatedAt.toISOString(),
      sentAt: digest.sentAt?.toISOString() ?? null,
      status: digest.status,
      periodStart: digest.periodStart?.toISOString() ?? null,
      periodEnd: digest.periodEnd?.toISOString() ?? null,
      items: digest.items.map((item) => ({
        id: item.id,
        sourceId: item.sourceId,
        title: item.title,
        url: item.url,
        sourceLabel: item.sourceLabel,
        summary: item.summary,
        publishedAt: item.publishedAt.toISOString(),
        relevanceScore: item.relevanceScore,
        topic: item.topic,
        readAt: item.readAt?.toISOString() ?? null,
        isBookmarked: item.bookmarks.length > 0,
      })),
    };
  }

  async bookmarkItem(userId: string, digestItemId: string): Promise<void> {
    await this.prisma.bookmark.upsert({
      where: {
        userId_digestItemId: {
          userId,
          digestItemId,
        },
      },
      update: {},
      create: {
        userId,
        digestItemId,
      },
    });

    await this.prisma.engagementLog.create({
      data: {
        userId,
        digestItemId,
        action: 'BOOKMARK',
      },
    });
  }

  async unbookmarkItem(userId: string, digestItemId: string): Promise<void> {
    await this.prisma.bookmark.deleteMany({
      where: {
        userId,
        digestItemId,
      },
    });
  }

  async markRead(userId: string, digestItemId: string): Promise<void> {
    await this.prisma.digestItem.update({
      where: { id: digestItemId },
      data: { readAt: new Date() },
    });

    await this.prisma.engagementLog.create({
      data: {
        userId,
        digestItemId,
        action: 'READ',
      },
    });
  }

  async trackEngagement(userId: string, input: EngagementInput): Promise<void> {
    await this.prisma.engagementLog.create({
      data: {
        userId,
        digestItemId: input.digestItemId,
        action: input.action,
      },
    });
  }

  async analytics(userId: string): Promise<{
    readCount: number;
    bookmarkCount: number;
    topTopics: Array<{ topic: string; count: number }>;
    mostReadSources: Array<{ source: string; count: number }>;
    streakDays: number;
  }> {
    const [reads, bookmarks, topicRows, sourceRows] = await Promise.all([
      this.prisma.engagementLog.count({
        where: { userId, action: 'READ' },
      }),
      this.prisma.bookmark.count({ where: { userId } }),
      this.prisma.digestItem.groupBy({
        by: ['topic'],
        where: {
          digest: { userId },
          readAt: { not: null },
          topic: { not: null },
        },
        _count: { topic: true },
        orderBy: {
          _count: {
            topic: 'desc',
          },
        },
        take: 5,
      }),
      this.prisma.engagementLog.groupBy({
        by: ['digestItemId'],
        where: { userId, action: 'READ' },
        _count: { digestItemId: true },
        orderBy: {
          _count: {
            digestItemId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    const sourceLabelByDigestItemId = new Map(
      (
        await this.prisma.digestItem.findMany({
          where: {
            id: {
              in: sourceRows.map((row) => row.digestItemId),
            },
          },
          select: {
            id: true,
            sourceLabel: true,
          },
        })
      ).map((item) => [item.id, item.sourceLabel]),
    );

    const bySource = new Map<string, number>();
    for (const row of sourceRows) {
      const source = sourceLabelByDigestItemId.get(row.digestItemId) ?? 'Unknown';
      bySource.set(source, (bySource.get(source) ?? 0) + row._count.digestItemId);
    }

    const streakDays = await this.calculateReadStreak(userId);

    return {
      readCount: reads,
      bookmarkCount: bookmarks,
      topTopics: topicRows
        .filter((row) => row.topic)
        .map((row) => ({ topic: row.topic ?? 'Unknown', count: row._count.topic })),
      mostReadSources: [...bySource.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      streakDays,
    };
  }

  private async calculateReadStreak(userId: string): Promise<number> {
    const rows = await this.prisma.engagementLog.findMany({
      where: { userId, action: 'READ' },
      orderBy: { createdAt: 'desc' },
      take: 90,
      select: { createdAt: true },
    });

    const uniqueDays = new Set(rows.map((row) => row.createdAt.toISOString().slice(0, 10)));

    let streak = 0;
    const cursor = new Date();
    while (true) {
      const day = cursor.toISOString().slice(0, 10);
      if (!uniqueDays.has(day)) {
        break;
      }

      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }
}
