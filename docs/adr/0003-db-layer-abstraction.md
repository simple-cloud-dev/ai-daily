# ADR 0003: Database Access via Repository + Client Abstraction

- Status: Accepted
- Date: 2026-02-16

## Context

API transport and business layers should remain stable if persistence strategy changes.

## Decision

Use a layered DB approach:

- `DatabaseClient` interface for low-level DB operations
- Repository interfaces/implementations for entity access
- Services orchestrating business logic over repositories
- Routes calling services only

Start with in-memory implementations; replace with SQL-backed implementations later.

## Consequences

- Clear seams for testing and backend migration.
- Slightly more boilerplate than direct ORM usage in routes.
- Better long-term maintainability and boundary enforcement.
