import test from "node:test";
import assert from "node:assert/strict";

import {
  validateEscrowCreate,
  resolveEscrowFund,
  resolveEscrowRelease,
  resolveEscrowDispute,
  resolveEscrowResolve,
  resolveEscrowVoid,
  resolveEscrowMediatorAssign,
  resolveEscrowMediatorResolve,
  shouldTimeRelease,
  buildEscrowStateChangedPayload,
  isEscrowStatus,
  isEscrowReleaseCondition,
  isEscrowResolution,
} from "../lib/escrow.ts";

// ── isEscrowStatus ────────────────────────────────────────

test("isEscrowStatus accepts valid statuses", () => {
  assert.equal(isEscrowStatus("pending_funding"), true);
  assert.equal(isEscrowStatus("funded"), true);
  assert.equal(isEscrowStatus("released"), true);
  assert.equal(isEscrowStatus("disputed"), true);
  assert.equal(isEscrowStatus("resolved"), true);
  assert.equal(isEscrowStatus("voided"), true);
  assert.equal(isEscrowStatus("unknown"), false);
});

// ── isEscrowReleaseCondition ──────────────────────────────

test("isEscrowReleaseCondition accepts valid conditions", () => {
  assert.equal(isEscrowReleaseCondition("manual"), true);
  assert.equal(isEscrowReleaseCondition("time_based"), true);
  assert.equal(isEscrowReleaseCondition("delivery_confirmed"), true);
  assert.equal(isEscrowReleaseCondition("dispute_resolved"), true);
  assert.equal(isEscrowReleaseCondition("bad"), false);
});

// ── validateEscrowCreate ──────────────────────────────────

test("validateEscrowCreate accepts valid params", () => {
  assert.doesNotThrow(() =>
    validateEscrowCreate({
      payerId: "payer-1",
      payeeId: "payee-1",
      amountSats: BigInt(10000),
      releaseCondition: "manual",
    })
  );
});

test("validateEscrowCreate rejects missing payerId", () => {
  assert.throws(
    () =>
      validateEscrowCreate({
        payerId: "",
        payeeId: "payee-1",
        amountSats: BigInt(10000),
        releaseCondition: "manual",
      }),
    /payerId is required/
  );
});

test("validateEscrowCreate rejects same payer and payee", () => {
  assert.throws(
    () =>
      validateEscrowCreate({
        payerId: "user-1",
        payeeId: "user-1",
        amountSats: BigInt(10000),
        releaseCondition: "manual",
      }),
    /must be different/
  );
});

test("validateEscrowCreate rejects non-positive amountSats", () => {
  assert.throws(
    () =>
      validateEscrowCreate({
        payerId: "payer-1",
        payeeId: "payee-1",
        amountSats: BigInt(0),
        releaseCondition: "manual",
      }),
    /positive/
  );
});

test("validateEscrowCreate requires releasesAt for time_based", () => {
  assert.throws(
    () =>
      validateEscrowCreate({
        payerId: "payer-1",
        payeeId: "payee-1",
        amountSats: BigInt(5000),
        releaseCondition: "time_based",
      }),
    /releasesAt is required/
  );
});

test("validateEscrowCreate accepts time_based with future releasesAt", () => {
  const future = new Date(Date.now() + 86400_000);
  assert.doesNotThrow(() =>
    validateEscrowCreate({
      payerId: "payer-1",
      payeeId: "payee-1",
      amountSats: BigInt(5000),
      releaseCondition: "time_based",
      releasesAt: future,
    })
  );
});

// ── resolveEscrowFund ─────────────────────────────────────

test("resolveEscrowFund transitions pending_funding → funded", () => {
  const result = resolveEscrowFund("pending_funding", "session-abc");
  assert.equal(result.status, "funded");
  assert.equal(result.paymentSessionId, "session-abc");
});

test("resolveEscrowFund rejects already funded escrow", () => {
  assert.throws(() => resolveEscrowFund("funded", "session-abc"), /Cannot fund/);
});

test("resolveEscrowFund rejects empty paymentSessionId", () => {
  assert.throws(() => resolveEscrowFund("pending_funding", ""), /paymentSessionId is required/);
});

// ── resolveEscrowRelease ──────────────────────────────────

test("resolveEscrowRelease allows payer to release funded escrow", () => {
  const result = resolveEscrowRelease(
    { status: "funded", payerId: "payer-1", releaseCondition: "manual" },
    "payer-1"
  );
  assert.equal(result.status, "released");
});

test("resolveEscrowRelease allows system release for time_based", () => {
  const result = resolveEscrowRelease(
    { status: "funded", payerId: "payer-1", releaseCondition: "time_based" },
    "system"
  );
  assert.equal(result.status, "released");
});

