import type { ZodType } from 'zod';

import { ValidationError } from './errors.js';

export function validateWithSchema<T>(
  schema: ZodType<T>,
  value: unknown,
  target: 'body' | 'query' | 'params',
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ValidationError(`Invalid ${target}`, result.error.issues);
  }

  return result.data;
}
