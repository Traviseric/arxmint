---
id: 1
title: "Add Prisma ORM + PostgreSQL schema for all core entities"
priority: P0
severity: critical
status: completed
source: gap_analyzer + overnight_tasks
file: prisma/schema.prisma
line: null
created: "2026-02-27T00:00:00"
execution_hint: long_running
context_group: persistence_layer
group_reason: "Master persistence task — tasks 003, 004, 005, 012 all depend on this schema"
---

# Add Prisma ORM + PostgreSQL schema for all core entities

**Priority:** P0 (critical)
**Source:** gap_analyzer + OVERNIGHT_TASKS.md (ID: 1)
**Location:** new `prisma/schema.prisma`, `package.json`

## Problem

Everything is in-memory via Zustand. All balances, community configs, merchant profiles, and wallet state are lost on page refresh. No database, no ORM, no schema exists. This is the master blocker — tasks for community persistence (003), merchant persistence (004), transaction history (005), and BCE real data (012) all depend on this layer being in place first.

## How to Fix

1. Install dependencies: `npm install prisma @prisma/client`
2. Run `npx prisma init` to scaffold the Prisma setup
3. Create `prisma/schema.prisma` with the following models:
   - `Community` — id, name, prompt, config (JSON), createdAt, updatedAt
   - `WalletProof` — id, communityId (FK), mintUrl, proofData (JSON), amount, isSpent
   - `Merchant` — id, communityId (FK), name, description, category, cashuAddress, lightningAddress, createdAt
   - `Transaction` — id, communityId (FK), type (send/receive/swap), amount, backend (cashu/lightning/fedimint), timestamp, status, counterparty, proofData
   - `User` — id, nostrPubkey, createdAt
4. Add `DATABASE_URL` to `.env.example` (e.g., `DATABASE_URL="postgresql://user:pass@localhost:5432/arxmint"`)
5. Run `npx prisma generate` to generate the Prisma client
6. Create initial migration: `npx prisma migrate dev --name init`
7. Add `prisma generate` to the `build` script in `package.json` (before `next build`)
8. Export `db` singleton from `lib/db.ts`: `import { PrismaClient } from '@prisma/client'; const db = new PrismaClient(); export { db };`

## Acceptance Criteria

- [ ] `prisma/schema.prisma` exists with all 5 models: Community, WalletProof, Merchant, Transaction, User
- [ ] `lib/db.ts` exports a Prisma client singleton
- [ ] `package.json` includes `prisma generate` in build script
- [ ] `.env.example` has `DATABASE_URL` documented
- [ ] `npm run build` still passes
- [ ] `npx prisma generate` completes without errors

## Notes

This is the foundation for all persistence tasks. Workers on tasks 003, 004, 005 must wait for this to complete first. Use `@prisma/client` only in server-side code (API routes, server components). Never import in `'use client'` components.

_Generated from gap_analyzer P0 finding + OVERNIGHT_TASKS.md ID:1._
