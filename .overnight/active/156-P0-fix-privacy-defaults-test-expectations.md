---
id: 156
title: "Fix privacy-defaults test expectations after CoinJoin/PayJoin gating"
priority: P0
severity: critical
status: completed
source: review_audit
file: tests/privacy-defaults.test.ts
line: 28
created: "2026-02-28T26:00:00Z"
execution_hint: sequential
context_group: privacy_defaults
group_reason: "Directly follows task 153 — same feature area (privacy-defaults.ts + its tests)"
---

# Fix privacy-defaults test expectations after CoinJoin/PayJoin gating

**Priority:** P0 (critical)
**Source:** review_audit (round 75)
**Location:** tests/privacy-defaults.test.ts:28

## Problem

Worker 001 (commit 82fa17e) correctly changed CoinJoin/PayJoin to `'not-yet-implemented'` in `lib/privacy-defaults.ts` and gated `computePrivacyScore()` with `isLayerAvailable()`. However, the test in `tests/privacy-defaults.test.ts` was NOT updated.

The test `'privacy score is weighted by backend-usable layers'` at line 28 expects:
- `fedimintScore = 65` — but actual value is now **40** (CoinJoin −15pts + PayJoin −10pts, both now unavailable)
- `cashuScore = 80` — but actual value is now **55** (same reason)

This causes `npm test` to fail with:

```
AssertionError: 40 !== 65
```

This blocks CI and the SWITCH_PROJECT validation gate.

**Code with issue:**
```typescript
// tests/privacy-defaults.test.ts:28
assert.equal(fedimintScore, 65);  // BUG: should be 40
assert.equal(cashuScore, 80);     // BUG: should be 55
```

## How to Fix

Update the two assertion values in `tests/privacy-defaults.test.ts` at the test `'privacy score is weighted by backend-usable layers'`:

```typescript
// Before (stale):
assert.equal(fedimintScore, 65);
assert.equal(cashuScore, 80);

// After (correct):
assert.equal(fedimintScore, 40);
assert.equal(cashuScore, 55);
```

Note: The assertion `cashuScore > fedimintScore` still holds (55 > 40), so no other assertions need to change.

Run `npm test` after the change to confirm it passes.

## Acceptance Criteria

- [ ] `tests/privacy-defaults.test.ts` line 28: `assert.equal(fedimintScore, 40)` (was 65)
- [ ] `tests/privacy-defaults.test.ts` line 28: `assert.equal(cashuScore, 55)` (was 80)
- [ ] `npm test` passes with no failures
- [ ] No other test assertions changed (only the two stale expected values)
- [ ] `npm run build` still passes

## Notes

_Generated from review_audit new_tasks[0] (round 75). This is a 2-line fix that unblocks `npm test` and the SWITCH_PROJECT validation gate._
_Root cause: task 153 correctly changed privacy-defaults.ts but did not update its corresponding test expectations._