test("resolveEscrowRelease rejects payee releasing", () => {
  assert.throws(
    () =>
      resolveEscrowRelease(
        { status: "funded", payerId: "payer-1", releaseCondition: "manual" },
        "payee-1"
      ),
    /Only the payer/
  );
});

test("resolveEscrowRelease rejects release when not funded", () => {
  assert.throws(
    () =>
      resolveEscrowRelease(
        { status: "disputed", payerId: "payer-1", releaseCondition: "manual" },
        "payer-1"
      ),
    /Cannot release/
  );
});

// ── resolveEscrowDispute ──────────────────────────────────

test("resolveEscrowDispute transitions funded → disputed", () => {
  const result = resolveEscrowDispute("funded");
  assert.equal(result.status, "disputed");
});

test("resolveEscrowDispute rejects non-funded state", () => {
  assert.throws(() => resolveEscrowDispute("pending_funding"), /Cannot dispute/);
  assert.throws(() => resolveEscrowDispute("released"), /Cannot dispute/);
});

// ── resolveEscrowResolve ──────────────────────────────────

test("resolveEscrowResolve transitions disputed → resolved", () => {
  const result = resolveEscrowResolve("disputed");
  assert.equal(result.status, "resolved");
});

test("resolveEscrowResolve rejects non-disputed state", () => {
  assert.throws(() => resolveEscrowResolve("funded"), /Cannot resolve/);
});

// ── resolveEscrowVoid ─────────────────────────────────────

test("resolveEscrowVoid transitions pending_funding → voided", () => {
  assert.equal(resolveEscrowVoid("pending_funding").status, "voided");
});

test("resolveEscrowVoid transitions funded → voided", () => {
  assert.equal(resolveEscrowVoid("funded").status, "voided");
});

test("resolveEscrowVoid rejects voiding a released escrow", () => {
  assert.throws(() => resolveEscrowVoid("released"), /Cannot void/);
});

test("resolveEscrowVoid rejects voiding an already voided escrow", () => {
  assert.throws(() => resolveEscrowVoid("voided"), /Cannot void/);
});

// ── shouldTimeRelease ─────────────────────────────────────

test("shouldTimeRelease returns true when deadline has passed", () => {
  const past = new Date(Date.now() - 1000);
  assert.equal(
    shouldTimeRelease({ status: "funded", releaseCondition: "time_based", releasesAt: past }),
    true
  );
});

test("shouldTimeRelease returns false when deadline is in future", () => {
  const future = new Date(Date.now() + 86400_000);
  assert.equal(
    shouldTimeRelease({ status: "funded", releaseCondition: "time_based", releasesAt: future }),
    false
  );
});

test("shouldTimeRelease returns false for non-time_based condition", () => {
  const past = new Date(Date.now() - 1000);
  assert.equal(
    shouldTimeRelease({ status: "funded", releaseCondition: "manual", releasesAt: past }),
    false
  );
});

test("shouldTimeRelease returns false when not funded", () => {
  const past = new Date(Date.now() - 1000);
  assert.equal(
    shouldTimeRelease({ status: "disputed", releaseCondition: "time_based", releasesAt: past }),
    false
  );
});

// ── buildEscrowStateChangedPayload ────────────────────────

test("buildEscrowStateChangedPayload serialises BigInt amountSats as string", () => {
  const now = new Date();
  const escrow = {
    id: "escrow-1",
    payerId: "payer-1",
    payeeId: "payee-1",
    amountSats: BigInt(21000000),
    currency: "BTC",
    releaseCondition: "manual" as const,
    releasesAt: null,
    status: "funded" as const,
    invoiceId: null,
    paymentSessionId: "session-1",
    mediatorAddress: null,
    disputeReason: null,
    disputeEvidence: null,
    resolvedAs: null,
    splitBps: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };

  const payload = buildEscrowStateChangedPayload(escrow, "pending_funding", "payer-1", null);

  assert.equal(payload.event, "escrow.state_changed");
  assert.equal(payload.data.amountSats, "21000000");
  assert.equal(payload.data.escrowId, "escrow-1");
  assert.equal(payload.data.previousStatus, "pending_funding");
  assert.equal(payload.data.status, "funded");
  assert.equal(payload.data.actor, "payer-1");

  // Must be JSON-serialisable (BigInt would throw)
  assert.doesNotThrow(() => JSON.stringify(payload));
});

// ── Full flow: create → fund → release ───────────────────

