import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Register a custom resolve hook that maps TypeScript path alias @/* to the
// project root, enabling managed-dns.ts (which imports "@/lib/logger") to load
// in the Node.js test runner.
register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import required so the hook above takes effect first
const { provisionMerchantDNS } = await import("../lib/managed-dns.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

// ---------------------------------------------------------------------------
// provisionMerchantDNS() — skip path (no CLOUDFLARE_API_TOKEN)
// ---------------------------------------------------------------------------

test("provisionMerchantDNS() skips provisioning when CLOUDFLARE_API_TOKEN is absent", async () => {
  const savedToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  try {
    const result = await provisionMerchantDNS("test-merchant");
    assert.equal(result.success, false, "success should be false when token absent");
    assert.equal(result.skipped, true, "skipped should be true");
    assert.ok(
      result.skipReason?.includes("CLOUDFLARE_API_TOKEN"),
      "skipReason should mention CLOUDFLARE_API_TOKEN"
    );
  } finally {
    if (savedToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = savedToken;
  }
});

test("provisionMerchantDNS() returns manualInstructions with 3 options when token absent", async () => {
  const savedToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  try {
    const result = await provisionMerchantDNS("my-shop");
    const combined = result.manualInstructions?.join("\n") ?? "";
    assert.ok(combined.includes("Option A"), "should include Option A (Cloudflare Tunnel)");
    assert.ok(combined.includes("Option B"), "should include Option B (Ngrok)");
    assert.ok(combined.includes("Option C"), "should include Option C (own domain)");
  } finally {
    if (savedToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = savedToken;
  }
});

test("provisionMerchantDNS() manualInstructions includes the merchant ID in the URL", async () => {
  const savedToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_API_TOKEN;
  try {
    const result = await provisionMerchantDNS("my-merchant-id");
    const combined = result.manualInstructions?.join("\n") ?? "";
    assert.ok(combined.includes("my-merchant-id"), "instructions should reference the merchant ID");
  } finally {
    if (savedToken !== undefined) process.env.CLOUDFLARE_API_TOKEN = savedToken;
  }
});

// ---------------------------------------------------------------------------
// provisionMerchantDNS() — tunnel + DNS provisioning (mocked Cloudflare API)
// ---------------------------------------------------------------------------

test("provisionMerchantDNS() returns success=true when tunnel and DNS both succeed", async () => {
  const origFetch = global.fetch;
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
  process.env.CLOUDFLARE_ZONE_ID = "zone-456";

  let callIndex = 0;
  const responses = [
    // 1. List existing tunnels (empty)
    { success: true, result: [] },
    // 2. Create tunnel
    { success: true, result: { id: "tunnel-abc", name: "test-merchant", token: "tok-xyz" } },
    // 3. List existing DNS records (empty)
    { success: true, result: [] },
    // 4. Create CNAME record
    { success: true, result: { id: "rec-001", type: "CNAME", name: "test-merchant.arxmint.com", content: "tunnel-abc.cfargotunnel.com" } },
  ];

  // @ts-ignore
  global.fetch = async () => {
    const body = responses[callIndex++] ?? { success: true, result: null };
    return makeResponse(200, body);
  };

  try {
    const result = await provisionMerchantDNS("test-merchant");
    assert.equal(result.success, true, "should succeed when Cloudflare API calls succeed");
    assert.ok(result.tunnelConfig, "should have tunnelConfig");
    assert.equal(result.tunnelConfig!.tunnelId, "tunnel-abc");
    assert.ok(result.tunnelConfig!.publicUrl.includes("test-merchant"), "publicUrl should include merchant ID");
  } finally {
    global.fetch = origFetch;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ZONE_ID;
  }
});

test("provisionMerchantDNS() returns success=false when tunnel creation fails", async () => {
  const origFetch = global.fetch;
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";

  // @ts-ignore
  global.fetch = async () => makeResponse(200, { success: false, errors: [{ message: "permission denied" }] });

  try {
    const result = await provisionMerchantDNS("failing-merchant");
    assert.equal(result.success, false, "should fail when Cloudflare API returns error");
  } finally {
    global.fetch = origFetch;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  }
});

test("provisionMerchantDNS() handles partial success (tunnel ok, DNS failed) without throwing", async () => {
  const origFetch = global.fetch;
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct-123";
  process.env.CLOUDFLARE_ZONE_ID = "zone-456";

  let callIndex = 0;
  const responses = [
    // 1. List existing tunnels (empty)
    { success: true, result: [] },
    // 2. Create tunnel — succeeds
    { success: true, result: { id: "tunnel-partial", name: "partial-merchant", token: "tok-abc" } },
    // 3. List existing DNS records (empty)
    { success: true, result: [] },
    // 4. Create CNAME record — fails
    { success: false, errors: [{ message: "zone not found" }] },
  ];

  // @ts-ignore
  global.fetch = async () => {
    const body = responses[callIndex++] ?? { success: true, result: null };
    return makeResponse(200, body);
  };

  try {
    // Should not throw — partial success is handled gracefully
    const result = await provisionMerchantDNS("partial-merchant");
    // Tunnel created but DNS failed → tunnelConfig exists but status is degraded
    assert.ok(result.tunnelConfig, "should have tunnelConfig even if DNS partially failed");
    assert.equal(result.tunnelConfig!.status, "degraded", "status should be degraded when DNS failed");
  } finally {
    global.fetch = origFetch;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ZONE_ID;
  }
});
