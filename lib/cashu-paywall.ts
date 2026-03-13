// ============================================================
// ArxMint — NUT-24 Ecash Paywall
//
// Implementation delegated to @te-btc/cashu-l402 (265 tests, production-ready).
// This file is a thin re-export shim — callers import from here unchanged.
//
// To upgrade to npm-published package: change the import path from
// "file:../../cashu-l402" (local workspace) to "@te-btc/cashu-l402" (npm)
// in package.json once the package is published.
// ============================================================

export type {
  CashuPaywallConfig,
  CashuPaymentResult,
} from "@te-btc/cashu-l402";

export {
  parseCashuAuthHeader,
  buildCashuChallenge,
  detectPaymentMethod,
  buildDualChallenge,
  verifyCashuPayment,
  verifyCashuPaymentOffline,
  verifyCashuPaymentSmart,
} from "@te-btc/cashu-l402";
