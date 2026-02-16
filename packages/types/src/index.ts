import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const DailySummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  createdAt: z.string().datetime(),
});

export type DailySummary = z.infer<typeof DailySummarySchema>;

export const DailySummaryListSchema = z.array(DailySummarySchema);
export type DailySummaryList = z.infer<typeof DailySummaryListSchema>;

export const CreateDailySummaryInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(10000),
  })
  .strict();

export type CreateDailySummaryInput = z.infer<typeof CreateDailySummaryInputSchema>;

export const FrequencySchema = z.enum(['DAILY', 'TWICE_DAILY', 'WEEKLY', 'WEEKDAY_ONLY']);
export const DigestLengthSchema = z.enum(['BRIEF', 'STANDARD', 'COMPREHENSIVE']);
export const SummaryDepthSchema = z.enum(['HEADLINES', 'SHORT', 'DETAILED']);
export const ContentFormatSchema = z.enum([
  'GROUPED_BY_SOURCE',
  'GROUPED_BY_TOPIC',
  'CHRONOLOGICAL',
  'RANKED_BY_RELEVANCE',
]);
export const SourceCategorySchema = z.enum([
  'WEB_NEWS',
  'SOCIAL_MEDIA',
  'RESEARCH_LABS',
  'CLOUD',
  'UNIVERSITIES',
  'CUSTOM',
]);
export const SourceTypeSchema = z.enum(['API', 'RSS', 'SCRAPE', 'KEYWORD']);

export type Frequency = z.infer<typeof FrequencySchema>;
export type DigestLength = z.infer<typeof DigestLengthSchema>;
export type SummaryDepth = z.infer<typeof SummaryDepthSchema>;
export type ContentFormat = z.infer<typeof ContentFormatSchema>;
export type SourceCategory = z.infer<typeof SourceCategorySchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    avatarUrl: z.string().url().nullable(),
    timezone: z.string(),
    emailVerified: z.boolean(),
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const SignupInputSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().trim().min(1).max(120).optional(),
    timezone: z.string().trim().min(1).max(120).default('UTC'),
  })
  .strict();

export type SignupInput = z.infer<typeof SignupInputSchema>;

export const LoginInputSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const GoogleAuthInputSchema = z
  .object({
    idToken: z.string().min(16),
    timezone: z.string().trim().min(1).max(120).default('UTC'),
  })
  .strict();

export type GoogleAuthInput = z.infer<typeof GoogleAuthInputSchema>;

export const DeliveryEmailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  isPrimary: z.boolean(),
  isVerified: z.boolean(),
  createdAt: z.string().datetime(),
});

export type DeliveryEmail = z.infer<typeof DeliveryEmailSchema>;

export const UserPreferencesSchema = z.object({
  frequency: FrequencySchema,
  deliveryTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string(),
  digestLength: DigestLengthSchema,
  summaryDepth: SummaryDepthSchema,
  contentFormat: ContentFormatSchema,
  language: z.string().min(2).max(32),
  inAppEnabled: z.boolean(),
  isPaused: z.boolean(),
  resumeDate: z.string().datetime().nullable(),
  weeklyDay: z.number().int().min(0).max(6).nullable(),
});

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UpdateUserPreferencesInputSchema = UserPreferencesSchema.partial().strict();
export type UpdateUserPreferencesInput = z.infer<typeof UpdateUserPreferencesInputSchema>;

export const SourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: SourceCategorySchema,
  type: SourceTypeSchema,
  url: z.string().url(),
  logoUrl: z.string().url().nullable(),
  isDefault: z.boolean(),
});

export type Source = z.infer<typeof SourceSchema>;

export const UserSourceSchema = z.object({
  sourceId: z.string().uuid(),
  isEnabled: z.boolean(),
});

export type UserSource = z.infer<typeof UserSourceSchema>;

export const CustomSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(140),
  type: z.enum(['RSS', 'URL', 'KEYWORD']),
  value: z.string().min(1).max(2000),
  isEnabled: z.boolean(),
});

export type CustomSource = z.infer<typeof CustomSourceSchema>;

export const UpsertCustomSourceInputSchema = z
  .object({
    name: z.string().min(1).max(140),
    type: z.enum(['RSS', 'URL', 'KEYWORD']),
    value: z.string().min(1).max(2000),
    isEnabled: z.boolean().default(true),
  })
  .strict();

export type UpsertCustomSourceInput = z.infer<typeof UpsertCustomSourceInputSchema>;

export const KeywordSchema = z.object({
  id: z.string().uuid(),
  keyword: z.string().min(1).max(120),
});

export type Keyword = z.infer<typeof KeywordSchema>;

export const DigestItemSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  title: z.string().min(1).max(300),
  url: z.string().url(),
  sourceLabel: z.string().min(1),
  summary: z.string().min(1),
  publishedAt: z.string().datetime(),
  relevanceScore: z.number(),
  topic: z.string().nullable(),
  readAt: z.string().datetime().nullable(),
  isBookmarked: z.boolean().default(false),
});

export type DigestItem = z.infer<typeof DigestItemSchema>;

export const DigestSchema = z.object({
  id: z.string().uuid(),
  generatedAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable(),
  status: z.enum(['PENDING', 'SENT', 'FAILED']),
  periodStart: z.string().datetime().nullable(),
  periodEnd: z.string().datetime().nullable(),
  items: z.array(DigestItemSchema),
});

export type Digest = z.infer<typeof DigestSchema>;

export const GenerateDigestInputSchema = z
  .object({
    userId: z.string().uuid().optional(),
    force: z.boolean().default(false),
  })
  .strict();

export type GenerateDigestInput = z.infer<typeof GenerateDigestInputSchema>;

export const BookmarkInputSchema = z
  .object({
    digestItemId: z.string().uuid(),
  })
  .strict();

export type BookmarkInput = z.infer<typeof BookmarkInputSchema>;

export const EngagementActionSchema = z.enum(['CLICK', 'BOOKMARK', 'SHARE', 'READ']);

export const EngagementInputSchema = z
  .object({
    digestItemId: z.string().uuid(),
    action: EngagementActionSchema,
  })
  .strict();

export type EngagementInput = z.infer<typeof EngagementInputSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
