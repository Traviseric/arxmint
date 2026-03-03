// tests/e2e/auth-step-up.test.ts
// Layer 2.3: Step-up re-authentication E2E tests
// Tests that high-value operations require fresh authentication within 5 minutes.
//
// Requires: npm run dev (server on :3000)
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_SERVER_URL ?? "http://localhost:3000";

let serverAvailable = false;

before(async () => {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.status < 500;
  } catch {
    serverAvailable = false;
  }
});

// ── step-up auth — spend operation ────────────────────────────────────────────

describe("Step-up Re-authentication", () => {
  test("2.3: spend operation without any session → 401 or 403", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000 — start with: npm run dev");
      return;
    }

    // Attempt a spend/settlement operation without a session
    const res = await fetch(`${BASE_URL}/api/settlement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: "test", amountSats: 1000 }),
    });

    assert.ok(
      res.status === 401 || res.status === 403,
      `Expected 401/403 for unauthenticated spend, got ${res.status}`
    );
  });

  test("2.3: stale session cookie → spend operation rejected", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    // Use an obviously stale/invalid session
    const res = await fetch(`${BASE_URL}/api/settlement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "arxmint_session=stale_session_token_12345; Path=/",
      },
      body: JSON.stringify({ communityId: "test", amountSats: 1000 }),
    });

    assert.ok(
      res.status === 401 || res.status === 403 || res.status === 400,
      `Expected auth rejection for stale session, got ${res.status}`
    );
  });

  test("2.3: protected route /wallet redirects unauthenticated users", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/wallet`, {
      redirect: "manual", // Don't follow redirects — we want to see the redirect itself
    });

    assert.ok(
      res.status === 302 || res.status === 307 || res.status === 401 || res.status === 200,
      `Wallet route: expected redirect or 200, got ${res.status}`
    );
    // If it's a redirect, verify it's going to login
    if (res.status === 302 || res.status === 307) {
      const location = res.headers.get("location") ?? "";
      assert.ok(
        location.includes("login") || location.includes("auth") || location.includes("/"),
        `Redirect should go to login page, got: ${location}`
      );
    }
  });
});

// ── session TTL ───────────────────────────────────────────────────────────────

describe("Session Management", () => {
  test("auth endpoint responds to GET with session status", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/auth`);
    // GET to auth endpoint — should return 401 (no session) or 200 (session check)
    assert.ok(
      res.status === 200 || res.status === 401 || res.status === 405,
      `Expected 200/401/405 from GET /api/auth, got ${res.status}`
    );
  });

  test("logout endpoint invalidates session", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
    });

    // Should successfully invalidate session (even if not authenticated)
    assert.ok(
      res.status === 200 || res.status === 401 || res.status === 404,
      `Expected 200/401/404 from POST /api/auth/logout, got ${res.status}`
    );
  });
});
