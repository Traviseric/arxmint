import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  AgentFedimintWallet,
  createFedimintAgentWallet,
} from "../lib/fedimint-sdk.ts";

// ---- AgentFedimintWallet — TTL Enforcement ----

test("isExpired is false immediately after construction", async (t) => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60, // 1 minute — plenty of time
    maxBalanceMsats: 100_000,
  });
  try {
    assert.equal(wallet.isExpired, false, "fresh wallet should not be expired");
  } finally {
    await wallet.destroy();
  }
});

test("isExpired is true after TTL elapses", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 0.01, // 10ms
    maxBalanceMsats: 100_000,
  });
  // Wait past the TTL
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(wallet.isExpired, true, "wallet should be expired after TTL");
  // No need to destroy — already destroyed by the internal timer
});

test("isExpired is true immediately after destroy()", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 300, // 5 minutes — would not expire naturally
    maxBalanceMsats: 100_000,
  });
  assert.equal(wallet.isExpired, false, "should not be expired before destroy");
  await wallet.destroy();
  assert.equal(wallet.isExpired, true, "should be expired after destroy()");
});

test("connect() throws 'expired' after TTL elapses", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 0.001, // 1ms — expires immediately
    maxBalanceMsats: 100_000,
  });
  // Wait past the TTL
  await new Promise((resolve) => setTimeout(resolve, 10));
  // connect() calls requireAlive() first — throws before any WASM load
  await assert.rejects(
    () => wallet.connect(),
    /expired/i,
    "connect() should throw when wallet is expired"
  );
});

test("connect() throws 'expired' after manual destroy()", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 300,
    maxBalanceMsats: 100_000,
  });
  await wallet.destroy();
  await assert.rejects(
    () => wallet.connect(),
    /expired/i,
    "connect() should throw after destroy()"
  );
});

// ---- AgentFedimintWallet — Balance State ----

test("balanceMsats starts at 0", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60,
    maxBalanceMsats: 100_000,
  });
  try {
    assert.equal(wallet.balanceMsats, 0);
  } finally {
    await wallet.destroy();
  }
});

test("balanceSats starts at 0", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60,
    maxBalanceMsats: 100_000,
  });
  try {
    assert.equal(wallet.balanceSats, 0);
  } finally {
    await wallet.destroy();
  }
});

// ---- AgentFedimintWallet — TTL Time Remaining ----

test("timeRemaining is positive for non-expired wallet", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60,
    maxBalanceMsats: 100_000,
  });
  try {
    assert.ok(wallet.timeRemaining > 0, `expected positive timeRemaining, got ${wallet.timeRemaining}`);
  } finally {
    await wallet.destroy();
  }
});

test("isExpired is true after destroy() even though TTL has not elapsed", async () => {
  // timeRemaining is computed from TTL timestamp and stays positive after destroy().
  // Use isExpired (which checks _destroyed flag) to confirm wallet is dead.
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 300, // 5 minutes — would not expire naturally
    maxBalanceMsats: 100_000,
  });
  assert.ok(wallet.timeRemaining > 0, "TTL should still have time remaining");
  await wallet.destroy();
  assert.equal(wallet.isExpired, true, "isExpired should be true after destroy()");
});

// ---- AgentFedimintWallet — Scope ----

test("scope returns the configured value", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60,
    maxBalanceMsats: 100_000,
    scope: "community-A",
  });
  try {
    assert.equal(wallet.scope, "community-A");
  } finally {
    await wallet.destroy();
  }
});

test("scope is undefined when not configured", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60,
    maxBalanceMsats: 100_000,
  });
  try {
    assert.equal(wallet.scope, undefined);
  } finally {
    await wallet.destroy();
  }
});

// ---- createFedimintAgentWallet factory ----

test("createFedimintAgentWallet returns an AgentFedimintWallet instance", async () => {
  const wallet = createFedimintAgentWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 60,
    maxBalanceMsats: 50_000,
  });
  try {
    assert.ok(wallet instanceof AgentFedimintWallet);
    assert.equal(wallet.isExpired, false);
  } finally {
    await wallet.destroy();
  }
});

// ---- Expired wallet rejects all operations ----

test("spend() throws on expired wallet", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 0.001,
    maxBalanceMsats: 100_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await assert.rejects(
    () => wallet.spend(1000),
    /expired/i,
    "spend() should throw when wallet is expired"
  );
});

test("receive() throws on expired wallet", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 0.001,
    maxBalanceMsats: 100_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await assert.rejects(
    () => wallet.receive("cashu-notes-token"),
    /expired/i,
    "receive() should throw when wallet is expired"
  );
});

test("payInvoice() throws on expired wallet", async () => {
  const wallet = new AgentFedimintWallet({
    inviteCode: "test-invite-code",
    ttlSeconds: 0.001,
    maxBalanceMsats: 100_000,
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await assert.rejects(
    () => wallet.payInvoice("lnbc1000n1abc"),
    /expired/i,
    "payInvoice() should throw when wallet is expired"
  );
});
