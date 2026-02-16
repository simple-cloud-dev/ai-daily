# ADR 0002: Contract-First API with Shared Schemas

- Status: Accepted
- Date: 2026-02-16

## Context

Web and API must evolve together without payload drift and runtime contract ambiguity.

## Decision

Use a shared contract package (`packages/types`) with Zod schemas and inferred TypeScript types.

- API validates request and response payloads using shared schemas.
- Web parses API responses using the same schemas.

## Consequences

- Contract changes are centralized and reviewable.
- Runtime validation catches malformed data early.
- Requires discipline to always route payload changes through `packages/types`.
