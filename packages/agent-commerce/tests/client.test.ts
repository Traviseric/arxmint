/**
 * @arxmint/agent-commerce — unit tests
 *
 * Uses Node built-in test runner. The .js stub files exist so the strip-types
 * runner can resolve .js imports in client.ts. We mock them to forward to the
 * real .ts implementations, then control behaviour via globalThis.fetch.
 */
import { test, mock } from "node:test";
import assert from "node:assert/strict";

// ─── Fetch mock ───────────────────────────────────────────────────────────────

let mockFetchImpl: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;

// @ts-ignore — override global fetch for tests
globalThis.fetch = async (url: string, init?: RequestInit): Promise<Response> => {
  if (mockFetchImpl) return mockFetchImpl(url, init);
  throw new Error(`Unmocked fetch call to: ${url}`);
};

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function make402Response(macaroon: string, invoice: string): Response {
  return new Response("Payment Required", {
    status: 402,
    headers: {
      "WWW-Authenticate": `L402 macaroon="${macaroon}", invoice="${invoice}"`,
    },
  });
}

// ─── Mock .js stubs → real .ts implementations ──────────────────────────────
// Node's strip-types runner cannot remap .js → .ts automatically.
// We import the real .ts files first, then mock the .js stubs to forward.

const l402Module = await import("../src/l402.ts");
const merchantModule = await import("../src/merchant.ts");

await mock.module("../src/l402.js", {
  namedExports: {
    parseL402Challenge: l402Module.parseL402Challenge,
    buildL402AuthHeader: l402Module.buildL402AuthHeader,
    l402AgentFetch: l402Module.l402AgentFetch,
  },
});

await mock.module("../src/merchant.js", {
  namedExports: {
    createCheckoutSession: merchantModule.createCheckoutSession,
    pollCheckoutStatus: merchantModule.pollCheckoutStatus,
    payCheckoutInvoice: merchantModule.payCheckoutInvoice,
  },
});

// Import client after mocks are registered
const { AgentCommerceClient } = await import("../src/client.ts");

// ─── Re-export direct refs for primitive tests ───────────────────────────────
const { parseL402Challenge, buildL402AuthHeader, l402AgentFetch } = l402Module;

// ─── L402 Parsing ─────────────────────────────────────────────────────────────

test("parseL402Challenge: parses valid header", () => {
  const header = 'L402 macaroon="abc123", invoice="lnbc1000u1p..."';
  const result = parseL402Challenge(header);
  assert.equal(result.macaroon, "abc123");
  assert.equal(result.invoice, "lnbc1000u1p...");
});

test("parseL402Challenge: throws on malformed header", () => {
  assert.throws(
    () => parseL402Challenge("Bearer token123"),
    /Invalid L402/,
  );
});

test("parseL402Challenge: throws when macaroon missing", () => {
  assert.throws(
    () => parseL402Challenge('L402 invoice="lnbc..."'),
    /Invalid L402/,
  );
});

test("parseL402Challenge: decodes sats from u-multiplier invoice", () => {
  const header = 'L402 macaroon="m", invoice="lnbc1000u1ptest"';
  const result = parseL402Challenge(header);
  assert.equal(result.amountSats, 100_000);
});

test("buildL402AuthHeader: formats header correctly", () => {
  const header = buildL402AuthHeader("macaroon_abc", "preimage_xyz");
  assert.equal(header, "L402 macaroon_abc:preimage_xyz");
});

// ─── l402AgentFetch ───────────────────────────────────────────────────────────

test("l402AgentFetch: passes through non-402 responses", async () => {
  mockFetchImpl = async () => makeJsonResponse({ ok: true });
  const resp = await l402AgentFetch("https://example.com/resource", async () => "preimage");
  assert.equal(resp.status, 200);
});

test("l402AgentFetch: pays 402 and retries", async () => {
  let callCount = 0;
  mockFetchImpl = async () => {
    callCount++;
    if (callCount === 1) return make402Response("mac1", "lnbc100u1ptest");
    return makeJsonResponse({ data: "secret" });
  };

  let paidInvoice = "";
  const resp = await l402AgentFetch(
    "https://example.com/paid",
    async (invoice) => { paidInvoice = invoice; return "preimage123"; },
  );

  assert.equal(resp.status, 200);
  assert.equal(callCount, 2);
  assert.equal(paidInvoice, "lnbc100u1ptest");
});

test("l402AgentFetch: throws when invoice exceeds maxSats", async () => {
  mockFetchImpl = async () => make402Response("mac1", "lnbc10u1ptest"); // 10*100 = 1000 sats
  await assert.rejects(
    () => l402AgentFetch("https://example.com", async () => "x", undefined, 500),
    /exceeds maxL402Sats/,
  );
});

test("l402AgentFetch: throws when 402 missing WWW-Authenticate", async () => {
  mockFetchImpl = async () => new Response("Payment Required", { status: 402 });
  await assert.rejects(
    () => l402AgentFetch("https://example.com", async () => "x"),
    /WWW-Authenticate/,
  );
});

// ─── AgentCommerceClient constructor ─────────────────────────────────────────

