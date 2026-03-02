# Flaky Test Policy

## Purpose
Prevent nondeterministic tests from silently degrading release confidence.

## Policy
1. A flaky test must be tagged with an owner and a removal deadline in the test file comment.
2. Flaky tests may be quarantined, but quarantine requires:
- linked issue ID
- explicit owner
- expiry date (max 14 days)
3. Quarantined tests still run in nightly CI and report separately.
4. If expiry passes, the test is re-promoted to required or removed.

## Quarantine Metadata Format
Use this comment above the test:

```ts
// FLAKY-QUARANTINE: owner=@team-handle issue=#123 expires=2026-03-16
```

## Enforcement
- PR reviewers must block new flaky markers without issue/owner/expiry.
- Weekly test reliability review removes stale quarantine entries.

