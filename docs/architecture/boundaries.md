# Monorepo Boundaries

## Layering Rules

1. `apps/web` may depend on `packages/*` but never on `apps/api` internals.
2. `apps/api` may depend on `packages/*` but never on `apps/web` internals.
3. `packages/types` is the contract source of truth; both apps consume it.
4. `packages/config` and `packages/eslint-config` provide tooling-only shared config.

## Runtime Boundaries

- Web communicates with API over HTTP only.
- API exposes contract-validated JSON payloads.
- API database access is encapsulated in repository implementations.

## Enforcement

- ESLint `no-restricted-imports` in app configs blocks cross-app imports.
- TypeScript project boundaries and workspace package imports prevent deep coupling.
