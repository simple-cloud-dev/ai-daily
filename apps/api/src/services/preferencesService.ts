import {
  ContentFormat,
  CustomSourceType,
  DigestLength,
  Frequency,
  SummaryDepth,
  type PrismaClient,
} from '@prisma/client';

import type {
  CustomSource,
  UpsertCustomSourceInput,
  UserPreferences,
  UpdateUserPreferencesInput,
} from '@ai-daily/types';

const frequencyMap: Record<NonNullable<UpdateUserPreferencesInput['frequency']>, Frequency> = {
  DAILY: Frequency.DAILY,
  TWICE_DAILY: Frequency.TWICE_DAILY,
  WEEKLY: Frequency.WEEKLY,
  WEEKDAY_ONLY: Frequency.WEEKDAY_ONLY,
};

const digestLengthMap: Record<NonNullable<UpdateUserPreferencesInput['digestLength']>, DigestLength> = {
  BRIEF: DigestLength.BRIEF,
  STANDARD: DigestLength.STANDARD,
  COMPREHENSIVE: DigestLength.COMPREHENSIVE,
};

const summaryDepthMap: Record<NonNullable<UpdateUserPreferencesInput['summaryDepth']>, SummaryDepth> = {
  HEADLINES: SummaryDepth.HEADLINES,
  SHORT: SummaryDepth.SHORT,
  DETAILED: SummaryDepth.DETAILED,
};

const contentFormatMap: Record<NonNullable<UpdateUserPreferencesInput['contentFormat']>, ContentFormat> = {
  GROUPED_BY_SOURCE: ContentFormat.GROUPED_BY_SOURCE,
  GROUPED_BY_TOPIC: ContentFormat.GROUPED_BY_TOPIC,
  CHRONOLOGICAL: ContentFormat.CHRONOLOGICAL,
  RANKED_BY_RELEVANCE: ContentFormat.RANKED_BY_RELEVANCE,
};

const customTypeMap: Record<UpsertCustomSourceInput['type'], CustomSourceType> = {
  RSS: CustomSourceType.RSS,
  URL: CustomSourceType.URL,
  KEYWORD: CustomSourceType.KEYWORD,
};

