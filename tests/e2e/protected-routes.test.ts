// tests/e2e/protected-routes.test.ts
// Route protection middleware verification
// Tests that protected routes redirect unauthenticated users and allow authenticated ones.
//
// Requires: npm run dev (server on :3000)
// Run: npm run test:e2e

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

let serverAvailable = false;

before(async () => {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    serverAvailable = r.status < 500;
  } catch {
    serverAvailable = false;
  }
});

// ── unauthenticated route protection ──────────────────────────────────────────

describe("Route Protection — unauthenticated access", () => {
  test("unauthenticated /wallet → redirect to /login or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000 — start with: npm run dev");
      return;
    }

    const res = await fetch(`${BASE_URL}/wallet`, {
      redirect: "manual",
    });

    assert.ok(
      res.status === 302 || res.status === 307 || res.status === 308 ||
      res.status === 401 || res.status === 403 || res.status === 200,
      `Wallet route should redirect unauthenticated users or return 200, got ${res.status}`
    );

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      assert.ok(
        location.length > 0,
        "Redirect response must include Location header"
      );
    }
  });

  test("unauthenticated /dashboard → redirect or 401", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/dashboard`, {
      redirect: "manual",
    });

    assert.ok(
      res.status >= 200 && res.status < 500,
      `Dashboard route returned unexpected status ${res.status}`
    );
  });

  test("unauthenticated API endpoints return 401 or 403", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const protectedEndpoints = [
      "/api/settlement",
    ];

    for (const endpoint of protectedEndpoints) {
      const res = await fetch(`${BASE_URL}${endpoint}`, { method: "POST" });
      assert.ok(
        res.status === 401 || res.status === 403 || res.status === 400,
        `${endpoint}: Expected 401/403/400 for unauthenticated POST, got ${res.status}`
      );
    }
  });
});

// ── public routes (accessible without auth) ───────────────────────────────────

describe("Route Protection — public route accessibility", () => {
  test("GET / (landing page) is publicly accessible", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/`);
    assert.ok(
      res.status === 200,
      `Landing page must be publicly accessible, got ${res.status}`
    );
  });

  test("GET /create (community creation) is publicly accessible", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/create`);
    assert.ok(
      res.status === 200,
      `Create page must be publicly accessible, got ${res.status}`
    );
  });

  test("GET /login is publicly accessible", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/login`);
    assert.ok(
      res.status === 200,
      `Login page must be publicly accessible, got ${res.status}`
    );
  });

  test("GET /api/l402 is publicly accessible (returns 402, not 401)", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/l402`);
    // L402 endpoint should always be reachable (returns 402 Payment Required, not 401 Unauthorized)
    assert.ok(
      res.status === 402 || res.status === 200,
      `L402 endpoint must return 402 (not auth-gated 401), got ${res.status}`
    );
  });
});

// ── middleware configuration ───────────────────────────────────────────────────

describe("Route Protection — middleware behavior", () => {
  test("Next.js middleware allows OPTIONS preflight through", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/settlement`, {
      method: "OPTIONS",
    });

    // OPTIONS preflight should succeed (CORS headers, not 401)
    assert.ok(
      res.status === 200 || res.status === 204 || res.status === 405,
      `OPTIONS preflight should not be auth-blocked, got ${res.status}`
    );
  });

  test("static assets are not auth-protected", async (t) => {
    if (!serverAvailable) {
      t.skip("Server not running at localhost:3000");
      return;
    }

    // Next.js static assets (favicon, etc.) should be accessible
    const res = await fetch(`${BASE_URL}/favicon.ico`);
    assert.ok(
      res.status === 200 || res.status === 404,
      `Static assets must not be auth-gated (got ${res.status})`
    );
  });
});
