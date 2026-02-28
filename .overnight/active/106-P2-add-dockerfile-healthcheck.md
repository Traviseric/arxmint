---
id: 106
title: "Add HEALTHCHECK instruction to Dockerfile + pin exact base image version"
priority: P2
severity: low
status: completed
source: overnight_tasks_id_33
file: Dockerfile
line: 30
created: "2026-02-28T08:00:00Z"
execution_hint: parallel
context_group: infra
group_reason: "Infrastructure group: small standalone change to Dockerfile"
---

# Add HEALTHCHECK instruction to Dockerfile + pin exact base image version

**Priority:** P2
**Source:** OVERNIGHT_TASKS.md ID 33 (remainder — core structure already done)
**Location:** `Dockerfile`

## Problem

The Dockerfile is mostly complete (multi-stage, non-root user, .next/standalone) but is missing two items:

1. **HEALTHCHECK instruction:** Docker Compose can't use `condition: service_healthy` for the web service without a `HEALTHCHECK`. The `/api/health` endpoint exists (commit 3b9abfd) but the Dockerfile doesn't declare a healthcheck pointing to it.

2. **Exact base image version:** The Dockerfile uses `node:22-alpine` which updates with minor/patch releases without warning. For a production financial application, the base image should be pinned to an exact digest or patch version for reproducible builds.

**Current Dockerfile bottom:**
```dockerfile
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```
No HEALTHCHECK instruction.

## How to Fix

### Step 1: Add HEALTHCHECK to Dockerfile

Add the HEALTHCHECK instruction before CMD:

```dockerfile
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

Parameters explained:
- `--interval=30s`: check every 30 seconds
- `--timeout=10s`: fail if no response in 10 seconds
- `--start-period=30s`: wait 30s after container start before first check (Next.js startup time)
- `--retries=3`: mark unhealthy after 3 consecutive failures

Use `wget` (available in alpine) instead of `curl` (not always present).

### Step 2: Pin base image version (optional but recommended)

Find the current Node.js 22 LTS alpine digest:
```bash
docker pull node:22-alpine
docker inspect node:22-alpine --format='{{index .RepoDigests 0}}'
```

Update the Dockerfile:
```dockerfile
# Pin to specific digest for reproducible builds
FROM node:22-alpine@sha256:<digest-here> AS base
```

Or at minimum pin to patch version: `node:22.14-alpine` (check current LTS patch on hub.docker.com).

If pinning by digest is too cumbersome, pinning to `node:22.14-alpine` (major.minor) is acceptable.

### Step 3: Update docker-compose.yml web service healthcheck

Since the web service now has a Dockerfile HEALTHCHECK, update `docker-compose.yml` to use it:
```yaml
services:
  web:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
    # Docker will use the Dockerfile HEALTHCHECK automatically
    # You can override here if needed:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

## Acceptance Criteria

- [ ] `Dockerfile` has `HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD wget -qO- http://localhost:3000/api/health || exit 1`
- [ ] HEALTHCHECK uses `wget` (alpine-compatible, no curl dependency)
- [ ] Base image is pinned to at least `node:22.X-alpine` (not just `node:22-alpine`)
- [ ] `docker build .` succeeds locally
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 33 remainder. The multi-stage build, non-root user, and .next/standalone copy were already done. Only HEALTHCHECK and version pinning remain. The /api/health endpoint was added in commit 3b9abfd and returns { status, db, mint, lnd, uptime }._
