# API SRE Runbook

## Endpoints

- `GET /healthz`: liveness probe. Returns `200` while process is running.
- `GET /readyz`: readiness probe. Returns:
  - `200` when the app can serve traffic.
  - `503` with `code=not_ready` while shutting down.
  - `503`/`504` for failed dependency checks when `READINESS_DEPENDENCY_URL` is configured.

## Request Tracing

- The API accepts `x-request-id` on inbound requests.
- If missing, the API generates one UUID per request.
- The API returns `x-request-id` on every response.
- Outbound dependency requests propagate the same `x-request-id`.
- Logs are structured JSON and include request IDs for correlation.

## Error Taxonomy

- `validation_error` -> `400`
- `unauthorized` -> `401`
- `forbidden` / `forbidden_origin` -> `403`
- `rate_limited` -> `429` (+ `Retry-After` header)
- `not_ready` -> `503`
- `upstream_unavailable` -> `503`
- `upstream_timeout` -> `504`
- `internal_error` -> `500`

## Outbound HTTP Policy

- Configurable timeout via `OUTBOUND_HTTP_TIMEOUT_MS`.
- Retries for network failures and status `408/429/500/502/503/504`.
- Max retry attempts via `OUTBOUND_HTTP_MAX_RETRIES`.
- Exponential backoff base via `OUTBOUND_HTTP_RETRY_DELAY_MS`.

## Graceful Shutdown

1. On `SIGINT` or `SIGTERM`, server enters draining mode (`readyz` returns `503`).
2. Server stops accepting new connections and closes Fastify.
3. If shutdown completes before `SHUTDOWN_GRACE_PERIOD_MS`, process exits `0`.
4. If timeout is exceeded, process exits `1`.

## Operational Checks

1. Verify liveness:
   - `curl -i http://localhost:4000/healthz`
2. Verify readiness:
   - `curl -i http://localhost:4000/readyz`
3. Verify request ID echo:
   - `curl -i -H "x-request-id: test-123" http://localhost:4000/healthz`
4. Verify shutdown behavior:
   - Start server, send `SIGTERM`, then check `readyz` returns `503` before exit.
