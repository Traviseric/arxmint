import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { lookupLnurlMerchant } from "../lib/lnurl-merchant-registry.ts";

// ---------------------------------------------------------------------------
// lookupLnurlMerchant() — hardcoded fallback merchants
//
// When Supabase is unavailable (no DB credentials in test env), the module
// gracefully falls back to FALLBACK_MERCHANTS. The dynamic import of
// @/lib/supabase throws (unresolvable in test env) and is caught by the
// try-catch in lookupLnurlMerchant(), so the fallback is always exercised.
// ---------------------------------------------------------------------------

test("lookupLnurlMerchant() returns merchant data for known username 'glacier'", async () => {
  const result = await lookupLnurlMerchant("glacier");
  assert.ok(result !== null, "should return a merchant object for 'glacier'");
  assert.equal(result!.username, "glacier");
  assert.ok(result!.displayName.length > 0, "displayName should be non-empty");
});

test("lookupLnurlMerchant() returns merchant data for known username 'teneo'", async () => {
  const result = await lookupLnurlMerchant("teneo");
  assert.ok(result !== null, "should return a merchant object for 'teneo'");
  assert.equal(result!.username, "teneo");
  assert.ok(result!.displayName.length > 0, "displayName should be non-empty");
});

test("lookupLnurlMerchant() returns null for unknown username", async () => {
  const result = await lookupLnurlMerchant("nonexistent-merchant-xyz-404");
  assert.equal(result, null, "should return null for unknown username");
});

test("lookupLnurlMerchant() normalizes username to lowercase", async () => {
  // 'GLACIER' should resolve to the same fallback as 'glacier'
  const result = await lookupLnurlMerchant("GLACIER");
  assert.ok(result !== null, "should resolve case-insensitively");
  assert.equal(result!.username, "glacier");
});

test("lookupLnurlMerchant() returns null for an empty string username", async () => {
  const result = await lookupLnurlMerchant("");
  assert.equal(result, null, "empty username should return null");
});
