// Test stub — Node.js experimental strip-types runner cannot remap .js→.ts
// imports, so this file must exist for the test runner to resolve
// `import "./l402.js"` in client.ts.
//
// Production builds use l402.ts (tsup resolves .js→.ts via TypeScript
// moduleResolution: bundler). Tests call these functions directly from .ts.
export function parseL402Challenge() {
  throw new Error("l402.js stub: import from l402.ts directly in tests");
}
export function buildL402AuthHeader() {
  throw new Error("l402.js stub: import from l402.ts directly in tests");
}
export async function l402AgentFetch() {
  throw new Error("l402.js stub: import from l402.ts directly in tests");
}
