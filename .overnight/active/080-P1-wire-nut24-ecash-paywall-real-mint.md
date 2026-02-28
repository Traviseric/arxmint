---
id: 80
title: "Wire NUT-24 ecash paywall to validate tokens against real Cashu mint"
priority: P1
severity: high
status: completed
source: overnight_tasks_id_8
file: app/api/agent/route.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: cashu_payments
group_reason: "Task 088 (federation settlement) depends on this real mint validation."
---

# Wire NUT-24 ecash paywall to validate tokens against real Cashu mint

**Priority:** P1 (high)
**Source:** OVERNIGHT_TASKS.md ID 8
**Location:** app/api/agent/route.ts, lib/cashu-paywall.ts

## Problem

`app/api/agent/route.ts` has a dev bypass: when no Cashu token is provided, it serves unauthenticated responses. The `lib/cashu-paywall.ts` has a `processEcashPayment()` function but it doesn't validate tokens against a real mint — it only checks token structure.

Real NUT-24 validation requires calling the mint's `/v1/checkstate` endpoint to verify the token hasn't been spent, then melting the token to collect the payment.

Note per OVERNIGHT_TASKS.md: "NUT-24 has no mint implementations yet — this is ArxMint's own validation."

## How to Fix

1. **Update `lib/cashu-paywall.ts`** — add real token validation:

```typescript
import { CashuMint, CashuWallet, getDecodedToken } from '@cashu/cashu-ts';

export async function verifyAndMeltToken(tokenStr: string, expectedAmount: number, mintUrl: string): Promise<boolean> {
  try {
    const decoded = getDecodedToken(tokenStr);
    const mint = new CashuMint(mintUrl);
    const wallet = new CashuWallet(mint);

    // Check token state via NUT-07
    const proofs = decoded.token[0].proofs;
    const states = await wallet.checkProofsStates(proofs);
    const allUnspent = states.every(s => s.state === 'UNSPENT');
    if (!allUnspent) return false;

    // Verify amount matches
    const tokenAmount = proofs.reduce((sum, p) => sum + p.amount, 0);
    if (tokenAmount < expectedAmount) return false;

    // Melt / redeem the token (mark as spent)
    // Implementation depends on ArxMint being the mint operator
    // For now: mark proofs as spent via mint's /v1/checkstate
    return true;
  } catch {
    return false;
  }
}
```

2. **Update `app/api/agent/route.ts`**: Remove the dev bypass. Require `X-Cashu-Token` header, validate it via `verifyAndMeltToken()` before serving data.

3. **Add `CASHU_MINT_URL` to `.env.example`**: Points at the running Nutshell mint (default: `http://localhost:3338`).

4. **Update `lib/cashu-paywall.ts` `ecashPaywall()`**: Call real validation in addition to structural checks.

## Acceptance Criteria

- [ ] `GET /api/agent/privacy-audit` without token returns 402
- [ ] Valid unspent Cashu token grants access
- [ ] Previously spent or invalid token returns 402
- [ ] Token amount is verified against the endpoint's price
- [ ] `CASHU_MINT_URL` env var documented
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 8. Requires a running Cashu mint (`npm run setup:cashu`). NUT-24 paywall is ArxMint's own implementation since no mint has NUT-24 yet._
