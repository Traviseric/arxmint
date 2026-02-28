---
id: 149
title: "Create upstream dependency tracking notes"
priority: P3
severity: low
status: completed
source: root-human-tasks
file: docs/tracking/upstream-deps.md
created: "2026-02-28T18:00:00"
execution_hint: parallel
context_group: tracking_docs
group_reason: "Standalone docs creation, no code dependencies"
---

# Create Upstream Dependency Tracking Notes

**Priority:** P3 (low)
**Source:** root-human-tasks
**Location:** docs/tracking/upstream-deps.md (new file, new directory)

## Problem

`human_tasks.md` has 5 unchecked upstream dependency items that agents can document but not resolve:

1. **Ark SDK release** — `lib/ark-sdk.ts` is stub mode. Waiting on `@arkade-os/sdk` npm release.
2. **Programmable eCash (NUT-XX)** — Cashu protocol hasn't adopted spending conditions.
3. **ZK reissuance** — Requires Cashu protocol support for ZK proofs in token reissuance.
4. **CTV+CSFS for Ark non-interactive receive** — Requires Bitcoin soft-fork.
5. **CDK maturity** — Monitor cdk-mintd for "ALPHA" warning removal (triggers migration from Nutshell).

No tracking document exists. These items need clear monitoring criteria so the human knows exactly when to act and what to check.

## How to Fix

Create `docs/tracking/` directory and `docs/tracking/upstream-deps.md` with a tracking table for each dependency:

**For each dependency, document:**
- Current status (as of Feb 2026)
- GitHub/npm links to monitor
- "Ready when" criteria (exact signals to watch for)
- Impact on ArxMint (what becomes unblocked)
- Estimated timeline (best guess based on current signals)

**Content to include per dependency:**

### 1. Ark SDK (`@arkade-os/sdk`)
- Current: `lib/ark-sdk.ts` is stub. No npm package exists.
- Monitor: https://github.com/arkade-os/arkd releases, https://npmjs.com/package/@arkade-os/sdk
- Ready when: npm package published with TypeScript types
- Impact: Replace stub in lib/ark-sdk.ts, enable real Ark VTXOs

### 2. Programmable eCash (NUT-XX)
- Current: `lib/cashu-sdk.ts` has aspirational type definitions. Cashu protocol WIP.
- Monitor: https://github.com/cashubtc/nuts PRs labeled "programmable-ecash" or "spending-conditions"
- Ready when: NUT proposal merged to main with reference implementation
- Impact: Enable real time-lock/escrow/proof-of-service conditions in lib/cashu-sdk.ts

### 3. ZK Reissuance
- Current: Stub only. Requires ZK proof support in Cashu protocol.
- Monitor: https://github.com/cashubtc/nuts — look for ZK-related NUTs
- Ready when: NUT merged + cashu-ts implements it
- Impact: Privacy-preserving token reissuance

### 4. CTV+CSFS (Bitcoin soft-fork)
- Current: Not active. Requires Bitcoin consensus change.
- Monitor: https://github.com/bitcoin/bips (BIP-119 CTV, BIP-348 CSFS), https://utxos.org/signals/
- Ready when: Soft-fork activated on mainnet
- Impact: Ark non-interactive receive, Ark liquidity improvements

### 5. CDK Maturity (cdk-mintd)
- Current: CDK has "ALPHA" warning in README. Nutshell is used for pilot.
- Monitor: https://github.com/cashubtc/cdk README for "ALPHA" removal, GitHub releases
- Ready when: "ALPHA" warning removed from CDK README + stable release tagged
- Impact: Migrate from Nutshell → CDK (two-mint Lightning swap procedure, see docs/MIGRATION_PLAN.md)

## Acceptance Criteria

- [ ] `docs/tracking/` directory created
- [ ] `docs/tracking/upstream-deps.md` created with tracking table
- [ ] All 5 dependencies documented with: status, monitor links, ready criteria, impact
- [ ] CDK entry references docs/MIGRATION_PLAN.md for migration procedure
- [ ] File has clear "Last reviewed" date header

## Notes

_Generated from root-human-tasks synthesis. Covers 5 unchecked items in human_tasks.md: Ark SDK, NUT-XX, ZK reissuance, CTV+CSFS, CDK maturity._
_These items cannot be checked off until upstream events occur. Tracking doc helps the human monitor without re-reading codebase._
