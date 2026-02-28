---
id: 82
title: "Complete remote signer integration for Lightning agents"
priority: P1
severity: medium
status: completed
source: overnight_tasks_id_11
file: lib/lightning-agent.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: sequential
context_group: lightning_payments
group_reason: "Same lightning stack as task 079."
---

# Complete remote signer integration for Lightning agents

**Priority:** P1 (medium)
**Source:** OVERNIGHT_TASKS.md ID 11
**Location:** lib/lightning-agent.ts

## Problem

`lib/lightning-agent.ts` has config and validation for a remote signer (`litd`) but the transport is not wired end-to-end. Agent payment operations still use direct LND signing. The agent runtime should NEVER hold signing key material — all signing must be delegated to the remote `litd` signer.

This is a security requirement: agent compromise cannot lead to private key compromise.

## How to Fix

1. **Read `lib/lightning-agent.ts`** fully to understand the current remote signer stub.

2. **Wire the remote signer transport**: Replace direct LND gRPC calls in the agent payment path with `litd` remote signer API calls. The config likely specifies a `remoteSigner.url` and macaroon.

3. **Agent payment path**:
   - Agent receives payment request
   - Constructs PSBT/payment routing without signing key
   - Sends to remote signer via `litd` API for signing
   - Receives signed output and broadcasts

4. **Validate the separation**: After implementation, the agent process should have zero access to the LND wallet seed or private keys — only the remote signer macaroon (which has limited permissions).

5. **Add integration test** (unit-level, no live node required):
   - Mock `litd` remote signer endpoint
   - Verify that `payInvoice()` delegates signing
   - Verify that private keys are never in the agent's memory

## Acceptance Criteria

- [ ] Agent payment path uses remote signer (`litd`) for all signing operations
- [ ] Agent process holds no private key material
- [ ] Remote signer config validated on startup
- [ ] Integration test verifies signing delegation
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 11. This is a security hardening task for the agent runtime. Lower priority than DB foundation tasks but required before production agent deployment._
