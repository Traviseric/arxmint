---
id: 13
title: "Add CDK production mint option to docker-compose"
priority: P1
severity: medium
status: completed
source: gap_analyzer + overnight_tasks
file: docker-compose.yml
line: null
created: "2026-02-27T00:00:00"
execution_hint: sequential
context_group: docker_config
group_reason: "Same docker-compose area as tasks 010, 011 — run after those complete"
---

# Add CDK production mint option to docker-compose

**Priority:** P1 (medium)
**Source:** gap_analyzer P1 + OVERNIGHT_TASKS.md (ID: 18)
**Location:** `docker-compose.yml`, `docker/docker-compose.cashu.yml`, new `docker/docker-compose.cdk.yml`

## Problem

The community generator (`lib/community-generator.ts`) can generate CDK-based Cashu mint configs for production deployments. However, the root `docker-compose.yml` and `docker/docker-compose.cashu.yml` only run Nutshell. There is no CDK Docker image or configuration in the root stack. Users who want a production-grade mint (CDK) cannot get it from the local compose setup, even though the generator implies CDK support.

## How to Fix

1. Create `docker/docker-compose.cdk.yml` — a Docker Compose override for CDK-based mint:
   ```yaml
   version: '3.8'
   services:
     cashu-mint:
       image: cashubtc/cdk-mintd:latest
       environment:
         - CDK_MINT_URL=http://localhost:3338
         - CDK_MINT_LN_BACKEND=LnbitsBackend
         - CDK_MINT_LN_BACKEND_LN_ADDRESS=http://lnd:8080
         - CDK_MINT_LISTEN_HOST=0.0.0.0
         - CDK_MINT_LISTEN_PORT=3338
       volumes:
         - cdk_mint_data:/data
       ports:
         - "3338:3338"
       depends_on:
         - lnd
   volumes:
     cdk_mint_data:
   ```
2. Update `README.md` with instructions for using CDK vs Nutshell:
   ```bash
   # Default (Nutshell — development)
   npm run setup:cashu

   # Production (CDK mint)
   docker compose -f docker-compose.yml -f docker/docker-compose.cdk.yml up
   ```
3. Document when to use each:
   - **Nutshell**: Dev/testing, easy setup, single binary
   - **CDK**: Production, Rust-based, better performance, multiple backend support

## Acceptance Criteria

- [ ] `docker/docker-compose.cdk.yml` exists with valid CDK mint service definition
- [ ] `docker compose -f docker-compose.yml -f docker/docker-compose.cdk.yml config` validates
- [ ] `README.md` documents Nutshell vs CDK choice
- [ ] CDK image matches what `lib/community-generator.ts` generates for CDK configs
- [ ] `npm run build` passes

## Notes

Run after tasks 010 and 011 since they also modify docker-compose.yml. The CDK override file uses Docker Compose override pattern — only overrides the cashu-mint service, keeps everything else from root compose.

_Generated from gap_analyzer P1 "CDK production mint" + OVERNIGHT_TASKS.md ID:18._
