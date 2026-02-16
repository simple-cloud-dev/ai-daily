# AI Daily Monorepo

## Structure

- `apps/web`: React + Vite frontend
- `apps/api`: Fastify API
- `packages/types`: shared API contracts and domain types (Zod + inferred TS types)
- `packages/config`: shared TypeScript config
- `packages/eslint-config`: shared lint config
- `docs/architecture`: system boundaries and integration approach
- `docs/adr`: architecture decision records

## Commands

- `npm install`
- `npm run dev` starts web (`:3000`) and api (`:4000`) in watch mode
- `npm run build` builds all workspaces in dependency order
- `npm run test` runs all tests
- `npm run test:smoke` runs fast smoke checks used as CI entry gate
- `npm run test:integration` runs API route + Postgres integration tests (Docker required)
- `npm run test:e2e` runs Playwright smoke against running API + web servers
- `npm run lint` runs all lint checks
- `npm run typecheck` runs TypeScript checks

## API Contract-First Workflow

1. Define/modify runtime schemas in `packages/types/src/index.ts`.
2. Consume inferred TypeScript types from the same package.
3. Validate API request/response payloads in `apps/api` route/service layers.
4. Parse API responses in `apps/web` before rendering.

## DB Layer Approach

- Route handlers call services.
- Services call repository interfaces.
- Repository implementations depend on a `DatabaseClient` abstraction.
- Swap `InMemoryDatabaseClient` with a real client (e.g., Postgres) without changing routes/services.

See `docs/architecture/boundaries.md` and ADRs for details.
