import { z } from 'zod';

import { AuthResponseSchema, DigestSchema } from '@ai-daily/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ai_daily_token';

const PreferencesBundleSchema = z.object({
  preferences: z.object({
    frequency: z.enum(['DAILY', 'TWICE_DAILY', 'WEEKLY', 'WEEKDAY_ONLY']),
    deliveryTime: z.string(),
    timezone: z.string(),
    digestLength: z.enum(['BRIEF', 'STANDARD', 'COMPREHENSIVE']),
    summaryDepth: z.enum(['HEADLINES', 'SHORT', 'DETAILED']),
    contentFormat: z.enum([
      'GROUPED_BY_SOURCE',
      'GROUPED_BY_TOPIC',
      'CHRONOLOGICAL',
      'RANKED_BY_RELEVANCE',
    ]),
    language: z.string(),
    inAppEnabled: z.boolean(),
    isPaused: z.boolean(),
    resumeDate: z.string().nullable(),
    weeklyDay: z.number().nullable(),
  }),
  deliveryEmails: z.array(
    z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      isPrimary: z.boolean(),
      isVerified: z.boolean(),
      createdAt: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string(),
      type: z.string(),
      url: z.string(),
      logoUrl: z.string().nullable(),
      isDefault: z.boolean(),
      isEnabled: z.boolean(),
    }),
  ),
  customSources: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(['RSS', 'URL', 'KEYWORD']),
      value: z.string(),
      isEnabled: z.boolean(),
    }),
  ),
  keywords: z.array(z.object({ id: z.string().uuid(), keyword: z.string() })),
});

export type PreferencesBundle = z.infer<typeof PreferencesBundleSchema>;

const AnalyticsSchema = z.object({
  readCount: z.number(),
  bookmarkCount: z.number(),
  topTopics: z.array(z.object({ topic: z.string(), count: z.number() })),
  mostReadSources: z.array(z.object({ source: z.string(), count: z.number() })),
  streakDays: z.number(),
});

export type Analytics = z.infer<typeof AnalyticsSchema>;

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  });

  const payload: unknown = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: string }).message)
        : 'Request failed';
    throw new Error(message);
  }

  return schema ? schema.parse(payload) : (payload as T);
}

export const api = {
  auth: {
    async signup(input: { email: string; password: string; name?: string; timezone: string }) {
      const data = await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(input),
      }, AuthResponseSchema);
      setToken(data.token);
      return data;
    },
    async login(input: { email: string; password: string }) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      }, AuthResponseSchema);
      setToken(data.token);
      return data;
    },
    async loginGoogle(idToken: string, timezone: string) {
      const data = await request('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken, timezone }),
      }, AuthResponseSchema);
      setToken(data.token);
      return data;
    },
    async me() {
      return request('/me');
    },
    async updateProfile(input: {
      name?: string;
      avatarUrl?: string | null;
      email?: string;
      timezone?: string;
    }) {
      return request('/me', { method: 'PATCH', body: JSON.stringify(input) });
    },
    async logout() {
      await request('/auth/logout', { method: 'POST' });
      clearToken();
    },
  },
  preferences: {
    get() {
      return request('/preferences', {}, PreferencesBundleSchema);
    },
    update(input: Partial<PreferencesBundle['preferences']>) {
      return request('/preferences', { method: 'PATCH', body: JSON.stringify(input) });
    },
    addKeyword(keyword: string) {
      return request('/preferences/keywords', {
        method: 'POST',
        body: JSON.stringify({ keyword }),
      });
    },
    removeKeyword(id: string) {
      return request(`/preferences/keywords/${id}`, { method: 'DELETE' });
    },
    toggleSource(sourceId: string, isEnabled: boolean) {
      return request('/preferences/sources', {
        method: 'PATCH',
        body: JSON.stringify({ sourceId, isEnabled }),
      });
    },
    addCustomSource(input: { name: string; type: 'RSS' | 'URL' | 'KEYWORD'; value: string }) {
      return request('/preferences/custom-sources', {
        method: 'POST',
        body: JSON.stringify({ ...input, isEnabled: true }),
      });
    },
    addDeliveryEmail(email: string) {
      return request('/preferences/delivery-emails', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    setPrimaryDeliveryEmail(id: string) {
      return request(`/preferences/delivery-emails/${id}/primary`, { method: 'POST' });
    },
  },
  digests: {
    list(search?: string) {
      return request(`/digests${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, z.array(DigestSchema));
    },
    generate() {
      return request('/digests/generate', { method: 'POST' }, DigestSchema);
    },
    bookmark(digestItemId: string) {
      return request('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ digestItemId }),
      });
    },
    unbookmark(digestItemId: string) {
      return request(`/bookmarks/${digestItemId}`, { method: 'DELETE' });
    },
    markRead(digestItemId: string) {
      return request(`/digests/items/${digestItemId}/read`, { method: 'POST' });
    },
    track(action: 'CLICK' | 'BOOKMARK' | 'SHARE' | 'READ', digestItemId: string) {
      return request('/engagement', {
        method: 'POST',
        body: JSON.stringify({ action, digestItemId }),
      });
    },
  },
  onboarding: {
    complete(input: {
      topics: string[];
      sourceIds: string[];
      frequency: 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'WEEKDAY_ONLY';
      deliveryTime: string;
      timezone: string;
      deliveryEmail: string;
      sendSampleDigest: boolean;
    }) {
      return request('/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
  },
  analytics: {
    get() {
      return request('/analytics', {}, AnalyticsSchema);
    },
  },
};
