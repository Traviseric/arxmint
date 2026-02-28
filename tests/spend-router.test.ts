import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { selectSpendPath } from "../lib/spend-router.ts";

// ---- Test fixtures ----

/** Full balance across all backends */
const RICH_BALANCE = {
  fedimintMsats: 1_000_000_000, // 1M sats in msats
  cashuSats: 1_000_000,
  lightningSats: 1_000_000,
  onchainSats: 10_000_000,
  arkSats: 0,
  totalSats: 10_000_000,
};

/** Empty balance — no funds in any backend */
const EMPTY_BALANCE = {
  fedimintMsats: 0,
  cashuSats: 0,
  lightningSats: 0,
  onchainSats: 0,
  arkSats: 0,
  totalSats: 0,
};

/** All backends enabled (ark stays false — upstream SDK not yet released) */
const ALL_AVAILABLE = {
  cashu: true,
  fedimint: true,
  lightning: true,
  ark: false,
  onchain: true,
  silentPayments: false,
};

/** No backends enabled */
const NONE_AVAILABLE = {
  cashu: false,
  fedimint: false,
  lightning: false,
  ark: false,
  onchain: false,
  silentPayments: false,
};

// ---- Amount-based routing (auto mode) ----

test("routes small amounts (<10k sats) to Cashu in auto mode", () => {
  const route = selectSpendPath(100, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.equal(route.path, "cashu");
  assert.equal(route.available, true);
  assert.equal(route.estimatedFeeSats, 0, "Cashu transfers are free");
});

test("routes medium amounts (10k-100k sats) to Lightning in auto mode", () => {
  const route = selectSpendPath(50_000, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.equal(route.path, "lightning");
  assert.equal(route.available, true);
});

test("lightning fee is > 0 for non-zero payment", () => {
  const route = selectSpendPath(50_000, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.ok(route.estimatedFeeSats > 0, "Lightning should have routing fees");
});

// ---- Privacy preference routing ----

test("maximum privacy selects highest privacy path (ecash)", () => {
  const route = selectSpendPath(
    50_000,
    RICH_BALANCE,
    ALL_AVAILABLE,
    "cashu",
    "maximum"
  );
  // cashu and fedimint both score 95 — both are "maximum" privacy
  assert.ok(
    route.path === "cashu" || route.path === "fedimint",
    `expected ecash path, got: ${route.path}`
  );
  assert.equal(route.privacy, "maximum");
  assert.equal(route.available, true);
});

test("high privacy avoids lightning (prefers ecash)", () => {
  const route = selectSpendPath(50_000, RICH_BALANCE, ALL_AVAILABLE, "cashu", "high");
  assert.notEqual(route.path, "lightning", "high privacy should not pick Lightning");
  assert.equal(route.available, true);
});

test("auto mode with small amount and no ecash falls back to Lightning", () => {
  const noEcash = { ...ALL_AVAILABLE, cashu: false, fedimint: false };
  const route = selectSpendPath(100, RICH_BALANCE, noEcash, "cashu", "auto");
  assert.equal(route.path, "lightning");
  assert.equal(route.available, true);
});

// ---- Fallback behavior ----

test("falls back when cashu unavailable — uses fedimint or lightning", () => {
  const noCashu = { ...ALL_AVAILABLE, cashu: false };
  const route = selectSpendPath(100, RICH_BALANCE, noCashu, "cashu", "auto");
  assert.notEqual(route.path, "cashu", "should not pick unavailable cashu");
  assert.equal(route.available, true);
});

test("returns available=false when all backends have zero balance", () => {
  const route = selectSpendPath(100, EMPTY_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.equal(route.available, false);
});

test("returns available=false when all backends are disabled", () => {
  const route = selectSpendPath(100, RICH_BALANCE, NONE_AVAILABLE, "cashu", "auto");
  assert.equal(route.available, false);
});

test("unavailable route still returns a path string (not throws)", () => {
  // selectSpendPath does NOT throw — it returns {available: false}
  const route = selectSpendPath(100, EMPTY_BALANCE, NONE_AVAILABLE, "cashu", "auto");
  assert.ok(typeof route.path === "string", "path should always be a string");
  assert.equal(route.available, false);
});

// ---- Route metadata ----

test("route includes human-readable label", () => {
  const route = selectSpendPath(100, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.ok(typeof route.label === "string" && route.label.length > 0);
});

test("route includes reason for selection", () => {
  const route = selectSpendPath(100, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.ok(typeof route.reason === "string" && route.reason.length > 0);
});

test("route includes alternatives array", () => {
  const route = selectSpendPath(100, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.ok(Array.isArray(route.alternatives));
});

test("alternatives do not include the selected path", () => {
  const route = selectSpendPath(100, RICH_BALANCE, ALL_AVAILABLE, "cashu", "auto");
  assert.ok(
    !route.alternatives.includes(route.path),
    "alternatives should not include the selected path"
  );
});
