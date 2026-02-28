---
id: 41
title: "Update root docker-compose.yml to Fedimint v0.10.0"
priority: P1
severity: medium
status: completed
source: project_declared
file: docker-compose.yml
line: null
created: "2026-02-27T04:30:00"
execution_hint: parallel
context_group: docker_stack
group_reason: "docker-compose.yml change. Related to task 042 (Prometheus) — both touch root compose."
---

# Update Root docker-compose.yml to Fedimint v0.10.0

**Priority:** P1 (version parity)
**Source:** OVERNIGHT_TASKS.md ID:9
**Location:** `docker-compose.yml`

## Problem

`community-generator.ts` generates Docker Compose files with Fedimint v0.10.0 references, but the root `docker-compose.yml` uses Fedimint v0.5.0 images. This creates a version mismatch:

- Generator output: `fedimintd:v0.10.0`
- Root compose: `fedimintd:v0.5.0`

A user running `docker compose up` with the root compose gets a different (older) version than what the generated configs specify. This causes confusion during development and testing.

## How to Fix

1. Read `docker-compose.yml` fully to understand current structure.
2. Find all references to Fedimint Docker images (search for `fedimint`, `fedimintd`, `guardian`).
3. Update image tags from `v0.5.0` to `v0.10.0`:
   ```yaml
   # Change:
   image: fedimint/fedimintd:v0.5.0
   # To:
   image: fedimint/fedimintd:v0.10.0
   ```
4. Check if there are any API or configuration changes between v0.5.0 and v0.10.0 that affect the compose file:
   - Check the Fedimint GitHub releases page (fedimint/fedimint)
   - Key changes to look for: env var names, port assignments, volume paths
5. Check `lib/community-generator.ts` for the exact image names and environment variables used in generated configs — mirror those in the root compose.
6. Run `docker compose config` to validate the YAML syntax after changes.
7. If possible, do `docker compose pull` to verify the v0.10.0 images exist.

## Acceptance Criteria

- [ ] `docker-compose.yml` uses `fedimint/fedimintd:v0.10.0` (or the current stable tag used by community-generator.ts)
- [ ] Image tag in root compose matches what `community-generator.ts` generates
- [ ] `docker compose config` validates without errors
- [ ] `npm run build` passes
- [ ] `npm test` passes

## Notes

Check what exact image tag `community-generator.ts` uses — it may be `v0.10.0` or a specific SHA. Mirror that exact tag. If v0.10 has breaking config changes (different env vars, changed mount paths), update those too. Read DEPLOY.md for context on the stack setup.

_Generated from OVERNIGHT_TASKS.md P1 ID:9 + gap_analyzer finding._