test("full create → fund → release flow (state machine only)", () => {
  // Create
  validateEscrowCreate({
    payerId: "payer-1",
    payeeId: "payee-1",
    amountSats: BigInt(50000),
    releaseCondition: "manual",
  });

  // Fund
  const funded = resolveEscrowFund("pending_funding", "pay_session_xyz");
  assert.equal(funded.status, "funded");

  // Release
  const released = resolveEscrowRelease(
    { status: "funded", payerId: "payer-1", releaseCondition: "manual" },
    "payer-1"
  );
  assert.equal(released.status, "released");
});

// ── Full flow: create → fund → dispute → resolve ─────────

test("full create → fund → dispute → resolve flow (state machine only)", () => {
  validateEscrowCreate({
    payerId: "payer-1",
    payeeId: "payee-1",
    amountSats: BigInt(50000),
    releaseCondition: "manual",
  });

  const funded = resolveEscrowFund("pending_funding", "pay_session_abc");
  assert.equal(funded.status, "funded");

  const disputed = resolveEscrowDispute("funded");
  assert.equal(disputed.status, "disputed");

  const resolved = resolveEscrowResolve("disputed");
  assert.equal(resolved.status, "resolved");
});

// ═══════════════════════════════════════════════════════════
// Phase 2: Dispute flow, mediator assignment, mediator resolution
// ═══════════════════════════════════════════════════════════

// ── isEscrowResolution ────────────────────────────────────

test("isEscrowResolution accepts valid values", () => {
  assert.equal(isEscrowResolution("buyer"), true);
  assert.equal(isEscrowResolution("seller"), true);
  assert.equal(isEscrowResolution("split"), true);
  assert.equal(isEscrowResolution("refund"), false);
  assert.equal(isEscrowResolution(""), false);
});

// ── resolveEscrowMediatorAssign ───────────────────────────

test("resolveEscrowMediatorAssign transitions disputed → mediator_assigned", () => {
  const result = resolveEscrowMediatorAssign("disputed");
  assert.equal(result.status, "mediator_assigned");
});

test("resolveEscrowMediatorAssign rejects non-disputed status", () => {
  assert.throws(() => resolveEscrowMediatorAssign("funded"), /Cannot assign mediator/);
  assert.throws(() => resolveEscrowMediatorAssign("resolved"), /Cannot assign mediator/);
});

// ── resolveEscrowResolve with mediator_assigned ───────────

test("resolveEscrowResolve accepts mediator_assigned status", () => {
  const result = resolveEscrowResolve("mediator_assigned");
  assert.equal(result.status, "resolved");
});

// ── resolveEscrowMediatorResolve — buyer resolution ───────

test("resolveEscrowMediatorResolve resolves disputed → resolved for buyer", () => {
  const result = resolveEscrowMediatorResolve({
    currentStatus: "disputed",
    mediatorAddress: "mediator-npub1abc",
    actorId: "mediator-npub1abc",
    resolution: "buyer",
    reason: "Goods not delivered",
  });
  assert.equal(result.status, "resolved");
  assert.equal(result.resolvedAs, "buyer");
  assert.equal(result.splitBps, null);
});

test("resolveEscrowMediatorResolve resolves mediator_assigned → resolved for seller", () => {
  const result = resolveEscrowMediatorResolve({
    currentStatus: "mediator_assigned",
    mediatorAddress: "mediator-npub1abc",
    actorId: "mediator-npub1abc",
    resolution: "seller",
    reason: "Buyer failed to inspect within window",
  });
  assert.equal(result.status, "resolved");
  assert.equal(result.resolvedAs, "seller");
  assert.equal(result.splitBps, null);
});

// ── resolveEscrowMediatorResolve — split resolution ───────

test("resolveEscrowMediatorResolve resolves disputed → resolved with split", () => {
  const result = resolveEscrowMediatorResolve({
    currentStatus: "disputed",
    mediatorAddress: "mediator-npub1abc",
    actorId: "mediator-npub1abc",
    resolution: "split",
    splitBps: 6000,
    reason: "Partial delivery confirmed",
  });
  assert.equal(result.status, "resolved");
  assert.equal(result.resolvedAs, "split");
  assert.equal(result.splitBps, 6000);
});

test("resolveEscrowMediatorResolve accepts splitBps of 0 (all to seller)", () => {
  const result = resolveEscrowMediatorResolve({
    currentStatus: "disputed",
    mediatorAddress: "mediator-npub1abc",
    actorId: "mediator-npub1abc",
    resolution: "split",
    splitBps: 0,
    reason: "Buyer claim rejected",
  });
  assert.equal(result.splitBps, 0);
});

