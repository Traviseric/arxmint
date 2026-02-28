import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  saveProofsToLocalStorage,
  loadProofsFromLocalStorage,
  clearProofsFromLocalStorage,
  getStoredMintUrls,
} from "../lib/cashu-sdk.ts";

// ---- Mock window + localStorage for Node.js environment ----
// The SDK functions guard with: if (typeof window === "undefined") return
// Setting global.window makes them execute in tests.

const storage: Record<string, string> = {};

(global as any).window = {};
(global as any).localStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const k of Object.keys(storage)) {
      delete storage[k];
    }
  },
  get length() {
    return Object.keys(storage).length;
  },
  key: (index: number) => {
    return Object.keys(storage)[index] ?? null;
  },
};

// Clear storage before each test to prevent state leakage
test.beforeEach(() => {
  (global as any).localStorage.clear();
});

// ---- Tests ----

test("save and reload proofs for a mint URL", () => {
  const mintUrl = "http://localhost:3338";
  const proofs = [{ id: "keyset1", amount: 1000, secret: "abc", C: "def" }];
  saveProofsToLocalStorage(mintUrl, proofs);
  const loaded = loadProofsFromLocalStorage(mintUrl);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].amount, 1000);
  assert.equal(loaded[0].id, "keyset1");
});

test("returns empty array when no proofs saved for a mint URL", () => {
  const loaded = loadProofsFromLocalStorage("http://no-mint.local");
  assert.deepEqual(loaded, []);
});

test("saves and restores multiple proofs", () => {
  const mintUrl = "http://mint.local";
  const proofs = [
    { id: "k1", amount: 8, secret: "s1", C: "c1" },
    { id: "k1", amount: 4, secret: "s2", C: "c2" },
    { id: "k1", amount: 1, secret: "s3", C: "c3" },
  ];
  saveProofsToLocalStorage(mintUrl, proofs);
  const loaded = loadProofsFromLocalStorage(mintUrl);
  assert.equal(loaded.length, 3);
  const total = loaded.reduce((sum, p) => sum + p.amount, 0);
  assert.equal(total, 13);
});

test("different mint URLs have isolated storage", () => {
  saveProofsToLocalStorage("http://mint-a.local", [
    { id: "a", amount: 100, secret: "s1", C: "c1" },
  ]);
  saveProofsToLocalStorage("http://mint-b.local", [
    { id: "b", amount: 200, secret: "s2", C: "c2" },
  ]);

  const fromA = loadProofsFromLocalStorage("http://mint-a.local");
  const fromB = loadProofsFromLocalStorage("http://mint-b.local");

  assert.equal(fromA.length, 1);
  assert.equal(fromB.length, 1);
  assert.equal(fromA[0].amount, 100);
  assert.equal(fromB[0].amount, 200);
});

test("clearProofsFromLocalStorage removes proofs for mint URL", () => {
  const mintUrl = "http://mint.local";
  saveProofsToLocalStorage(mintUrl, [{ id: "k", amount: 500, secret: "s", C: "c" }]);
  clearProofsFromLocalStorage(mintUrl);
  const loaded = loadProofsFromLocalStorage(mintUrl);
  assert.deepEqual(loaded, []);
});

test("clearProofsFromLocalStorage only removes the target mint URL", () => {
  saveProofsToLocalStorage("http://mint-a.local", [{ id: "a", amount: 100, secret: "s1", C: "c1" }]);
  saveProofsToLocalStorage("http://mint-b.local", [{ id: "b", amount: 200, secret: "s2", C: "c2" }]);

  clearProofsFromLocalStorage("http://mint-a.local");

  const fromA = loadProofsFromLocalStorage("http://mint-a.local");
  const fromB = loadProofsFromLocalStorage("http://mint-b.local");

  assert.deepEqual(fromA, [], "mint-a proofs should be cleared");
  assert.equal(fromB.length, 1, "mint-b proofs should be intact");
});

test("handles corrupted storage gracefully — returns empty array", () => {
  // Inject invalid JSON directly to simulate corruption
  (global as any).localStorage.setItem(
    "arxmint_proofs_http://bad.local",
    "not-valid-json{{{"
  );
  const loaded = loadProofsFromLocalStorage("http://bad.local");
  assert.deepEqual(loaded, []);
});

test("handles non-array JSON in storage gracefully", () => {
  (global as any).localStorage.setItem(
    "arxmint_proofs_http://weird.local",
    JSON.stringify({ wrong: "format" })
  );
  const loaded = loadProofsFromLocalStorage("http://weird.local");
  assert.deepEqual(loaded, []);
});

test("overwriting proofs replaces previous data", () => {
  const mintUrl = "http://mint.local";
  saveProofsToLocalStorage(mintUrl, [{ id: "k", amount: 500, secret: "s1", C: "c1" }]);
  saveProofsToLocalStorage(mintUrl, [
    { id: "k", amount: 200, secret: "s2", C: "c2" },
    { id: "k", amount: 300, secret: "s3", C: "c3" },
  ]);
  const loaded = loadProofsFromLocalStorage(mintUrl);
  assert.equal(loaded.length, 2, "should have 2 proofs after overwrite");
  assert.equal(
    loaded.reduce((sum, p) => sum + p.amount, 0),
    500,
    "total should be 500 after overwrite"
  );
});

test("getStoredMintUrls returns all mints with stored proofs", () => {
  saveProofsToLocalStorage("http://mint-x.local", [{ id: "x", amount: 10, secret: "sx", C: "cx" }]);
  saveProofsToLocalStorage("http://mint-y.local", [{ id: "y", amount: 20, secret: "sy", C: "cy" }]);
  const urls = getStoredMintUrls();
  assert.ok(urls.includes("http://mint-x.local"), "should include mint-x");
  assert.ok(urls.includes("http://mint-y.local"), "should include mint-y");
});
