// ============================================================
// ArxMint — Creator Payout Forward tests
//
// Exercises lib/creator-payout.ts (the core state machine + validation) against
// in-memory fakes for the store and forwarders — no live DB or Lightning backend.
//
// Auth (X-Marketplace-Secret → "marketplace-system") and rate limiting are
// enforced in the route (app/api/creator-payout/route.ts) via getCallerFromRequest,
// which is covered by the auth-middleware tests.
// ============================================================

import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import so the resolver hook is active first
const { forwardCreatorPayout, validatePayoutRequest } = await import("../lib/creator-payout.ts");

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function makeStore(seed: Record<string, { status: string; forward_id: string | null }> = {}) {
  const rows = new Map(Object.entries(seed));
  const calls = { insert: 0, reclaim: 0, finalize: [] as Array<{ id: string; status: string; extra: any }> };
  return {
    rows,
    calls,
    async get(id: string) {
      return rows.has(id) ? { ...rows.get(id)! } : null;
    },
    async insertProcessing(req: any) {
      calls.insert++;
      if (rows.has(req.payoutId)) return false; // PK conflict
      rows.set(req.payoutId, { status: "processing", forward_id: null });
      return true;
    },
    async reclaimProcessing(id: string) {
      calls.reclaim++;
      const row = rows.get(id);
      if (row && (row.status === "pending" || row.status === "failed")) {
        rows.set(id, { ...row, status: "processing" });
        return true;
      }
      return false;
    },
    async finalize(id: string, status: string, extra: any) {
      calls.finalize.push({ id, status, extra });
      rows.set(id, { status, forward_id: extra.forwardId ?? null });
    },
  };
}

function makeForwarders(behavior: { bolt12?: any; lnaddress?: any } = {}) {
  const calls = { bolt12: [] as any[], lnaddress: [] as any[] };
  return {
    calls,
    async bolt12(params: any) {
      calls.bolt12.push(params);
      if (behavior.bolt12 === "throw") throw new Error("phoenixd boom");
      return behavior.bolt12 ?? { success: true };
    },
    async lnaddress(params: any) {
      calls.lnaddress.push(params);
      if (behavior.lnaddress === "throw") throw new Error("lnbits boom");
      return behavior.lnaddress ?? { success: true };
    },
  };
}

