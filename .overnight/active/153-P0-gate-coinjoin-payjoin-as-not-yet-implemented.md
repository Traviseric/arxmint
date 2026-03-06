---
id: 153
title: "Gate CoinJoin/PayJoin as 'not-yet-implemented' in privacy-defaults.ts"
priority: P0
severity: critical
status: completed
source: feature_audit
file: lib/privacy-defaults.ts
line: 76
created: "2026-02-28T25:00:00Z"
execution_hint: parallel
context_group: independent
group_reason: "Only touches lib/privacy-defaults.ts — independent of all other tasks"
---

# Gate CoinJoin/PayJoin as 'not-yet-implemented' in privacy-defaults.ts

**Priority:** P0 (critical)
**Source:** feature_audit
**Location:** lib/privacy-defaults.ts:76, lib/privacy-defaults.ts:86, lib/privacy-defaults.ts:149-152

## Problem

`CoinJoin` and `PayJoin` are described in `PRIVACY_DESCRIPTIONS` with `supportedBy: "on-chain-only"` and `status: "live"` — but **neither has any actual implementation in the codebase**. There is no CoinJoin library integration, no PayJoin handshake, no BIP-78 flow, and no transaction coordination logic anywhere.

The privacy dashboard's "coming soon" badge system works correctly, but it triggers only when `info.supportedBy === "not-yet-implemented"`. Because CoinJoin/PayJoin use `"on-chain-only"`, users selecting an on-chain backend will see these layers shown as potentially **active** (not "coming soon"), misleading them about their actual privacy guarantees.

Additionally, `computePrivacyScore()` unconditionally adds 15 points for `coinJoin` and 10 points for `payJoin` based solely on the config preset, without checking `isLayerAvailable()`. This means the "high" and "maximum" privacy presets report falsely elevated scores (e.g., maximum preset claims 100 but CoinJoin/PayJoin contribute 25 of those points with zero implementation).

**Code with issue:**
```typescript
// lib/privacy-defaults.ts:76-94
coinJoin: {
  name: "CoinJoin",
  ...
  status: "live",           // BUG: not implemented
  supportedBy: "on-chain-only",  // BUG: should be "not-yet-implemented"
},
payJoin: {
  name: "PayJoin",
  ...
  status: "live",           // BUG: not implemented
  supportedBy: "on-chain-only",  // BUG: should be "not-yet-implemented"
},

// lib/privacy-defaults.ts:149-152
if (config.coinJoin) score += 15;  // BUG: unconditional, no availability check
if (config.payJoin) score += 10;   // BUG: unconditional, no availability check
```

## How to Fix

**1. Change CoinJoin and PayJoin metadata** in `PRIVACY_DESCRIPTIONS`:
```typescript
coinJoin: {
  name: "CoinJoin",
  short: "Mixes coins to break transaction links",
  detail: "...",
  status: "experimental",               // was: "live"
  supportedBy: "not-yet-implemented",   // was: "on-chain-only"
  backendWarning:
    "CoinJoin coordination is planned but not yet implemented. " +
    "Integration with JoinMarket or BTCPayServer PayJoin is on the roadmap.",
},
payJoin: {
  name: "PayJoin",
  short: "Sender + receiver co-sign to hide amounts",
  detail: "...",
  status: "experimental",               // was: "live"
  supportedBy: "not-yet-implemented",   // was: "on-chain-only"
  backendWarning:
    "PayJoin (BIP-78) sender/receiver coordination is planned but not yet implemented.",
},
```

**2. Gate score additions with `isLayerAvailable()`** in `computePrivacyScore()`:
```typescript
// Before (buggy):
if (config.coinJoin) score += 15;
if (config.payJoin) score += 10;

// After (correct):
if (config.coinJoin && isLayerAvailable("coinJoin", backend)) score += 15;
if (config.payJoin && isLayerAvailable("payJoin", backend)) score += 10;
```

Note: `computePrivacyScore()` needs the `backend` parameter. Check if it already accepts `backend`; if not, add it with a default of `"cashu"`.

No changes needed in `components/privacy-dashboard.tsx` — the dashboard already handles `"not-yet-implemented"` correctly by showing the "coming soon" badge.

## Acceptance Criteria

- [ ] `PRIVACY_DESCRIPTIONS.coinJoin.supportedBy` is `"not-yet-implemented"`
- [ ] `PRIVACY_DESCRIPTIONS.payJoin.supportedBy` is `"not-yet-implemented"`
- [ ] Both now show "coming soon" badge in the privacy dashboard UI
- [ ] `computePrivacyScore()` does NOT add 15 pts for coinJoin or 10 pts for payJoin when they are unavailable
- [ ] `npm run build` passes with no errors
- [ ] No TypeScript errors

## Notes

_Generated from feature_audit finding: "CoinJoin / PayJoin Privacy Layers" (critical severity, high effort — but this specific FIX is low effort: only metadata + scoring change in one file)._
_The full CoinJoin/PayJoin implementation remains a roadmap item — do NOT attempt to implement the protocols._
