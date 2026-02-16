# Database Layer Approach

## Principle

Keep persistence details out of route and business logic layers.

## Layers

1. `DatabaseClient`: low-level query/transaction abstraction.
2. `Repository`: entity-focused data access interface.
3. `Service`: business rules and orchestration.
4. `Route`: transport concerns (HTTP, status codes, serialization).

## Migration Path

- Today: `InMemoryDatabaseClient` and `InMemoryDailySummaryRepository`.
- Next: introduce SQL client-backed implementation and schema migrations.
- Keep service and route code unchanged when swapping persistence backend.
