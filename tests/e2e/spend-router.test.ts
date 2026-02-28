// tests/e2e/spend-router.test.ts
// Layer 3.3: Spend router path selection E2E tests
// Tests the spend router with realistic wallet states and privacy modes.
// These tests use the library directly (no live server needed for most cases).
//
// Run: npm run test:e2e

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { selectSpendPath } from "../../lib/spend-router.ts";

// ── fixtures ──────────────────────────────────────────────────────────────────

const FULL_BALANCE = {
  fedimintMsats: 500_000_000,
  cashuSats: 500_000,
  lightningSats: 500_000,
  onchainSats: 5_000_000,
  arkSats: 0,
  totalSats: 5_000_000,
};

const CASHU_ONLY = {
  fedimintMsats: 0,
  cashuSats: 500_000,
  lightningSats: 0,
  onchainSats: 0,
  arkSats: 0,
  totalSats: 500_000,
};

const LIGHTNING_ONLY = {
  fedimintMsats: 0,
  cashuSats: 0,
  lightningSats: 500_000,
  onchainSats: 0,
  arkSats: 0,
  totalSats: 500_000,
};

const ALL_BACKENDS = {
  cashu: true,
  fedimint: true,
  lightning: true,
  ark: false,
  onchain: true,
  silentPayments: false,
};

// ── amount-based routing (auto mode) ─────────────────────────────────────────

describe("Spend Router — amount-based routing (auto)", () => {
  test("small amount (<10k sats) + standard privacy → cashu backend", () => {
    const route = selectSpendPath(500, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.equal(route.path, "cashu", "Small amounts should route via Cashu (no fees)");
    assert.equal(route.available, true);
    assert.equal(route.estimatedFeeSats, 0, "Cashu transfers are fee-free");
  });

  test("large amount (>100k sats) → lightning backend", () => {
    const route = selectSpendPath(200_000, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.equal(route.path, "lightning", "Large amounts should use Lightning");
    assert.equal(route.available, true);
  });

  test("large Lightning payment has fee estimate", () => {
    const route = selectSpendPath(200_000, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.ok(route.estimatedFeeSats > 0, "Lightning should have routing fee estimate");
  });
});

// ── privacy preference routing ────────────────────────────────────────────────

describe("Spend Router — privacy preference routing", () => {
  test("maximum privacy → ecash path (cashu or fedimint)", () => {
    const route = selectSpendPath(50_000, FULL_BALANCE, ALL_BACKENDS, "cashu", "maximum");
    assert.ok(
      route.path === "cashu" || route.path === "fedimint",
      `Maximum privacy must use ecash, got: ${route.path}`
    );
    assert.equal(route.privacy, "maximum");
    assert.equal(route.available, true);
  });

  test("high privacy avoids Lightning", () => {
    const route = selectSpendPath(50_000, FULL_BALANCE, ALL_BACKENDS, "cashu", "high");
    assert.notEqual(route.path, "lightning", "High privacy should not select Lightning");
    assert.equal(route.available, true);
  });

  test("standard privacy can use Lightning for medium amounts", () => {
    const route = selectSpendPath(50_000, FULL_BALANCE, ALL_BACKENDS, "cashu", "standard");
    // Standard privacy routes by amount — Lightning is fine
    assert.equal(route.available, true);
    assert.ok(
      typeof route.path === "string" && route.path.length > 0,
      "Must return a valid path"
    );
  });
});

// ── fallback behavior ─────────────────────────────────────────────────────────

describe("Spend Router — fallback behavior", () => {
  test("cashu unavailable → falls back to fedimint or lightning", () => {
    const noCashu = { ...ALL_BACKENDS, cashu: false };
    const route = selectSpendPath(500, FULL_BALANCE, noCashu, "cashu", "auto");
    assert.notEqual(route.path, "cashu", "Should not pick disabled cashu");
    assert.equal(route.available, true);
  });

  test("cashu-only balance + no lightning → routes via cashu", () => {
    const onlyCashu = { ...ALL_BACKENDS, lightning: false, fedimint: false, onchain: false };
    const route = selectSpendPath(500, CASHU_ONLY, onlyCashu, "cashu", "auto");
    assert.equal(route.path, "cashu");
    assert.equal(route.available, true);
  });

  test("lightning-only balance → routes via lightning", () => {
    const onlyLightning = { ...ALL_BACKENDS, cashu: false, fedimint: false, onchain: false };
    const route = selectSpendPath(50_000, LIGHTNING_ONLY, onlyLightning, "cashu", "auto");
    assert.equal(route.path, "lightning");
    assert.equal(route.available, true);
  });

  test("all backends have zero balance → available=false", () => {
    const empty = { fedimintMsats: 0, cashuSats: 0, lightningSats: 0, onchainSats: 0, arkSats: 0, totalSats: 0 };
    const route = selectSpendPath(500, empty, ALL_BACKENDS, "cashu", "auto");
    assert.equal(route.available, false);
  });

  test("all backends disabled → available=false, no throw", () => {
    const none = { cashu: false, fedimint: false, lightning: false, ark: false, onchain: false, silentPayments: false };
    const route = selectSpendPath(500, FULL_BALANCE, none, "cashu", "auto");
    assert.equal(route.available, false);
    assert.ok(typeof route.path === "string", "path must always be a string");
  });
});

// ── route metadata ────────────────────────────────────────────────────────────

describe("Spend Router — route metadata", () => {
  test("route includes human-readable label", () => {
    const route = selectSpendPath(500, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.ok(typeof route.label === "string" && route.label.length > 0, "Must have label");
  });

  test("route includes selection reason", () => {
    const route = selectSpendPath(500, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.ok(typeof route.reason === "string" && route.reason.length > 0, "Must have reason");
  });

  test("route includes alternatives array", () => {
    const route = selectSpendPath(500, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.ok(Array.isArray(route.alternatives), "Must have alternatives array");
  });

  test("selected path not in alternatives", () => {
    const route = selectSpendPath(500, FULL_BALANCE, ALL_BACKENDS, "cashu", "auto");
    assert.ok(
      !route.alternatives.includes(route.path),
      "Selected path should not appear in alternatives"
    );
  });

  test("privacy field is a valid privacy level string", () => {
    const route = selectSpendPath(500, FULL_BALANCE, ALL_BACKENDS, "cashu", "maximum");
    assert.ok(
      ["maximum", "high", "standard", "low"].includes(route.privacy),
      `Invalid privacy level: ${route.privacy}`
    );
  });
});
