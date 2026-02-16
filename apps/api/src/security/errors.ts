import type { ZodIssue } from 'zod';

export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly details?: readonly ZodIssue[] | undefined,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly code = 'validation_error';
}

export class UnauthorizedError extends AppError {
  readonly code = 'unauthorized';
}

export class ForbiddenError extends AppError {
  readonly code = 'forbidden';
}

export class ForbiddenOriginError extends AppError {
  readonly code = 'forbidden_origin';
}

export class RateLimitedError extends AppError {
  readonly code = 'rate_limited';

  constructor(
    public readonly retryAfterSeconds: number,
    message = 'Too many requests',
  ) {
    super(message);
  }
}

export class ServiceNotReadyError extends AppError {
  readonly code = 'not_ready';
}

export class ExternalServiceTimeoutError extends AppError {
  readonly code = 'upstream_timeout';
}

export class ExternalServiceUnavailableError extends AppError {
  readonly code = 'upstream_unavailable';
}

type ErrorResponse = {
  statusCode: number;
  body: {
    code: string;
    message: string;
    details?: unknown;
  };
  headers?: Record<string, string>;
};

export function mapErrorToHttp(error: unknown, isProduction: boolean): ErrorResponse {
  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      body: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      statusCode: 401,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof ForbiddenError || error instanceof ForbiddenOriginError) {
    return {
      statusCode: 403,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof RateLimitedError) {
    return {
      statusCode: 429,
      body: {
        code: error.code,
        message: error.message,
      },
      headers: {
        'Retry-After': String(error.retryAfterSeconds),
      },
    };
  }

  if (error instanceof ServiceNotReadyError) {
    return {
      statusCode: 503,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof ExternalServiceTimeoutError) {
    return {
      statusCode: 504,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof ExternalServiceUnavailableError) {
    return {
      statusCode: 503,
      body: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof AppError) {
    return {
      statusCode: 500,
      body: {
        code: error.code,
        message: isProduction ? 'An internal error occurred' : error.message,
      },
    };
  }

  const fallbackMessage =
    isProduction || !(error instanceof Error) ? 'An internal error occurred' : error.message;
  return {
    statusCode: 500,
    body: {
      code: 'internal_error',
      message: fallbackMessage,
    },
  };
}
