---
id: 37
title: "Add Prisma ORM + PostgreSQL schema for core entities"
priority: P0
severity: critical
status: completed
source: project_declared
file: prisma/schema.prisma
line: null
created: "2026-02-27T04:30:00"
execution_hint: long_running
context_group: persistence_layer
group_reason: "Foundation task — tasks 038, 039, 040 all depend on this schema existing."
---

# Add Prisma ORM + PostgreSQL Schema

**Priority:** P0 (blocking all persistence work)
**Source:** OVERNIGHT_TASKS.md ID:1
**Location:** new `prisma/schema.prisma`, `package.json`

## Problem

Everything in ArxMint is in-memory via Zustand. All balances, community configs, merchants, and wallet state are lost on page refresh. There is no database, no ORM, no schema. This blocks merchant onboarding, transaction history, BCE real data, and wallet recovery.

## How to Fix

### Step 1: Install dependencies
```bash
npm install prisma @prisma/client
```

### Step 2: Initialize Prisma
```bash
npx prisma init
```
This creates `prisma/schema.prisma` and `prisma/.env`.

### Step 3: Create the schema
Create `prisma/schema.prisma` with these models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Community {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  config      Json     // stores CommunityConfig as JSON
  createdBy   String   // Nostr pubkey
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  merchants   Merchant[]
  transactions Transaction[]
}

model Wallet {
  id        String   @id @default(cuid())
  pubkey    String   @unique // Nostr pubkey
  backend   String   // 'cashu' | 'fedimint' | 'lightning'
  mintUrl   String?  // for Cashu wallets
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  proofs    WalletProof[]
}

model WalletProof {
  id        String   @id @default(cuid())
  walletId  String
  wallet    Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  proofJson Json     // serialized Cashu proof
  amount    Int      // sats
  mintUrl   String
  spent     Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Merchant {
  id          String   @id @default(cuid())
  communityId String
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  name        String
  category    String
  description String?
  paymentUri  String   // BIP-21 or BOLT11 payment URI
  lightningAddress String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Transaction {
  id          String   @id @default(cuid())
  communityId String?
  community   Community? @relation(fields: [communityId], references: [id])
  pubkey      String   // sender/receiver Nostr pubkey
  type        String   // 'send' | 'receive' | 'swap'
  amount      Int      // sats
  backend     String   // 'cashu' | 'fedimint' | 'lightning'
  status      String   @default("pending") // 'pending' | 'confirmed' | 'failed'
  counterparty String?
  memo        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id        String   @id @default(cuid())
  pubkey    String   @unique // Nostr pubkey
  createdAt DateTime @default(now())
  lastSeen  DateTime @default(now())
}
```

### Step 4: Add DATABASE_URL to env files
Update `.env.example`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/arxmint?schema=public"
```

Create `.env.local` for development (if not already exists):
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/arxmint?schema=public"
```

### Step 5: Create Prisma client singleton
Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Step 6: Add generate to build script
Update `package.json` scripts:
```json
"build": "prisma generate && next build",
"postinstall": "prisma generate"
```

### Step 7: Generate the Prisma client
```bash
npx prisma generate
```

**Note on migrations:** `npx prisma migrate dev` requires a running PostgreSQL instance. Skip the migration step — just run `prisma generate` to generate the TypeScript client. The migration can be run when a DB is available.

## Acceptance Criteria

- [ ] `prisma/schema.prisma` exists with models: Community, Wallet, WalletProof, Merchant, Transaction, User
- [ ] `lib/prisma.ts` singleton created
- [ ] `DATABASE_URL` added to `.env.example`
- [ ] `package.json` includes `prisma generate` in the build step
- [ ] `npm run build` passes (prisma generate + next build)
- [ ] `npm test` passes

## Dependencies

- **Requires human action:** Someone must provision a PostgreSQL database and set `DATABASE_URL` in production. Logged in HUMAN_TASKS.md (HT-005).
- Tasks 038, 039, 040 are blocked by this task.

## Notes

Use `cuid()` for IDs (already in Prisma). The `config` field on Community uses `Json` type to store the full `CommunityConfig` object without mapping every field to columns — simpler for now. Do NOT run `prisma migrate` without a real DB connection.

_Generated from OVERNIGHT_TASKS.md P0 ID:1._
