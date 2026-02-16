# ADR 0001: Monorepo Stack and Workspace Tooling

- Status: Accepted
- Date: 2026-02-16

## Context

We need a clean monorepo that supports web and api applications, shared packages, and unified local workflows.

## Decision

Use `npm` workspaces with:

- Apps: `apps/web` (React + Vite), `apps/api` (Fastify + TypeScript)
- Shared packages: `packages/types`, `packages/config`, `packages/eslint-config`
- Root recursive scripts for dev/build/test/lint/typecheck

## Consequences

- Faster, deterministic workspace installs and dependency graph awareness.
- Explicit package boundaries through workspace imports.
- Slight upfront maintenance for shared package configuration.
