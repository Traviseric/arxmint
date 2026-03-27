// Test stub — Node.js experimental strip-types runner cannot remap .js→.ts
// imports, so this file must exist for the test runner to resolve
// `import "./merchant.js"` in client.ts.
//
// Production builds use merchant.ts (tsup resolves .js→.ts via TypeScript
// moduleResolution: bundler). Tests mock these via mock.module() or use .ts directly.
export async function createCheckoutSession() {
  throw new Error("merchant.js stub: use mock.module() in tests");
}
export async function pollCheckoutStatus() {
  throw new Error("merchant.js stub: use mock.module() in tests");
}
export async function payCheckoutInvoice() {
  throw new Error("merchant.js stub: use mock.module() in tests");
}
