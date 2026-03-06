// Test stub — Node.js experimental strip-types runner cannot remap .js→.ts
// imports, so this file must exist for the test runner to resolve
// `import "./checkout.js"` in client.ts.
//
// Production builds use checkout.ts (tsup resolves .js→.ts via TypeScript
// moduleResolution: bundler). Tests override these via mock.module().
export async function createCheckout() {
  throw new Error("checkout.js stub: use mock.module() in tests");
}
export async function listPayments() {
  throw new Error("checkout.js stub: use mock.module() in tests");
}
export async function pollStatus() {
  throw new Error("checkout.js stub: use mock.module() in tests");
}
