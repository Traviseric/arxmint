---
id: 116
title: "Wire agent privacy-audit service to computePrivacyScore()"
priority: P1
severity: high
status: completed
source: feature_audit
file: app/api/agent/route.ts
line: 196
created: "2026-02-28T10:00:00Z"
execution_hint: parallel
context_group: agent_api
group_reason: "Touches app/api/agent/route.ts and lib/privacy-defaults.ts — independent of other tasks"
---

# Wire agent privacy-audit service to computePrivacyScore()

**Priority:** P1 (high)
**Source:** feature_audit
**Location:** app/api/agent/route.ts:196

## Problem

The agent API `privacy-audit` service (GET /api/agent?service=privacy-audit) returns a hardcoded privacy score of 78 with hardcoded recommendations. No real privacy analysis engine is invoked — the response is a static JSON object.

**Code with issue:**
```typescript
case "privacy-audit":
  return NextResponse.json({
    service: "privacy-audit",
    paymentMethod,
    audit: {
      score: 78,
      recommendations: [
        "Enable CoinJoin for on-chain consolidation transactions",
        "Use Silent Payments (BIP352) for receiving — prevents address reuse",
        // ... hardcoded list
      ],
    },
  });
```

Agents are paying 200 sats for a hardcoded response. `lib/privacy-defaults.ts` already has `computePrivacyScore()` and `getPrivacyConfig()` which return real computed scores based on wallet/community configuration.

## How to Fix

1. Import `computePrivacyScore` and `getPrivacyConfig` from `@/lib/privacy-defaults`
2. In the `privacy-audit` case, call `computePrivacyScore(getPrivacyConfig())` to get the real score
3. Use the returned score's `.overall`, `.breakdown`, and `.recommendations` fields in the response
4. The function returns a `PrivacyScore` object — use its `overall` (0-100 int) as the `score`, and the `recommendations` array from `breakdown` as the recommendations list
5. If the DB has a community config available (from the query params or session), pass it in; otherwise fall back to default config

**Example:**
```typescript
case "privacy-audit": {
  const privacyConfig = getPrivacyConfig();
  const privacyScore = computePrivacyScore(privacyConfig);
  return NextResponse.json({
    service: "privacy-audit",
    paymentMethod,
    audit: {
      score: privacyScore.overall,
      grade: privacyScore.overall >= 80 ? "A" : privacyScore.overall >= 60 ? "B" : "C",
      recommendations: privacyScore.recommendations ?? [],
      breakdown: privacyScore.breakdown,
      computed_at: new Date().toISOString(),
    },
  });
}
```

## Acceptance Criteria

- [ ] `case "privacy-audit"` in `app/api/agent/route.ts` calls `computePrivacyScore()` from `lib/privacy-defaults.ts`
- [ ] Score is no longer hardcoded to 78
- [ ] Recommendations come from the computed score, not a hardcoded array
- [ ] Response shape is preserved (service, paymentMethod, audit.score, audit.recommendations)
- [ ] `npm run build` passes with no errors

## Notes

_Generated from feature_audit findings. Conductor confirmed this as actionable (round 22)._
