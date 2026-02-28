import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import { SovereignArkClient } from "../lib/ark-sdk.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockFetch(status: number, body: unknown = {}) {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
}

function makeErrorFetch(err: Error) {
  return async (): Promise<Response> => {
    throw err;
  };
}

function makeClient() {
  return new SovereignArkClient();
}

const TEST_CONFIG = { serverUrl: "http://ark.test:7070", network: "regtest" } as const;

// ---------------------------------------------------------------------------
// connect() — network unreachable → stub mode (task 026 fix)
// ---------------------------------------------------------------------------

test("connect() returns { connected: false } when server is unreachable (stub mode)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeErrorFetch(new TypeError("Failed to fetch"));
  try {
    const client = makeClient();
    const status = await client.connect(TEST_CONFIG);
    assert.equal(status.connected, false, "ArkStatus.connected should be false");
    assert.equal(status.serverUrl, TEST_CONFIG.serverUrl);
    assert.equal(client.isConnected, false, "isConnected getter should be false in stub mode");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// connect() — AbortError (timeout) → stub mode (task 026 fix)
// ---------------------------------------------------------------------------

test("connect() returns { connected: false } on AbortError (timeout)", async () => {
  const originalFetch = globalThis.fetch;
  const abortErr = new DOMException("The operation was aborted", "AbortError");
  globalThis.fetch = makeErrorFetch(abortErr as unknown as Error);
  try {
    const client = makeClient();
    const status = await client.connect(TEST_CONFIG);
    assert.equal(status.connected, false);
    assert.equal(client.isConnected, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// connect() — HTTP 500 → throws (task 026 fix — NOT silently swallowed)
// ---------------------------------------------------------------------------

test("connect() throws on HTTP 500 response (not stub mode)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(500);
  try {
    const client = makeClient();
    await assert.rejects(
      () => client.connect(TEST_CONFIG),
      (err: Error) => {
        assert.match(err.message, /500/, "Error message should contain the HTTP status code");
        return true;
      }
    );
    // isConnected must NOT have been set to true
    assert.equal(client.isConnected, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// connect() — HTTP 404 → throws
// ---------------------------------------------------------------------------

test("connect() throws on HTTP 404 response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(404);
  try {
    const client = makeClient();
    await assert.rejects(
      () => client.connect(TEST_CONFIG),
      (err: Error) => {
        assert.match(err.message, /404/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// connect() — HTTP 200 → sets _connected = true
// ---------------------------------------------------------------------------

test("connect() succeeds on HTTP 200 and sets isConnected = true", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, {
    network: "regtest",
    current_round: { id: "round_abc", seconds_until_close: 300 },
  });
  try {
    const client = makeClient();
    const status = await client.connect(TEST_CONFIG);
    assert.equal(status.connected, true);
    assert.equal(client.isConnected, true);
    assert.equal(status.currentRound?.id, "round_abc");
    assert.equal(status.currentRound?.secondsUntilClose, 300);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// board() — adds a VTXO and increases balance
// ---------------------------------------------------------------------------

test("board() creates a VTXO and increases the balance", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { network: "regtest" });
  try {
    const client = makeClient();
    await client.connect(TEST_CONFIG);

    const vtxo = await client.board(10_000);
    assert.ok(vtxo.id, "VTXO should have an id");
    assert.equal(vtxo.amountSats, 10_000);
    assert.equal(vtxo.spent, false);

    assert.equal(client.balance, 10_000);
    assert.equal(client.vtxos.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// spend() — marks source VTXO spent, returns change VTXO
// ---------------------------------------------------------------------------

test("spend() reduces the balance by the spent amount", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { network: "regtest" });
  try {
    const client = makeClient();
    await client.connect(TEST_CONFIG);
    await client.board(10_000);

    const result = await client.spend(4_000, "bc1qtest_recipient");
    assert.ok(result.vtxoId, "should return the spent VTXO id");
    // Change VTXO should be created for 6,000 sats
    assert.ok(result.change, "should return a change VTXO");
    assert.equal(result.change?.amountSats, 6_000);

    // Only the change VTXO remains unspent
    assert.equal(client.balance, 6_000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// balance getter — sums multiple unspent VTXOs
// ---------------------------------------------------------------------------

test("balance getter sums all unspent VTXOs correctly", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { network: "regtest" });
  try {
    const client = makeClient();
    await client.connect(TEST_CONFIG);

    await client.board(5_000);
    await client.board(3_000);
    await client.board(2_000);

    assert.equal(client.balance, 10_000);
    assert.equal(client.vtxos.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// spend() — throws on insufficient balance
// ---------------------------------------------------------------------------

test("spend() throws when balance is insufficient", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { network: "regtest" });
  try {
    const client = makeClient();
    await client.connect(TEST_CONFIG);
    await client.board(1_000);

    await assert.rejects(
      () => client.spend(5_000, "bc1qtest"),
      /Insufficient Ark balance/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// board() — throws when not connected
// ---------------------------------------------------------------------------

test("board() throws when client is not connected", async () => {
  const client = makeClient();
  // No connect() call — client starts disconnected
  await assert.rejects(
    () => client.board(1_000),
    /Not connected to Ark server/
  );
});

// ---------------------------------------------------------------------------
// disconnect() — resets connection state
// ---------------------------------------------------------------------------

test("disconnect() resets isConnected to false", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = makeMockFetch(200, { network: "regtest" });
  try {
    const client = makeClient();
    await client.connect(TEST_CONFIG);
    assert.equal(client.isConnected, true);

    client.disconnect();
    assert.equal(client.isConnected, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
