// tests/e2e/auth-nostr.test.ts
// Layer 2.1: NIP-98 Nostr authentication E2E tests
// Tests the full NIP-98 flow: sign event → POST → session cookie
//
// Requires: npm run dev (server on :3000)
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { generateSecretKey, getPublicKey, finalizeEvent } from "nostr-tools";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:3000";
const AUTH_URL = `${BASE_URL}/api/auth`;

let serverAvailable = false;

// ── connectivity check ────────────────────────────────────────────────────────

before(async () => {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.status < 500;
  } catch {
    serverAvailable = false;
  }
});

// ── NIP-98 auth flow ──────────────────────────────────────────────────────────

describe("Nostr NIP-98 Auth — valid flow", () => {
  test("2.1: valid NIP-98 event → 200 response", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000 — start with: npm run dev");
      return;
    }

    const sk = generateSecretKey();
    const pk = getPublicKey(sk);

    const event = finalizeEvent(
      {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["u", AUTH_URL],
          ["method", "POST"],
        ],
        content: "",
      },
      sk
    );

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey: pk, signedEvent: event }),
    });

    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected 200/201 for valid NIP-98 auth, got ${res.status}`
    );
  });

  test("2.1: successful auth sets session cookie", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const sk = generateSecretKey();
    const pk = getPublicKey(sk);

    const event = finalizeEvent(
      {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["u", AUTH_URL], ["method", "POST"]],
        content: "",
      },
      sk
    );

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey: pk, signedEvent: event }),
    });

    assert.ok(
      res.status === 200 || res.status === 201,
      `Expected 200/201 for session-setting auth call, got ${res.status}`
    );

    const setCookie = res.headers.get("set-cookie");
    assert.ok(
      setCookie?.includes("session") || setCookie?.includes("token"),
      `Expected session cookie in set-cookie header, got: ${setCookie}`
    );
  });
});

// ── NIP-98 auth — failure modes ───────────────────────────────────────────────

describe("Nostr NIP-98 Auth — failure modes", () => {
  test("expired NIP-98 event (stale timestamp) → 400 or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const sk = generateSecretKey();
    const pk = getPublicKey(sk);

    // Create event with timestamp 1 hour in the past (stale)
    const staleTimestamp = Math.floor(Date.now() / 1000) - 3600;
    const event = finalizeEvent(
      {
        kind: 27235,
        created_at: staleTimestamp,
        tags: [["u", AUTH_URL], ["method", "POST"]],
        content: "",
      },
      sk
    );

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey: pk, signedEvent: event }),
    });

    assert.ok(
      res.status === 400 || res.status === 401 || res.status === 422,
      `Expected rejection for stale NIP-98 event, got ${res.status}`
    );
  });

  test("wrong pubkey (mismatch with event signer) → 400 or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const sk1 = generateSecretKey();
    const sk2 = generateSecretKey();
    const pk2 = getPublicKey(sk2); // different from signer

    // Sign with sk1 but claim pk2
    const event = finalizeEvent(
      {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["u", AUTH_URL], ["method", "POST"]],
        content: "",
      },
      sk1
    );

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey: pk2, signedEvent: event }), // mismatched pubkey
    });

    assert.ok(
      res.status === 400 || res.status === 401,
      `Expected rejection for pubkey mismatch, got ${res.status}`
    );
  });

  test("bad signature (tampered event content) → 400 or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const sk = generateSecretKey();
    const pk = getPublicKey(sk);

    const event = finalizeEvent(
      {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["u", AUTH_URL], ["method", "POST"]],
        content: "",
      },
      sk
    );

    // Tamper with event content after signing
    const tampered = { ...event, content: "injected-content" };

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey: pk, signedEvent: tampered }),
    });

    assert.ok(
      res.status === 400 || res.status === 401,
      `Expected rejection for tampered event, got ${res.status}`
    );
  });

  test("missing signedEvent body → 400", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pubkey: "no-event-here" }),
    });

    assert.ok(
      res.status === 400 || res.status === 401 || res.status === 422,
      `Expected 400/401/422 for missing signedEvent, got ${res.status}`
    );
  });
});