test("resolveEscrowMediatorResolve accepts splitBps of 10000 (all to buyer)", () => {
  const result = resolveEscrowMediatorResolve({
    currentStatus: "disputed",
    mediatorAddress: "mediator-npub1abc",
    actorId: "mediator-npub1abc",
    resolution: "split",
    splitBps: 10000,
    reason: "Seller defaulted",
  });
  assert.equal(result.splitBps, 10000);
});

// ── resolveEscrowMediatorResolve — auth failures ──────────

test("resolveEscrowMediatorResolve rejects non-mediator caller", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "disputed",
        mediatorAddress: "mediator-npub1abc",
        actorId: "payer-1",
        resolution: "buyer",
        reason: "Fraudulent attempt",
      }),
    /Only the designated mediator/
  );
});

test("resolveEscrowMediatorResolve rejects when no mediatorAddress on escrow", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "disputed",
        mediatorAddress: null,
        actorId: "payer-1",
        resolution: "buyer",
        reason: "Attempted self-resolve",
      }),
    /no mediator assigned/
  );
});

// ── resolveEscrowMediatorResolve — validation failures ────

test("resolveEscrowMediatorResolve rejects non-disputed status", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "funded",
        mediatorAddress: "mediator-npub1abc",
        actorId: "mediator-npub1abc",
        resolution: "buyer",
        reason: "Should fail",
      }),
    /Cannot resolve escrow in status/
  );
});

test("resolveEscrowMediatorResolve rejects invalid resolution value", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "disputed",
        mediatorAddress: "mediator-npub1abc",
        actorId: "mediator-npub1abc",
        resolution: "both" as "buyer",
        reason: "Invalid",
      }),
    /Invalid resolution/
  );
});

test("resolveEscrowMediatorResolve rejects split without splitBps", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "disputed",
        mediatorAddress: "mediator-npub1abc",
        actorId: "mediator-npub1abc",
        resolution: "split",
        reason: "Partial",
      }),
    /splitBps is required/
  );
});

test("resolveEscrowMediatorResolve rejects splitBps out of range", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "disputed",
        mediatorAddress: "mediator-npub1abc",
        actorId: "mediator-npub1abc",
        resolution: "split",
        splitBps: 15000,
        reason: "Out of range",
      }),
    /splitBps must be an integer between 0 and 10000/
  );
});

test("resolveEscrowMediatorResolve rejects missing reason", () => {
  assert.throws(
    () =>
      resolveEscrowMediatorResolve({
        currentStatus: "disputed",
        mediatorAddress: "mediator-npub1abc",
        actorId: "mediator-npub1abc",
        resolution: "buyer",
        reason: "",
      }),
    /reason is required/
  );
});

// ── Full flow: dispute → mediator_assigned → split resolve ─

test("full dispute → mediator_assigned → split resolution flow", () => {
  const disputed = resolveEscrowDispute("funded");
  assert.equal(disputed.status, "disputed");

  const assigned = resolveEscrowMediatorAssign("disputed");
  assert.equal(assigned.status, "mediator_assigned");

  const result = resolveEscrowMediatorResolve({
    currentStatus: "mediator_assigned",
    mediatorAddress: "npub1mediator",
    actorId: "npub1mediator",
    resolution: "split",
    splitBps: 5000,
    reason: "Equal fault on both sides",
  });
  assert.equal(result.status, "resolved");
  assert.equal(result.resolvedAs, "split");
  assert.equal(result.splitBps, 5000);
});

// ── Time-based auto-release mock-clock test ───────────────

test("shouldTimeRelease uses custom now parameter (mock clock)", () => {
  const releasesAt = new Date("2024-01-15T12:00:00Z");

  // At exactly the release time — should release
  const atRelease = new Date("2024-01-15T12:00:00Z");
  assert.equal(
    shouldTimeRelease({ status: "funded", releaseCondition: "time_based", releasesAt }, atRelease),
    true
  );

  // One millisecond before — should NOT release
  const justBefore = new Date("2024-01-15T11:59:59.999Z");
  assert.equal(
    shouldTimeRelease({ status: "funded", releaseCondition: "time_based", releasesAt }, justBefore),
    false
  );

  // One hour after — should release
  const afterRelease = new Date("2024-01-15T13:00:00Z");
  assert.equal(
    shouldTimeRelease({ status: "funded", releaseCondition: "time_based", releasesAt }, afterRelease),
    true
  );
});

test("shouldTimeRelease is false for disputed escrow (frozen during dispute)", () => {
  const past = new Date(Date.now() - 1000);
  assert.equal(
    shouldTimeRelease({ status: "disputed", releaseCondition: "time_based", releasesAt: past }),
    false
  );
});
