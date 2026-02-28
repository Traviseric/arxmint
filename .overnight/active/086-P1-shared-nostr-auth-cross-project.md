---
id: 86
title: "Shared Nostr auth verification between ArxMint and Teneo Marketplace"
priority: P1
severity: medium
status: completed
source: overnight_tasks_id_21
file: lib/auth-middleware.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: parallel
context_group: auth_module
group_reason: "Auth-related. Complements task 078. But can run after it independently."
---

# Shared Nostr auth verification between ArxMint and Teneo Marketplace

**Priority:** P1 (medium)
**Source:** OVERNIGHT_TASKS.md ID 21
**Location:** lib/auth-middleware.ts, lib/nostr-auth.ts

## Problem

Both ArxMint and Teneo Marketplace use NIP-07 + NIP-98 for auth. A creator logged into the marketplace with their Nostr key should be recognized by ArxMint payment endpoints without re-authenticating. Currently, the two apps have no shared session verification mechanism.

## How to Fix

1. **Document and standardize the session token format** in `lib/auth-middleware.ts`:
   - The token should include: `{ pubkey, iat, exp }` signed with `NEXTAUTH_SECRET`
   - Marketplace should use the same JWT format and secret (via shared env var)

2. **Add `verifySharedSession()` to `lib/auth-middleware.ts`**:
   ```typescript
   export function verifySharedSession(token: string): { pubkey: string } | null {
     // Verify JWT signed with NEXT_PUBLIC_AUTH_SECRET (same key for both apps)
     // Return decoded payload or null
   }
   ```

3. **Update `app/api/payment/` routes**: Accept either:
   - ArxMint session cookie (`arxmint_session`)
   - Teneo Marketplace JWT header (`Authorization: Bearer <jwt>`)
   - Direct NIP-98 signed event for agent-to-agent calls

4. **Update `.env.example`** with shared auth config:
   ```
   # Shared between ArxMint and Teneo Marketplace
   AUTH_SHARED_SECRET=<generate-with-openssl-rand-base64-32>
   ```

5. **Write documentation** in `lib/auth-middleware.ts` comments:
   ```typescript
   // Cross-project session compatibility:
   // Both arxmint and teneo-marketplace use the same JWT format.
   // Share AUTH_SHARED_SECRET between both deployments.
   // A user logged in at marketplace can call arxmint /api/payment/*
   // with their marketplace JWT and be recognized.
   ```

## Acceptance Criteria

- [ ] `verifySharedSession()` exported from `lib/auth-middleware.ts`
- [ ] Payment API endpoints accept marketplace JWT tokens
- [ ] `AUTH_SHARED_SECRET` added to `.env.example`
- [ ] Comment block documents the cross-project session pattern
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 21. Depends on task 078 (route protection). Lower effort task — mostly config and documentation with a small auth utility function._
