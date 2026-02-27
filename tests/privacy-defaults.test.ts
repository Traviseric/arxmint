import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  computePrivacyScore,
  isLayerAvailable,
  PRIVACY_PRESETS,
} from "../lib/privacy-defaults.ts";

test("Silent Payments is unavailable on fedimint backend", () => {
  assert.equal(isLayerAvailable("silentPayments", "fedimint"), false);
  assert.equal(isLayerAvailable("silentPayments", "cashu"), true);
});

test("Ark layer is marked unavailable until integration lands", () => {
  assert.equal(isLayerAvailable("arkSpends", "cashu"), false);
  assert.equal(isLayerAvailable("arkSpends", "fedimint"), false);
});

test("privacy score is weighted by backend-usable layers", () => {
  const cfg = PRIVACY_PRESETS.maximum; // all toggles enabled

  const fedimintScore = computePrivacyScore(cfg, "fedimint");
  const cashuScore = computePrivacyScore(cfg, "cashu");

  // Fedimint excludes Silent Payments + Ark until available.
  assert.equal(fedimintScore, 65);
  // Cashu includes Silent Payments, still excludes Ark.
  assert.equal(cashuScore, 80);
  assert.ok(cashuScore > fedimintScore);
});
