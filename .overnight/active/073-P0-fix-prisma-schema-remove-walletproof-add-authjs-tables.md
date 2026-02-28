---
id: 73
title: "Fix Prisma schema: remove WalletProof, add Auth.js tables"
priority: P0
severity: critical
status: completed
source: overnight_tasks_id_1_verification
file: prisma/schema.prisma
line: 29
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: database_layer
group_reason: "Foundation for tasks 075, 076, 077, 078 — all DB persistence tasks depend on correct schema"
---

# Fix Prisma schema: remove WalletProof, add Auth.js tables

**Priority:** P0 (critical)
**Source:** OVERNIGHT_TASKS.md ID 1 — verification of prisma/schema.prisma
**Location:** prisma/schema.prisma:29

## Problem

The existing `prisma/schema.prisma` has two critical violations of core architecture principles:

**Violation 1 — WalletProof table (lines 29-40):**
```prisma
model WalletProof {
  id          String    @id @default(cuid())
  communityId String
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  mintUrl     String
  proofData   Json       // ← CRITICAL VIOLATION: raw proofs in server DB
  amount      Int
  isSpent     Boolean   @default(false)
  createdAt   DateTime  @default(now())
  @@map("wallet_proofs")
}
```

Research #1 and the ArxMint custody model explicitly require: **"Cashu proofs NEVER touch this DB."** Cashu proofs are bearer instruments that must remain client-side only (IndexedDB). Storing them in a server DB would make ArxMint custodial — a fundamental architectural violation.

**Violation 2 — Transaction.proofData column (line 67):**
```prisma
proofData   Json?     // ← stores raw proof data — must be metadata only
```

The Transaction table should store metadata only (type, amount, backend, timestamp, status), NOT raw proof objects.

**Missing — Auth.js standard tables:**
The schema has a basic `User` model but lacks the Auth.js required tables: `Account`, `Session`, `VerificationToken`. Without these, Auth.js (ID 6 task) cannot use the Prisma adapter for session persistence.

**Missing — User ↔ Community/Merchant relations:**
Users are isolated from their communities and merchant listings — no foreign key linking them.

## How to Fix

1. **Delete the entire `WalletProof` model** — proofs belong in IndexedDB, not Postgres
2. **Remove `walletProofs WalletProof[]` relation from `Community` model**
3. **Remove `proofData Json?` from `Transaction` model** — rename to metadata if needed for non-sensitive tx notes
4. **Add code comment** at top of datasource block: `// Cashu proofs NEVER touch this DB. Proofs are client-side only (IndexedDB). See lib/cashu-vault.ts`
5. **Expand `User` model** — add `name`, `email`, `emailVerified`, `image` fields for Auth.js compatibility
6. **Add Auth.js standard models**: `Account`, `Session`, `VerificationToken`
7. **Add `userId` foreign key to `Community`** so users own their communities
8. **Add `userId` foreign key to `Merchant`** so merchants are tied to users

Target schema after fix:
```prisma
// Cashu proofs NEVER touch this DB. Proofs are client-side only (IndexedDB). See lib/cashu-vault.ts

model Community {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  name      String
  prompt    String
  config    Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  merchants    Merchant[]
  transactions Transaction[]
  @@map("communities")
}

model Merchant {
  id               String    @id @default(cuid())
  communityId      String
  community        Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  userId           String?
  user             User?     @relation(fields: [userId], references: [id])
  name             String
  description      String?
  category         String?
  cashuAddress     String?
  lightningAddress String?
  metadata         Json?
  createdAt        DateTime  @default(now())
  @@map("merchants")
}

model Transaction {
  id           String    @id @default(cuid())
  communityId  String
  community    Community @relation(fields: [communityId], references: [id], onDelete: Cascade)
  type         String    // send | receive | swap
  amount       Int
  backend      String    // cashu | lightning | fedimint
  timestamp    DateTime  @default(now())
  status       String    // pending | confirmed | failed
  counterparty String?
  notes        String?   // non-sensitive metadata only — NO raw proofs
  @@map("transactions")
}

model User {
  id            String    @id @default(cuid())
  nostrPubkey   String?   @unique
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
  communities   Community[]
  merchants     Merchant[]
  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

After updating schema:
- Run `npx prisma generate` to update the Prisma client
- Run `npx prisma migrate dev --name fix-schema-remove-walletproof-add-authjs` to create migration
- Verify `npm run build` still passes

## Acceptance Criteria

- [ ] `WalletProof` model is completely removed from schema
- [ ] `Community.walletProofs` relation is removed
- [ ] `Transaction.proofData` column is removed (or renamed to non-proof `notes`)
- [ ] Code comment "Cashu proofs NEVER touch this DB" is present
- [ ] Auth.js tables added: `Account`, `Session`, `VerificationToken`
- [ ] `User` model has Auth.js-required fields (name, email, emailVerified, image)
- [ ] `Community` and `Merchant` models have optional `userId` foreign key
- [ ] Prisma migration generated without errors
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 1 verification. This is a critical schema fix — the WalletProof table would make ArxMint custodial if used, violating the core non-custodial architecture. Must be fixed before any DB persistence tasks (075, 076, 077) can be safely implemented._
