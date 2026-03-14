import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Register a custom resolve hook that maps TypeScript path alias @/* to the
// project root, enabling modules that import "@/lib/logger" (etc.) to load
// in the Node.js test runner without a bundler or TSConfig path loader.
// Must be called before the dynamic import of the module under test.
register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import required so the hook above takes effect first
const {
  bootstrapLiquidity,
  requestJITChannel,
  pollChannelStatus,
} = await import("../lib/lsp-bootstrap.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal Response-like object accepted by the test's fetch mock */
function makeResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

// ---------------------------------------------------------------------------
// bootstrapLiquidity() — skip paths (no external calls needed)
// ---------------------------------------------------------------------------

test("bootstrapLiquidity() skips and returns manualInstructions when LSP_URL is absent", async () => {
  const saved = process.env.LSP_URL;
  delete process.env.LSP_URL;
  try {
    const result = await bootstrapLiquidity({ nodeId: "03abc123" });
    assert.equal(result.success, false, "success should be false when LSP not configured");
    assert.equal(result.skipped, true, "skipped should be true");
    assert.ok(result.skipReason?.includes("LSP_URL"), "skipReason should mention LSP_URL");
    assert.ok(
      Array.isArray(result.manualInstructions) && result.manualInstructions.length > 0,
      "should include manual instructions"
    );
  } finally {
    if (saved !== undefined) process.env.LSP_URL = saved;
  }
});

test("bootstrapLiquidity() manualInstructions includes the node ID when provided", async () => {
  const saved = process.env.LSP_URL;
  delete process.env.LSP_URL;
  try {
    const result = await bootstrapLiquidity({ nodeId: "03testnode" });
    const combined = result.manualInstructions?.join("\n") ?? "";
    assert.ok(combined.includes("03testnode"), "manual instructions should include the node ID");
  } finally {
    if (saved !== undefined) process.env.LSP_URL = saved;
  }
});

test("bootstrapLiquidity() skips when nodeId is empty", async () => {
  process.env.LSP_URL = "https://mock-lsp.test";
  try {
    const result = await bootstrapLiquidity({ nodeId: "" });
    assert.equal(result.skipped, true, "should skip without a nodeId");
    assert.ok(result.skipReason?.includes("nodeId"), "skipReason should mention nodeId");
  } finally {
    delete process.env.LSP_URL;
  }
});

test("bootstrapLiquidity() returns success=false and manualInstructions when fetch fails", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => { throw new Error("network error"); };
  process.env.LSP_URL = "https://mock-lsp.test";
  try {
    const result = await bootstrapLiquidity({ nodeId: "03failnode" });
    assert.equal(result.success, false);
    assert.ok(Array.isArray(result.manualInstructions), "should include fallback instructions");
  } finally {
    global.fetch = origFetch;
    delete process.env.LSP_URL;
  }
});

// ---------------------------------------------------------------------------
// requestJITChannel() — sats clamping
// ---------------------------------------------------------------------------

test("requestJITChannel() clamps amountSats to minChannelSats when too low", async () => {
  let capturedBody: Record<string, unknown> | null = null;
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async (_url: string, opts: { body: string }) => {
    capturedBody = JSON.parse(opts.body);
    return makeResponse(200, { channel_id: "ch-test-001" });
  };
  try {
    await requestJITChannel({
      nodeId: "03abc",
      amountSats: 1, // way below minChannelSats (100_000)
      lspConfig: { url: "https://mock-lsp.test" },
    });
    assert.ok(capturedBody !== null, "fetch should have been called");
    const body1 = capturedBody as Record<string, unknown>;
    assert.ok(
      Number(body1.local_balance) >= 100_000,
      "local_balance should be clamped to at least minChannelSats"
    );
  } finally {
    global.fetch = origFetch;
  }
});

test("requestJITChannel() clamps amountSats to maxChannelSats when too high", async () => {
  let capturedBody: Record<string, unknown> | null = null;
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async (_url: string, opts: { body: string }) => {
    capturedBody = JSON.parse(opts.body);
    return makeResponse(200, { channel_id: "ch-test-002" });
  };
  try {
    await requestJITChannel({
      nodeId: "03abc",
      amountSats: 999_999_999, // way above maxChannelSats (10_000_000)
      lspConfig: { url: "https://mock-lsp.test" },
    });
    assert.ok(capturedBody !== null, "fetch should have been called");
    const body2 = capturedBody as Record<string, unknown>;
    assert.ok(
      Number(body2.local_balance) <= 10_000_000,
      "local_balance should be clamped to at most maxChannelSats"
    );
  } finally {
    global.fetch = origFetch;
  }
});

test("requestJITChannel() returns 'opening' status on successful LSP response", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(200, { channel_id: "ch-abc", lsp_node_id: "03lsp" });
  try {
    const state = await requestJITChannel({
      nodeId: "03merchant",
      amountSats: 500_000,
      lspConfig: { url: "https://mock-lsp.test" },
    });
    assert.equal(state.status, "opening");
    assert.equal(state.channelId, "ch-abc");
    assert.equal(state.lspNodeId, "03lsp");
  } finally {
    global.fetch = origFetch;
  }
});

test("requestJITChannel() returns 'failed' status when LSP returns non-2xx", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(503, { error: "service unavailable" });
  try {
    const state = await requestJITChannel({
      nodeId: "03merchant",
      amountSats: 500_000,
      lspConfig: { url: "https://mock-lsp.test" },
    });
    assert.equal(state.status, "failed");
  } finally {
    global.fetch = origFetch;
  }
});

// ---------------------------------------------------------------------------
// pollChannelStatus() — status string mapping
// ---------------------------------------------------------------------------

test("pollChannelStatus() maps LSP status 'active' → 'active'", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(200, { status: "active", capacity: 500_000 });
  try {
    const state = await pollChannelStatus("ch-001", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "active");
    assert.equal(state.inboundSats, 500_000);
  } finally {
    global.fetch = origFetch;
  }
});

test("pollChannelStatus() maps LSP status 'open' → 'active'", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(200, { status: "open" });
  try {
    const state = await pollChannelStatus("ch-002", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "active");
  } finally {
    global.fetch = origFetch;
  }
});

test("pollChannelStatus() maps LSP status 'pending_open' → 'opening'", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(200, { status: "pending_open" });
  try {
    const state = await pollChannelStatus("ch-003", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "opening");
  } finally {
    global.fetch = origFetch;
  }
});

test("pollChannelStatus() maps LSP status 'failed' → 'failed'", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(200, { status: "failed" });
  try {
    const state = await pollChannelStatus("ch-004", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "failed");
  } finally {
    global.fetch = origFetch;
  }
});

test("pollChannelStatus() maps LSP status 'error' → 'failed'", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(200, { status: "error" });
  try {
    const state = await pollChannelStatus("ch-005", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "failed");
  } finally {
    global.fetch = origFetch;
  }
});

test("pollChannelStatus() returns 'pending' when LSP returns non-2xx", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => makeResponse(404, {});
  try {
    const state = await pollChannelStatus("ch-006", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "pending");
  } finally {
    global.fetch = origFetch;
  }
});

test("pollChannelStatus() returns 'pending' on network error (graceful fallback)", async () => {
  const origFetch = global.fetch;
  // @ts-ignore
  global.fetch = async () => { throw new Error("network down"); };
  try {
    const state = await pollChannelStatus("ch-007", { url: "https://mock-lsp.test" });
    assert.equal(state.status, "pending");
    assert.ok(state.message.length > 0, "should have a fallback message");
  } finally {
    global.fetch = origFetch;
  }
});
