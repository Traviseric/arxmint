import test from "node:test";
import assert from "node:assert/strict";

import {
  validateEscrowCreate,
  resolveEscrowFund,
  resolveEscrowRelease,
  resolveEscrowDispute,
  resolveEscrowResolve,
  resolveEscrowVoid,
  shouldTimeRelease,
  buildEscrowStateChangedPayload,
  isEscrowStatus,
  isEscrowReleaseCondition,
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
      amountSats: 10000n,
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
        amountSats: 10000n,
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
        amountSats: 10000n,
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
        amountSats: 0n,
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
        amountSats: 5000n,
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
      amountSats: 5000n,
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
    amountSats: 21000000n,
    currency: "BTC",
    releaseCondition: "manual" as const,
    releasesAt: null,
    status: "funded" as const,
    invoiceId: null,
    paymentSessionId: "session-1",
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
    amountSats: 50000n,
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
    amountSats: 50000n,
    releaseCondition: "manual",
  });

  const funded = resolveEscrowFund("pending_funding", "pay_session_abc");
  assert.equal(funded.status, "funded");

  const disputed = resolveEscrowDispute("funded");
  assert.equal(disputed.status, "disputed");

  const resolved = resolveEscrowResolve("disputed");
  assert.equal(resolved.status, "resolved");
});