export class PreferencesService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { preferences: true },
    });

    const preferences =
      user.preferences ??
      (await this.prisma.userPreferences.create({
        data: { userId },
      }));

    return {
      frequency: preferences.frequency,
      deliveryTime: preferences.deliveryTime,
      timezone: user.timezone,
      digestLength: preferences.digestLength,
      summaryDepth: preferences.summaryDepth,
      contentFormat: preferences.contentFormat,
      language: preferences.language,
      inAppEnabled: preferences.inAppEnabled,
      isPaused: preferences.isPaused,
      resumeDate: preferences.resumeDate?.toISOString() ?? null,
      weeklyDay: preferences.weeklyDay,
    };
  }

  async updatePreferences(
    userId: string,
    input: UpdateUserPreferencesInput,
  ): Promise<UserPreferences> {
    await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        frequency: input.frequency ? frequencyMap[input.frequency] : undefined,
        deliveryTime: input.deliveryTime,
        digestLength: input.digestLength ? digestLengthMap[input.digestLength] : undefined,
        summaryDepth: input.summaryDepth ? summaryDepthMap[input.summaryDepth] : undefined,
        contentFormat: input.contentFormat ? contentFormatMap[input.contentFormat] : undefined,
        language: input.language,
        inAppEnabled: input.inAppEnabled,
        isPaused: input.isPaused,
        resumeDate: input.resumeDate ? new Date(input.resumeDate) : undefined,
        weeklyDay: input.weeklyDay,
      },
      create: {
        userId,
        frequency: input.frequency ? frequencyMap[input.frequency] : Frequency.DAILY,
        deliveryTime: input.deliveryTime ?? '08:00',
        digestLength: input.digestLength
          ? digestLengthMap[input.digestLength]
          : DigestLength.STANDARD,
        summaryDepth: input.summaryDepth ? summaryDepthMap[input.summaryDepth] : SummaryDepth.SHORT,
        contentFormat: input.contentFormat
          ? contentFormatMap[input.contentFormat]
          : ContentFormat.GROUPED_BY_TOPIC,
        language: input.language ?? 'en',
        inAppEnabled: input.inAppEnabled ?? true,
        isPaused: input.isPaused ?? false,
        resumeDate: input.resumeDate ? new Date(input.resumeDate) : null,
        weeklyDay: input.weeklyDay,
      },
    });

    if (input.timezone) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { timezone: input.timezone },
      });
    }

    return this.getPreferences(userId);
  }

  async listDeliveryEmails(userId: string) {
    const emails = await this.prisma.deliveryEmail.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return emails.map((email) => ({
      id: email.id,
      email: email.email,
      isPrimary: email.isPrimary,
      isVerified: email.isVerified,
      createdAt: email.createdAt.toISOString(),
    }));
  }

  async addDeliveryEmail(userId: string, email: string) {
    const count = await this.prisma.deliveryEmail.count({ where: { userId } });
    const created = await this.prisma.deliveryEmail.create({
      data: {
        userId,
        email,
        isPrimary: count === 0,
      },
    });

    return {
      id: created.id,
      email: created.email,
      isPrimary: created.isPrimary,
      isVerified: created.isVerified,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async setPrimaryDeliveryEmail(userId: string, emailId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.deliveryEmail.updateMany({
        where: { userId },
        data: { isPrimary: false },
      }),
      this.prisma.deliveryEmail.updateMany({
        where: { id: emailId, userId },
        data: { isPrimary: true },
      }),
    ]);
  }

  async deleteDeliveryEmail(userId: string, emailId: string): Promise<void> {
    await this.prisma.deliveryEmail.deleteMany({
      where: {
        id: emailId,
        userId,
      },
    });

    const primary = await this.prisma.deliveryEmail.findFirst({
      where: { userId, isPrimary: true },
    });

    if (!primary) {
      const first = await this.prisma.deliveryEmail.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (first) {
        await this.prisma.deliveryEmail.update({
          where: { id: first.id },
          data: { isPrimary: true },
        });
      }
    }
  }

  async listSources(userId: string) {
    const [sources, userSources] = await Promise.all([
      this.prisma.source.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      this.prisma.userSource.findMany({ where: { userId } }),
    ]);

    const selectedMap = new Map(userSources.map((item) => [item.sourceId, item.isEnabled]));

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      category: source.category,
      type: source.type,
      url: source.url,
      logoUrl: source.logoUrl,
      isDefault: source.isDefault,
      isEnabled: selectedMap.get(source.id) ?? source.isDefault,
    }));
  }

  async updateSourceSelection(userId: string, sourceId: string, isEnabled: boolean): Promise<void> {
    await this.prisma.userSource.upsert({
      where: {
        userId_sourceId: { userId, sourceId },
      },
      update: { isEnabled },
      create: { userId, sourceId, isEnabled },
    });
  }

  async listCustomSources(userId: string): Promise<readonly CustomSource[]> {
    const items = await this.prisma.customSource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      value: item.value,
      isEnabled: item.isEnabled,
    }));
  }

  async upsertCustomSource(
    userId: string,
    input: UpsertCustomSourceInput,
    customSourceId?: string,
  ): Promise<CustomSource> {
    if (customSourceId) {
      const existing = await this.prisma.customSource.findFirstOrThrow({
        where: { id: customSourceId, userId },
      });
      const updated = await this.prisma.customSource.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          type: customTypeMap[input.type],
          value: input.value,
          isEnabled: input.isEnabled,
        },
      });

      return {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        value: updated.value,
        isEnabled: updated.isEnabled,
      };
    }

    const created = await this.prisma.customSource.create({
      data: {
        userId,
        name: input.name,
        type: customTypeMap[input.type],
        value: input.value,
        isEnabled: input.isEnabled,
      },
    });

    return {
      id: created.id,
      name: created.name,
      type: created.type,
      value: created.value,
      isEnabled: created.isEnabled,
    };
  }

  async deleteCustomSource(userId: string, customSourceId: string): Promise<void> {
    await this.prisma.customSource.deleteMany({ where: { id: customSourceId, userId } });
  }

  async listKeywords(userId: string) {
    const keywords = await this.prisma.userKeyword.findMany({
      where: { userId },
      orderBy: { keyword: 'asc' },
    });

    return keywords.map((keyword) => ({
      id: keyword.id,
      keyword: keyword.keyword,
    }));
  }

  async addKeyword(userId: string, keyword: string) {
    const created = await this.prisma.userKeyword.upsert({
      where: {
        userId_keyword: {
          userId,
          keyword,
        },
      },
      update: {
        keyword,
      },
      create: {
        userId,
        keyword,
      },
    });

    return {
      id: created.id,
      keyword: created.keyword,
    };
  }

  async deleteKeyword(userId: string, keywordId: string): Promise<void> {
    await this.prisma.userKeyword.deleteMany({ where: { id: keywordId, userId } });
  }
}
