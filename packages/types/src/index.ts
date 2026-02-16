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

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
