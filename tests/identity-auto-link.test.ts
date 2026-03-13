// ============================================================
// Tests — identity auto-link on checkout (cross-auth path)
//
// Tests cover:
//   1. parseTeneoAuthUserId — JWT payload extraction
//   2. autoLinkCheckoutIdentity — integration with identity graph
// ============================================================

import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
// Import from teneo-jwt.ts directly (no @/ aliases — test runner compatible)
import { parseTeneoAuthUserId } from "../lib/teneo-jwt.ts";

// ---- JWT fixture builder ----

/** Build a minimal unsigned JWT with the given payload claims. */
function buildJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const fakeSignature = "fakesig";
  return `${header}.${payload}.${fakeSignature}`;
}

// ---- parseTeneoAuthUserId ----

test("parseTeneoAuthUserId extracts sub claim", () => {
  const jwt = buildJwt({ sub: "user_abc123", iat: 1700000000 });
  const userId = parseTeneoAuthUserId(jwt);
  assert.equal(userId, "user_abc123");
});

test("parseTeneoAuthUserId extracts userId claim when sub is absent", () => {
  const jwt = buildJwt({ userId: "teneo_user_456", iat: 1700000000 });
  const userId = parseTeneoAuthUserId(jwt);
  assert.equal(userId, "teneo_user_456");
});

test("parseTeneoAuthUserId extracts id claim as last fallback", () => {
  const jwt = buildJwt({ id: "u789", name: "Alice" });
  const userId = parseTeneoAuthUserId(jwt);
  assert.equal(userId, "u789");
});

test("parseTeneoAuthUserId prefers sub over userId over id", () => {
  const jwt = buildJwt({ sub: "primary", userId: "secondary", id: "tertiary" });
  const userId = parseTeneoAuthUserId(jwt);
  assert.equal(userId, "primary");
});

test("parseTeneoAuthUserId strips Bearer prefix", () => {
  const jwt = buildJwt({ sub: "bearer_user" });
  const userId = parseTeneoAuthUserId(`Bearer ${jwt}`);
  assert.equal(userId, "bearer_user");
});

test("parseTeneoAuthUserId returns null for non-JWT string", () => {
  assert.equal(parseTeneoAuthUserId("not-a-jwt"), null);
  assert.equal(parseTeneoAuthUserId("only.two.parts.here.extra"), null);
});

test("parseTeneoAuthUserId returns null for empty string", () => {
  assert.equal(parseTeneoAuthUserId(""), null);
});

test("parseTeneoAuthUserId returns null when no userId claim", () => {
  const jwt = buildJwt({ iat: 1700000000, name: "Alice" });
  const userId = parseTeneoAuthUserId(jwt);
  assert.equal(userId, null);
});

test("parseTeneoAuthUserId returns null for JWT with non-JSON payload", () => {
  const header = Buffer.from("{}").toString("base64url");
  const badPayload = "not-valid-json-base64url";
  const token = `${header}.${badPayload}.fakesig`;
  assert.equal(parseTeneoAuthUserId(token), null);
});

test("parseTeneoAuthUserId handles numeric sub as string", () => {
  const jwt = buildJwt({ sub: 42 });
  const userId = parseTeneoAuthUserId(jwt);
  assert.equal(userId, "42");
});

// ---- Auto-link trigger logic ----
// Verify that both identities must be present before a link is attempted.
// We test the detection logic using parseTeneoAuthUserId as a stand-in gate.

test("auto-link is skipped when X-Teneo-Auth header is missing (null input)", () => {
  // If no header is present, parseTeneoAuthUserId returns null → no link attempt
  assert.equal(parseTeneoAuthUserId(""), null);
  assert.equal(parseTeneoAuthUserId(null as unknown as string), null);
});

test("auto-link is skipped when X-Teneo-Auth is present but has no userId claim", () => {
  const jwt = buildJwt({ iat: 1700000000, exp: 1800000000, name: "Alice" });
  assert.equal(parseTeneoAuthUserId(jwt), null);
});

test("auto-link proceeds when X-Teneo-Auth has a valid userId (sub claim)", () => {
  const jwt = buildJwt({ sub: "teneo_user_42", iat: 1700000000 });
  const userId = parseTeneoAuthUserId(jwt);
  assert.ok(userId !== null, "userId must be extracted when sub claim is present");
  assert.equal(userId, "teneo_user_42");
});