const goodReq = () => ({
  payoutId: "po_test_1",
  merchant: "seed-teneo",
  amountSats: 12740,
  destination: { type: "bolt12", value: "lno1qqsyreaderofferexamplevalue1234567890" },
  reference: { orderId: "ord_9", brandId: "brand_x" },
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test("validate: rejects missing payoutId", () => {
  const v = validatePayoutRequest({ ...goodReq(), payoutId: "" });
  assert.equal(v.ok, false);
});

test("validate: rejects missing merchant", () => {
  const v = validatePayoutRequest({ ...goodReq(), merchant: "  " });
  assert.equal(v.ok, false);
});

test("validate: rejects non-positive / non-integer amountSats", () => {
  assert.equal(validatePayoutRequest({ ...goodReq(), amountSats: 0 }).ok, false);
  assert.equal(validatePayoutRequest({ ...goodReq(), amountSats: -5 }).ok, false);
  assert.equal(validatePayoutRequest({ ...goodReq(), amountSats: "abc" }).ok, false);
});

test("validate: floors fractional sats to an integer", () => {
  const v = validatePayoutRequest({ ...goodReq(), amountSats: 12740.9 });
  assert.equal(v.ok, true);
  assert.equal(v.ok && v.req.amountSats, 12740);
});

test("validate: rejects fiat / unknown destination type", () => {
  assert.equal(validatePayoutRequest({ ...goodReq(), destination: { type: "fiat", value: "x" } }).ok, false);
  assert.equal(validatePayoutRequest({ ...goodReq(), destination: { type: "bolt12", value: "" } }).ok, false);
  assert.equal(validatePayoutRequest({ ...goodReq(), destination: null }).ok, false);
});

test("validate: accepts a well-formed bolt12 request", () => {
  const v = validatePayoutRequest(goodReq());
  assert.equal(v.ok, true);
  assert.equal(v.ok && v.req.destination.type, "bolt12");
});

// ---------------------------------------------------------------------------
// Forward — happy paths
// ---------------------------------------------------------------------------

test("bolt12 success → forwarded, row finalized, correct sats + memo passed", async () => {
  const store = makeStore();
  const fwd = makeForwarders();
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.status, "forwarded");
  assert.equal(res.body.forwardId, "po_test_1");

  // forwarded via bolt12 with the exact sats + a memo carrying payoutId + orderId
  assert.equal(fwd.calls.bolt12.length, 1);
  assert.equal(fwd.calls.lnaddress.length, 0);
  assert.equal(fwd.calls.bolt12[0].amountSats, 12740);
  assert.equal(fwd.calls.bolt12[0].offer, goodReq().destination.value);
  assert.match(fwd.calls.bolt12[0].memo, /po_test_1/);
  assert.match(fwd.calls.bolt12[0].memo, /ord_9/);

  // store claimed then finalized forwarded
  assert.equal(store.calls.insert, 1);
  assert.equal(store.rows.get("po_test_1")?.status, "forwarded");
});

test("lnaddress success → forwarded via the lnaddress rail", async () => {
  const store = makeStore();
  const fwd = makeForwarders();
  const req = { ...goodReq(), payoutId: "po_ln", destination: { type: "lnaddress", value: "creator@walletofsatoshi.com" } };
  const res = await forwardCreatorPayout(req, store, fwd);

  assert.equal(res.body.status, "forwarded");
  assert.equal(fwd.calls.lnaddress.length, 1);
  assert.equal(fwd.calls.bolt12.length, 0);
  assert.equal(fwd.calls.lnaddress[0].lightningAddress, "creator@walletofsatoshi.com");
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

test("replay of a forwarded payout → idempotent, no second forward", async () => {
  const store = makeStore({ po_test_1: { status: "forwarded", forward_id: "po_test_1" } });
  const fwd = makeForwarders();
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.body.success, true);
  assert.equal(res.body.status, "forwarded");
  assert.equal(res.body.idempotent, true);
  assert.equal(res.body.forwardId, "po_test_1");
  assert.equal(fwd.calls.bolt12.length, 0, "must not forward again");
  assert.equal(store.calls.insert, 0, "must not re-insert");
});

test("in-flight (processing) payout → pending idempotent, no forward", async () => {
  const store = makeStore({ po_test_1: { status: "processing", forward_id: null } });
  const fwd = makeForwarders();
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.body.success, false);
  assert.equal(res.body.status, "pending");
  assert.equal(res.body.idempotent, true);
  assert.equal(fwd.calls.bolt12.length, 0);
});

test("pending row → re-claimed and re-attempted, succeeds", async () => {
  const store = makeStore({ po_test_1: { status: "pending", forward_id: null } });
  const fwd = makeForwarders();
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(store.calls.reclaim, 1);
  assert.equal(fwd.calls.bolt12.length, 1, "re-attempts the forward");
  assert.equal(res.body.status, "forwarded");
});

test("lost insert race (PK conflict) → pending idempotent, no forward", async () => {
  // Seed with the same id so insertProcessing sees a conflict and returns false.
  const store = makeStore();
  // Pre-fill the row AFTER get() would see nothing by overriding get to return null first.
  const realGet = store.get.bind(store);
  let firstGet = true;
  store.get = async (id: string) => {
    if (firstGet) {
      firstGet = false;
      return null; // nobody there when we look
    }
    return realGet(id);
  };
  store.rows.set("po_test_1", { status: "processing", forward_id: null }); // concurrent caller won the insert
  const fwd = makeForwarders();
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.body.status, "pending");
  assert.equal(res.body.idempotent, true);
  assert.equal(fwd.calls.bolt12.length, 0);
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

test("unsupported (Lightning backend not configured) → pending, 200, row pending", async () => {
  const store = makeStore();
  const fwd = makeForwarders({ bolt12: { success: false, unsupported: true, error: "PHOENIXD_URL not configured" } });
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, false);
  assert.equal(res.body.status, "pending");
  assert.equal(store.rows.get("po_test_1")?.status, "pending");
});

test("real forward failure → 502 failed, row failed (retryable)", async () => {
  const store = makeStore();
  const fwd = makeForwarders({ bolt12: { success: false, error: "Phoenixd /payoffer failed: 402" } });
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.status, 502);
  assert.equal(res.body.success, false);
  assert.equal(res.body.status, "failed");
  assert.equal(store.rows.get("po_test_1")?.status, "failed");
});

test("forwarder throws → 502 failed, row failed", async () => {
  const store = makeStore();
  const fwd = makeForwarders({ bolt12: "throw" });
  const res = await forwardCreatorPayout(goodReq(), store, fwd);

  assert.equal(res.status, 502);
  assert.equal(res.body.status, "failed");
  assert.match(res.body.error ?? "", /boom/);
  assert.equal(store.rows.get("po_test_1")?.status, "failed");
});

test("validation failure → 400, store never touched", async () => {
  const store = makeStore();
  const fwd = makeForwarders();
  const res = await forwardCreatorPayout({ ...goodReq(), payoutId: "" }, store, fwd);

  assert.equal(res.status, 400);
  assert.equal(res.body.status, "failed");
  assert.equal(store.calls.insert, 0);
  assert.equal(fwd.calls.bolt12.length, 0);
});
