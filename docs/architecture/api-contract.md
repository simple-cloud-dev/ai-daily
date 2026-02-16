# API Contract Approach

## Principle

Use contract-first schemas in `packages/types` so runtime and compile-time stay aligned.

## Implementation Pattern

1. Define a Zod schema in `packages/types`.
2. Export inferred TypeScript types from the schema.
3. In API routes/services, parse incoming payloads and outgoing payloads with schema.
4. In web, parse server responses with the same schema before state updates.

## Benefits

- No drift between server validation and frontend assumptions.
- Strongly typed payloads with runtime safety.
- Single package to review for public API shape changes.
