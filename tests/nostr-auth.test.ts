import test from "node:test";
import assert from "node:assert/strict";
import { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { verifyNip98Auth } from "../lib/nostr-auth.ts";

const NIP98_KIND = 27235;
const TEST_URL = "http://localhost:3000/api/test";
const TEST_METHOD = "GET";

/** Build a properly signed NIP-98 base64 token */
function buildToken(url: string, method: string, createdAt?: number): string {
  const sk = generateSecretKey();
  const event = finalizeEvent(
    {
      kind: NIP98_KIND,
      created_at: createdAt ?? Math.floor(Date.now() / 1000),
      tags: [
        ["u", url],
        ["method", method.toUpperCase()],
      ],
      content: "",
    },
    sk
  );
  return btoa(JSON.stringify(event));
}

test("verifyNip98Auth rejects events older than 60 seconds", () => {
  const oldCreatedAt = Math.floor(Date.now() / 1000) - 120;
  const token = buildToken(TEST_URL, TEST_METHOD, oldCreatedAt);
  const result = verifyNip98Auth(token, TEST_URL, TEST_METHOD);
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /expired/i);
});

test("verifyNip98Auth rejects events with URL mismatch", () => {
  const token = buildToken("http://localhost:3000/api/other", TEST_METHOD);
  const result = verifyNip98Auth(token, TEST_URL, TEST_METHOD);
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /url mismatch/i);
});

test("verifyNip98Auth rejects events with method mismatch", () => {
  const token = buildToken(TEST_URL, "GET");
  const result = verifyNip98Auth(token, TEST_URL, "POST");
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /method mismatch/i);
});

test("verifyNip98Auth rejects malformed tokens gracefully", () => {
  const result = verifyNip98Auth("not-valid-base64!@#", TEST_URL, TEST_METHOD);
  assert.equal(result.valid, false);
  assert.ok(result.error !== undefined);
});

test("verifyNip98Auth rejects events missing u tag", () => {
  const sk = generateSecretKey();
  const event = finalizeEvent(
    {
      kind: NIP98_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["method", TEST_METHOD]],
      content: "",
    },
    sk
  );
  const token = btoa(JSON.stringify(event));
  const result = verifyNip98Auth(token, TEST_URL, TEST_METHOD);
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /url mismatch/i);
});

test("verifyNip98Auth rejects events with invalid (tampered) signature", () => {
  const sk = generateSecretKey();
  const event = finalizeEvent(
    {
      kind: NIP98_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", TEST_URL],
        ["method", TEST_METHOD],
      ],
      content: "",
    },
    sk
  );
  // Tamper with the signature — valid structure, invalid crypto
  const tampered = { ...event, sig: "a".repeat(128) };
  const token = btoa(JSON.stringify(tampered));
  const result = verifyNip98Auth(token, TEST_URL, TEST_METHOD);
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /invalid signature/i);
});

test("verifyNip98Auth accepts a valid signed NIP-98 event", () => {
  const token = buildToken(TEST_URL, TEST_METHOD);
  const result = verifyNip98Auth(token, TEST_URL, TEST_METHOD);
  assert.equal(result.valid, true);
  assert.ok(typeof result.pubkey === "string");
  assert.ok(result.pubkey!.length > 0);
});

test("verifyNip98Auth strips Nostr prefix from auth header", () => {
  const base64 = buildToken(TEST_URL, TEST_METHOD);
  const header = `Nostr ${base64}`;
  const result = verifyNip98Auth(header, TEST_URL, TEST_METHOD);
  assert.equal(result.valid, true);
});
