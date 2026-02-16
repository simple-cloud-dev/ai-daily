# AI Daily Digest

Full-stack monorepo for a personalized AI digest platform.

## What is implemented

- Fastify API + React frontend
- Prisma + PostgreSQL data model for users, preferences, sources, digests, bookmarks, and engagement
- Auth flows: signup, login, Google token login (dev token fallback), email verification token, password reset token, profile update, account deletion
- Preferences APIs: delivery emails, schedule/digest settings, source toggles, custom sources, keyword filters
- Digest pipeline: source fetching (RSS/custom), dedupe, keyword/freshness ranking, AI summarization fallback, digest persistence, email rendering/sending
- Scheduler: cron-based per-user digest triggering with timezone-aware checks
- In-app dashboard: onboarding, digest feed/search, bookmarks, read/share tracking, analytics cards
- Dockerfiles + compose for local deployment

## Monorepo layout

- `/apps/api` Fastify backend
- `/apps/web` React + Vite frontend (Tailwind)
- `/packages/types` shared contracts

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Configure env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Set `VITE_GOOGLE_CLIENT_ID` in `/apps/web/.env` to enable browser Google sign-in.

3. Start PostgreSQL (and optional Redis):

```bash
docker compose up -d postgres redis
```

4. Run Prisma migration + seed:

```bash
npm run prisma:migrate --workspace @ai-daily/api
npm run prisma:seed --workspace @ai-daily/api
```

5. Run API + web:

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Useful commands

```bash
npm run test
npm run typecheck
npm run lint --workspace @ai-daily/web
npm run prisma:generate --workspace @ai-daily/api
```

## Docker deployment (local)

```bash
docker compose up --build
```

Services:

- web: `http://localhost:3000`
- api: `http://localhost:4000`
- postgres: `localhost:5432`
- redis: `localhost:6379`

## API surface (new endpoints)

- Auth: `/auth/signup`, `/auth/login`, `/auth/google`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/logout`, `/me`
- Preferences: `/preferences`, `/preferences/delivery-emails`, `/preferences/sources`, `/preferences/custom-sources`, `/preferences/keywords`
- Digests: `/digests`, `/digests/generate`, `/bookmarks`, `/engagement`, `/analytics`
- Onboarding: `/onboarding/complete`

## Notes

- Google OAuth currently supports verified Google ID tokens and a `dev-google:<email>:<name>` token format for local testing.
- SMTP is optional. Without SMTP credentials, digest emails are logged in mock mode.
- Legacy `/daily-summaries` endpoints remain available.
