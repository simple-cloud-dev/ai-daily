import { z } from 'zod';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
    MAX_REQUEST_SIZE_BYTES: z.coerce.number().int().min(1_024).default(1_048_576),
    OUTBOUND_HTTP_TIMEOUT_MS: z.coerce.number().int().min(100).default(2_000),
    OUTBOUND_HTTP_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
    OUTBOUND_HTTP_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(100),
    READINESS_DEPENDENCY_URL: z.string().url().optional(),
    SHUTDOWN_GRACE_PERIOD_MS: z.coerce.number().int().min(1000).default(10_000),
    API_READ_TOKEN: z.string().min(16).default('dev-read-token-change-me'),
    API_WRITE_TOKEN: z.string().min(16).default('dev-write-token-change-me'),
  })
  .transform((env) => ({
    ...env,
    CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  }))
  .superRefine((env, ctx) => {
    if (env.CORS_ALLOWED_ORIGINS.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ALLOWED_ORIGINS must contain at least one origin',
        path: ['CORS_ALLOWED_ORIGINS'],
      });
    }

    if (env.NODE_ENV === 'production') {
      if (env.API_READ_TOKEN === 'dev-read-token-change-me') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'API_READ_TOKEN must be set in production',
          path: ['API_READ_TOKEN'],
        });
      }
      if (env.API_WRITE_TOKEN === 'dev-write-token-change-me') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'API_WRITE_TOKEN must be set in production',
          path: ['API_WRITE_TOKEN'],
        });
      }
    }
  });

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(rawEnv: NodeJS.ProcessEnv = process.env): AppConfig {
  return EnvSchema.parse(rawEnv);
}