test("AgentCommerceClient: throws when baseUrl missing", () => {
  assert.throws(
    // @ts-ignore — intentional bad config
    () => new AgentCommerceClient({ agentWallet: {} }),
    /baseUrl is required/,
  );
});

test("AgentCommerceClient: throws when agentWallet missing", () => {
  assert.throws(
    // @ts-ignore — intentional bad config
    () => new AgentCommerceClient({ baseUrl: "https://arxmint.com" }),
    /agentWallet is required/,
  );
});

test("AgentCommerceClient: constructs with valid config", () => {
  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
  });
  assert.ok(client instanceof AgentCommerceClient);
});

// ─── AgentCommerceClient.fetch ────────────────────────────────────────────────

test("AgentCommerceClient.fetch: passes through 200 responses", async () => {
  mockFetchImpl = async () => makeJsonResponse({ hello: "world" });
  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
  });
  const resp = await client.fetch("https://arxmint.com/api/data");
  assert.equal(resp.status, 200);
});

test("AgentCommerceClient.fetch: auto-pays L402 challenge", async () => {
  let callCount = 0;
  mockFetchImpl = async () => {
    callCount++;
    if (callCount === 1) return make402Response("mac_test", "lnbc100u1ptest");
    return makeJsonResponse({ resource: "unlocked" });
  };

  const wallet = { melt: async (_: string) => ({ preimage: "preimage_abc" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
  });

  const resp = await client.fetch("https://arxmint.com/api/gated");
  assert.equal(resp.status, 200);
  assert.equal(callCount, 2);
});

// ─── Budget enforcement ───────────────────────────────────────────────────────

test("AgentCommerceClient.fetch: enforces maxL402Sats budget", async () => {
  // Invoice lnbc10u1p = 10*100 = 1000 sats; maxL402Sats = 500
  mockFetchImpl = async () => make402Response("mac1", "lnbc10u1ptest");
  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
    maxL402Sats: 500,
  });

  await assert.rejects(
    () => client.fetch("https://arxmint.com/api/expensive"),
    /exceeds maxL402Sats/,
  );
});

// ─── AgentCommerceClient.pay ──────────────────────────────────────────────────

test("AgentCommerceClient.pay: validates merchantId", async () => {
  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
  });
  await assert.rejects(
    () => client.pay("", 1000),
    /merchantId is required/,
  );
});

test("AgentCommerceClient.pay: validates amountSats", async () => {
  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
  });
  await assert.rejects(
    () => client.pay("merchant-1", 0),
    /positive integer/,
  );
});

test("AgentCommerceClient.pay: creates session, pays, returns result", async () => {
  const session = {
    sessionId: "sess_abc",
    merchantId: "merch-1",
    amountSats: 500,
    invoice: "lnbc5u1ptest",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: "paid",
  };

  let postCalled = false;
  mockFetchImpl = async (url) => {
    if (url.includes("/api/checkout") && !url.includes("sess_abc")) {
      postCalled = true;
      return makeJsonResponse(session);
    }
    return makeJsonResponse({ ...session, status: "paid" });
  };

  const wallet = { melt: async (_: string) => ({ preimage: "preimage_pay" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
    pollIntervalMs: 0,
  });

  const result = await client.pay("merch-1", 500);
  assert.equal(result.sessionId, "sess_abc");
  assert.equal(result.amountSats, 500);
  assert.equal(result.preimage, "preimage_pay");
  assert.equal(result.merchantId, "merch-1");
  assert.ok(postCalled);
});

// ─── AgentCommerceClient.watchPayment ────────────────────────────────────────

test("AgentCommerceClient.watchPayment: yields paid event and terminates", async () => {
  let pollCount = 0;
  mockFetchImpl = async () => {
    pollCount++;
    const status = pollCount < 2 ? "pending" : "paid";
    return makeJsonResponse({
      sessionId: "sess_watch",
      merchantId: "m",
      amountSats: 100,
      invoice: "lnbc...",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      status,
    });
  };

  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
    pollIntervalMs: 0,
    timeoutMs: 5_000,
  });

  const events: string[] = [];
  for await (const event of client.watchPayment("sess_watch")) {
    events.push(event.status);
  }

  assert.ok(events.includes("pending"));
  assert.ok(events.includes("paid"));
  assert.equal(events[events.length - 1], "paid");
});

test("AgentCommerceClient.watchPayment: emits expired on timeout", async () => {
  mockFetchImpl = async () =>
    makeJsonResponse({
      sessionId: "sess_timeout",
      merchantId: "m",
      amountSats: 100,
      invoice: "lnbc...",
      expiresAt: new Date(Date.now() + 1_000).toISOString(),
      status: "pending",
    });

  const wallet = { melt: async (_: string) => ({ preimage: "preimage" }) } as any;
  const client = new AgentCommerceClient({
    baseUrl: "https://arxmint.com",
    agentWallet: wallet,
    pollIntervalMs: 0,
    timeoutMs: 1, // expires immediately
  });

  const events: string[] = [];
  for await (const event of client.watchPayment("sess_timeout")) {
    events.push(event.status);
  }

  assert.ok(events.some((s) => s === "expired"));
});
