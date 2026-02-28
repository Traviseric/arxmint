---
id: 94
title: "Add multi-mint keyset safety gates (Jan 2026 disclosure)"
priority: P2
severity: high
status: completed
source: overnight_tasks_id_25
file: lib/cashu-sdk.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: cashu_vault
group_reason: "Cashu security. Related to task 074 (vault) — both touch cashu proof handling."
---

# Add multi-mint keyset safety gates (Jan 2026 disclosure)

**Priority:** P2 (high)
**Source:** OVERNIGHT_TASKS.md ID 25
**Location:** components/wallet-panel.tsx, lib/cashu-sdk.ts, lib/cashu-vault.ts

## Problem

Research #3 & #5 document a Jan 2026 disclosure: a malicious mint can poison wallets via keyset ID collisions. The attack:
1. Malicious mint sends proofs with keyset IDs that collide with trusted mint keysets
2. Wallet accepts the proofs without re-verifying the keyset against the trusted mint
3. User receives worthless "proofs" that appear valid but cannot be spent at the real mint

ArxMint currently has no keyset validation — it trusts keyset IDs as provided by the mint.

## How to Fix

1. **Compute keyset IDs locally per NUT-02** instead of trusting mint-provided IDs:
```typescript
// In lib/cashu-sdk.ts
import { deriveKeysetId } from '@cashu/cashu-ts';

async function verifyKeysetId(keyset: MintKeyset): Promise<boolean> {
  const computedId = await deriveKeysetId(keyset.keys);
  if (computedId !== keyset.id) {
    console.error(`[ArxMint] Keyset ID mismatch! Mint provided ${keyset.id}, computed ${computedId}. REJECTING.`);
    return false;
  }
  return true;
}
```

2. **Prefer Keyset ID V2** (`01...` HMAC-SHA256 prefix) over legacy `00...` IDs. Add warning log when legacy keyset ID is detected.

3. **Reject keyset ID collisions** with previously seen keysets:
```typescript
// In lib/cashu-vault.ts or lib/cashu-sdk.ts
const KNOWN_KEYSETS = new Map<string, string>(); // keysetId → mintUrl

function checkKeysetCollision(keysetId: string, mintUrl: string): boolean {
  const knownMint = KNOWN_KEYSETS.get(keysetId);
  if (knownMint && knownMint !== mintUrl) {
    console.error(`[ArxMint] KEYSET COLLISION: ${keysetId} already known for ${knownMint}, but ${mintUrl} is claiming it. REJECTING.`);
    return true; // collision detected
  }
  KNOWN_KEYSETS.set(keysetId, mintUrl);
  return false;
}
```

4. **Prevent auto-add/auto-swap for received tokens from unknown mints**:
   - When receiving a Cashu token, check if the mint URL is in the user's trusted mint list
   - If unknown mint: show warning dialog, do not auto-accept

5. **Add info tooltip to wallet panel**:
```tsx
<Tooltip content="Avoid auto-trusting unknown mints. ArxMint verifies keyset IDs to protect against malicious mint attacks. Hold small balances per mint.">
  <InfoIcon className="h-4 w-4 text-sovereign-muted" />
</Tooltip>
```

## Acceptance Criteria

- [ ] Keyset IDs computed locally per NUT-02 (not trusted from mint)
- [ ] Keyset ID V2 preferred; warning logged for legacy `00...` IDs
- [ ] Keyset ID collision detection with known keysets
- [ ] Unknown mint token requires user confirmation before acceptance
- [ ] Info tooltip added to wallet panel about mint trust
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 25 (Jan 2026 disclosure). This is a security fix that should run after task 074 (vault) so keyset registry can be stored persistently._
