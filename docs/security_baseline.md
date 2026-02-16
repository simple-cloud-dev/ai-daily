# Security Baseline

This document describes the security controls implemented for the API in `apps/api`.

## 1. Runtime Config Validation

- Startup config is validated with Zod in `/Users/ajaydhanesh/github/ai-daily/apps/api/src/config.ts`.
- Invalid or missing critical settings fail fast at boot.
- Production guardrails require non-default auth tokens.

Validated settings include:
- `NODE_ENV`, `PORT`
- `CORS_ALLOWED_ORIGINS`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- `MAX_REQUEST_SIZE_BYTES`
- `API_READ_TOKEN`, `API_WRITE_TOKEN`

## 2. Authentication and Authorization

Recommended approach for this app: stateless bearer-token auth (service-to-service/API access).

Why:
- Simple, explicit, and auditable for a backend API.
- Avoids cookie session state and CSRF token complexity.
- Works well with gateway/secret-manager token rotation.

Implemented controls:
- `Authorization: Bearer <token>` required for `/daily-summaries`.
- Role model:
  - `reader`: read-only access (`GET /daily-summaries`)
  - `writer`: read/write access (`POST /daily-summaries`)
- Write endpoints enforce explicit authorization checks; read tokens cannot bypass writes.

Files:
- `/Users/ajaydhanesh/github/ai-daily/apps/api/src/security/auth.ts`
- `/Users/ajaydhanesh/github/ai-daily/apps/api/src/routes/dailySummaries.ts`

## 3. Input Validation (All Routes)

All routes now use explicit Zod validation:
- `/health`: strict empty query schema
- `GET /daily-summaries`: strict empty query schema
- `POST /daily-summaries`: strict body schema with length limits

Validation failures return `400` with `code=validation_error`.

Files:
- `/Users/ajaydhanesh/github/ai-daily/apps/api/src/security/validation.ts`
- `/Users/ajaydhanesh/github/ai-daily/apps/api/src/routes/health.ts`
- `/Users/ajaydhanesh/github/ai-daily/apps/api/src/routes/dailySummaries.ts`
- `/Users/ajaydhanesh/github/ai-daily/packages/types/src/index.ts`

## 4. HTTP Hardening

Implemented global hardening in `/Users/ajaydhanesh/github/ai-daily/apps/api/src/security/registerSecurity.ts`:

- Secure headers:
  - `Content-Security-Policy: default-src 'none'...`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Cross-Origin-Resource-Policy`
  - `Strict-Transport-Security` (production)
- Strict CORS:
  - Explicit origin allowlist from config
  - Rejected unknown origins (`403 forbidden_origin`)
  - Limited methods/headers and explicit preflight handling
- Request body size limits:
  - Enforced by Fastify `bodyLimit` from `MAX_REQUEST_SIZE_BYTES`

## 5. Rate Limiting

Implemented in-memory IP+method+path window limiter:
- Configurable by `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX`
- Exceeding limits returns `429 rate_limited`
- Includes `Retry-After` header

Note: in-memory storage is acceptable for this baseline. For multi-instance deployments, replace with a shared store (Redis).

## 6. Safe Error Handling

Centralized error handler enforces safe responses:
- Known app errors return controlled status/code/message.
- Unknown errors return:
  - production: `500 internal_error` with generic message
  - non-production: error message for debugging
- No stack traces are sent to clients in production.

## 7. CSRF Position

Current auth model uses bearer tokens in the `Authorization` header (not cookie sessions), so CSRF protection is not required in this baseline.

If the app moves to cookie-based sessions:
- Add CSRF tokens (synchronizer token or double-submit cookie).
- Enforce `SameSite=Lax/Strict`, `HttpOnly`, and `Secure` cookies.
- Keep origin checks and CORS restrictions.

## 8. Security Tests Added

Negative and security-focused tests are in:
- `/Users/ajaydhanesh/github/ai-daily/apps/api/src/app.security.test.ts`

Coverage includes:
- Unauthenticated requests denied (`401`)
- Authz bypass blocked (read token cannot write, `403`)
- Validation failures (`400`) including injection-shaped payloads
- Query injection-style input rejected
- Strict CORS enforcement (`403`)
- Rate limiting (`429`)
- Production errors do not expose stack/internal details (`500`)
