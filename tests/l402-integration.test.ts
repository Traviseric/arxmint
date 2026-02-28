import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  detectPaymentMethod,
  parseCashuAuthHeader,
  buildCashuChallenge,
} from "../lib/cashu-paywall.ts";

// @ts-ignore -- parseL402Challenge is exported for testing
import { parseL402Challenge } from "../lib/lightning-agent.ts";

// ---- L402 Header Parsing ----

test("parseL402Challenge parses valid WWW-Authenticate header", () => {
  const header = 'L402 macaroon="abc123xyz", invoice="lnbc1000n1abc"';
  const result = parseL402Challenge(header);
  assert.equal(result.macaroon, "abc123xyz");
  assert.ok(result.invoice.startsWith("lnbc"), "invoice should start with lnbc");
});

test("parseL402Challenge handles whitespace in values", () => {
  const header = 'L402 macaroon="mac-token-1", invoice="lnbc500n1def"';
  const result = parseL402Challenge(header);
  assert.equal(result.macaroon, "mac-token-1");
  assert.equal(result.invoice, "lnbc500n1def");
});

test("parseL402Challenge throws on missing invoice", () => {
  assert.throws(
    () => parseL402Challenge('L402 macaroon="abc123"'),
    /invalid l402 challenge/i
  );
});

test("parseL402Challenge throws on missing macaroon", () => {
  assert.throws(
    () => parseL402Challenge('L402 invoice="lnbc1abc"'),
    /invalid l402 challenge/i
  );
});

test("parseL402Challenge throws on completely invalid header", () => {
  assert.throws(
    () => parseL402Challenge("Bearer sometoken"),
    /invalid l402 challenge/i
  );
});

test("parseL402Challenge throws on empty string", () => {
  assert.throws(() => parseL402Challenge(""), /invalid l402 challenge/i);
});

// ---- detectPaymentMethod ----

test("detectPaymentMethod detects L402 scheme", () => {
  const result = detectPaymentMethod("L402 mac123:preimage456");
  assert.equal(result.method, "l402");
  assert.equal(result.token, "mac123:preimage456");
});

test("detectPaymentMethod detects Cashu NUT-24 scheme", () => {
  const result = detectPaymentMethod("Cashu cashuAqAB1234");
  assert.equal(result.method, "cashu");
  assert.ok(result.token, "token should be non-null");
});

test("detectPaymentMethod returns none for null header", () => {
  const result = detectPaymentMethod(null);
  assert.equal(result.method, "none");
  assert.equal(result.token, null);
});

test("detectPaymentMethod returns none for unknown auth scheme", () => {
  const result = detectPaymentMethod("Bearer eyJhbGci...");
  assert.equal(result.method, "none");
  assert.equal(result.token, null);
});

// ---- NUT-24 Cashu Auth Header Parsing ----

test("parseCashuAuthHeader extracts token from Cashu header", () => {
  const token = parseCashuAuthHeader("Cashu cashuAqAB1234token");
  assert.equal(token, "cashuAqAB1234token");
});

test("parseCashuAuthHeader is case-insensitive for scheme", () => {
  const token = parseCashuAuthHeader("CASHU mytoken");
  assert.equal(token, "mytoken");
});

test("parseCashuAuthHeader returns null for non-Cashu header", () => {
  const token = parseCashuAuthHeader("Bearer sometoken");
  assert.equal(token, null);
});

test("parseCashuAuthHeader returns null for null input", () => {
  const token = parseCashuAuthHeader(null);
  assert.equal(token, null);
});

test("parseCashuAuthHeader returns null for L402 header", () => {
  const token = parseCashuAuthHeader('L402 macaroon="x", invoice="lnbc1"');
  assert.equal(token, null);
});

// ---- buildCashuChallenge ----

test("buildCashuChallenge generates correct challenge header", () => {
  const challenge = buildCashuChallenge({
    priceSats: 100,
    mintUrl: "http://mint.local",
    unit: "sat",
  });
  assert.ok(challenge.includes('mint="http://mint.local"'), "should include mint URL");
  assert.ok(challenge.includes('amount="100"'), "should include amount");
  assert.ok(challenge.includes('unit="sat"'), "should include unit");
});

test("buildCashuChallenge defaults unit to sat", () => {
  const challenge = buildCashuChallenge({
    priceSats: 50,
    mintUrl: "http://mint.local",
  });
  assert.ok(challenge.includes('unit="sat"'));
});

test("buildCashuChallenge includes description when provided", () => {
  const challenge = buildCashuChallenge({
    priceSats: 200,
    mintUrl: "http://mint.local",
    description: "API access",
  });
  assert.ok(challenge.includes("description="), "should include description");
  assert.ok(challenge.includes("API access"), "should include description text");
});
