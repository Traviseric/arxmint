---
id: 104
title: "Improve CI/CD pipeline — add lint, type-check, E2E test jobs"
priority: P2
severity: medium
status: completed
source: overnight_tasks_id_34
file: .github/workflows/ci.yml
line: 1
created: "2026-02-28T08:00:00Z"
execution_hint: sequential
context_group: infra
group_reason: "Infrastructure/docs group: CI, runbook (105), Dockerfile (106)"
---

# Improve CI/CD pipeline — add lint, type-check, E2E test jobs

**Priority:** P2
**Source:** OVERNIGHT_TASKS.md ID 34 (improvement)
**Location:** `.github/workflows/ci.yml`

## Problem

The existing `.github/workflows/ci.yml` is minimal — it only does `npm ci + build + npm test`. It's missing:
- **Lint step:** `npm run lint` — catches ESLint errors early
- **Type-check step:** `npx tsc --noEmit` — catches TypeScript errors without building
- **E2E test job:** runs the `node:test` E2E suite with regtest Docker stack
- **Deploy workflow:** deploys to testnet VPS on main merge, mainnet on tagged release

The current CI would pass even if there are severe TypeScript errors (since `npm run build` suppresses them via `ignoreBuildErrors`).

## How to Fix

### Update `.github/workflows/ci.yml`

Replace the minimal CI with a comprehensive pipeline:

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Generate Prisma client
        run: npx prisma generate
      - name: Type check
        run: npx tsc --noEmit

  build-and-test:
    name: Build & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Run unit tests
        run: npm test

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [build-and-test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Start regtest Docker stack
        run: npm run setup:regtest
        continue-on-error: true  # Stack may not be available in CI — skip gracefully
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_SERVER_URL: http://localhost:3000
```

**Note:** The `tsc --noEmit` step may initially fail due to pre-existing type errors. If so, either:
1. Fix the type errors (preferred), OR
2. Add `continue-on-error: true` temporarily while fixing them incrementally

Read the current tsconfig.json before running to understand what paths are included.

## Acceptance Criteria

- [ ] CI has separate jobs: lint, type-check, build-and-test, e2e
- [ ] Lint job runs `npm run lint`
- [ ] Type-check job runs `npx tsc --noEmit` (after `prisma generate`)
- [ ] Unit test job passes: `npm test`
- [ ] E2E job runs `npm run test:e2e` (skip gracefully if Docker unavailable)
- [ ] E2E job depends on `build-and-test` completing first
- [ ] `npm run build` passes locally before pushing CI changes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 34. The basic ci.yml was created earlier but is too minimal. This improves it to catch type errors and run E2E tests. The deploy workflow (deploy to VPS on main merge, mainnet on tagged release) is a separate concern — omit for now unless straightforward._
