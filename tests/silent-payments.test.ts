import test from "node:test";
import assert from "node:assert/strict";
// @ts-ignore
import { bech32m } from "@scure/base";

// @ts-ignore -- Node test runner loads .ts directly with --experimental-strip-types
import {
  parseSPAddress,
  isSPAddress,
  isSPEnabled,
  getSPScanMode,
  getSPIndexerUrl,
  SPScanner,
  createScanKeyDelegation,
  generateSPDescriptor,
  getHWWalletSPSupport,
  getAllHWWalletSPSupport,
  buildSPPSBTFields,
  validateSPPSBT,
} from "../lib/silent-payments.ts";

// ---------------------------------------------------------------------------
// Test fixtures — real Bech32m-valid SP addresses
// ---------------------------------------------------------------------------

// Build a synthetic but structurally valid BIP-352 payload:
// version (1 byte) + scan key (33 bytes) + spend key (33 bytes) = 67 bytes
const SP_PAYLOAD = new Uint8Array(67);
SP_PAYLOAD[0] = 0;    // version
SP_PAYLOAD[1] = 0x02; // compressed pubkey prefix for scan key
// bytes 2-33: scan key body (all zeros for test)
SP_PAYLOAD[34] = 0x03; // compressed pubkey prefix for spend key
// bytes 35-66: spend key body (all zeros for test)

const REAL_SP_MAINNET = bech32m.encode("sp", bech32m.toWords(SP_PAYLOAD), 128);
const REAL_SP_TESTNET = bech32m.encode("tsp", bech32m.toWords(SP_PAYLOAD), 128);

// Legacy synthetic (non-Bech32m) fixtures kept for invalid-address tests
const INVALID_SP_LIKE_MAINNET = "sp1q" + "a".repeat(80);
const INVALID_SP_LIKE_TESTNET = "tsp1q" + "b".repeat(80);

const DEFAULT_SCANNER_CONFIG = {
  indexerUrl: "http://localhost:8100",
  network: "testnet" as const,
  scanMode: "light" as const,
};

// ---------------------------------------------------------------------------
// parseSPAddress() — valid addresses
// ---------------------------------------------------------------------------

test("parseSPAddress() parses a valid mainnet SP address and returns network=bitcoin", () => {
  const result = parseSPAddress(REAL_SP_MAINNET);
  assert.equal(result.network, "bitcoin");
  assert.equal(result.address, REAL_SP_MAINNET);
  assert.equal(result.scanPubKey.length, 66, "scan key should be 33 bytes hex (66 chars)");
  assert.equal(result.spendPubKey.length, 66, "spend key should be 33 bytes hex (66 chars)");
});

test("parseSPAddress() parses a valid testnet SP address and returns network=testnet", () => {
  const result = parseSPAddress(REAL_SP_TESTNET);
  assert.equal(result.network, "testnet");
  assert.equal(result.address, REAL_SP_TESTNET);
  assert.equal(result.scanPubKey.length, 66, "scan key should be 33 bytes hex (66 chars)");
  assert.equal(result.spendPubKey.length, 66, "spend key should be 33 bytes hex (66 chars)");
});

// ---------------------------------------------------------------------------
// parseSPAddress() — invalid addresses → throws
// ---------------------------------------------------------------------------

test("parseSPAddress() throws for a regular bech32 (bc1q) address", () => {
  assert.throws(
    () => parseSPAddress("bc1qtest123456"),
    /Invalid Silent Payment address/
  );
});

test("parseSPAddress() throws for an empty string", () => {
  assert.throws(
    () => parseSPAddress(""),
    /Invalid Silent Payment address/
  );
});

test("parseSPAddress() throws for a non-address string", () => {
  assert.throws(
    () => parseSPAddress("not-an-address"),
    /Invalid Silent Payment address/
  );
});

test("parseSPAddress() throws for an SP address with invalid Bech32m encoding", () => {
  // "sp1q" prefix followed by garbage — not valid Bech32m
  assert.throws(
    () => parseSPAddress("sp1q" + "a".repeat(10)),
    /Bech32m decode failed|too short|Invalid/
  );
});

test("parseSPAddress() throws for a Lightning invoice (lnbc prefix)", () => {
  assert.throws(
    () => parseSPAddress("lnbc100n1psy3gvtsp5..."),
    /Invalid Silent Payment address/
  );
});

// ---------------------------------------------------------------------------
// isSPAddress() — type guard
// ---------------------------------------------------------------------------

test("isSPAddress() returns true for a valid real mainnet SP address", () => {
  assert.equal(isSPAddress(REAL_SP_MAINNET), true);
});

test("isSPAddress() returns true for a valid real testnet SP address", () => {
  assert.equal(isSPAddress(REAL_SP_TESTNET), true);
});

test("isSPAddress() returns false for a regular bech32 address (bc1q)", () => {
  assert.equal(isSPAddress("bc1qtest123456"), false);
});

test("isSPAddress() returns false for an empty string", () => {
  assert.equal(isSPAddress(""), false);
});

test("isSPAddress() returns false for a Lightning invoice", () => {
  assert.equal(isSPAddress("lnbc100n1psytest..."), false);
});

test("isSPAddress() returns false for an sp1q address with invalid Bech32m encoding", () => {
  assert.equal(isSPAddress("sp1q" + "a".repeat(10)), false);
});

// ---------------------------------------------------------------------------
// SPScanner — initial state (no localStorage in Node.js)
// ---------------------------------------------------------------------------

test("SPScanner initializes with lastScannedHeight = 0", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  assert.equal(scanner.scanState.lastScannedHeight, 0);
});

test("SPScanner initializes with scanning = false", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  assert.equal(scanner.scanState.scanning, false);
});

test("SPScanner initializes with outputsFound = 0", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  assert.equal(scanner.scanState.outputsFound, 0);
});

test("SPScanner initializes with balance = 0", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  assert.equal(scanner.balance, 0);
});

test("SPScanner initializes with empty outputs array", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  assert.deepEqual(scanner.outputs, []);
});

// ---------------------------------------------------------------------------
// SPScanner — restoreState() is a no-op in Node.js (window is undefined)
// ---------------------------------------------------------------------------

test("SPScanner.restoreState() does not throw in Node.js (no window/localStorage)", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  // Should be a no-op: typeof window === 'undefined' guard prevents localStorage access
  assert.doesNotThrow(() => scanner.restoreState());
});

test("SPScanner.restoreState() leaves state at defaults when there is no stored state", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  scanner.restoreState();
  assert.equal(scanner.scanState.lastScannedHeight, 0, "lastScannedHeight should remain 0");
  assert.equal(scanner.balance, 0, "balance should remain 0");
});

// ---------------------------------------------------------------------------
// SPScanner — scanState getter returns a copy (not mutable reference)
// ---------------------------------------------------------------------------

test("SPScanner.scanState getter returns a shallow copy", () => {
  const scanner = new SPScanner(DEFAULT_SCANNER_CONFIG);
  const state1 = scanner.scanState;
  const state2 = scanner.scanState;
  assert.notStrictEqual(state1, state2, "each call should return a new object");
});

// ---------------------------------------------------------------------------
// createScanKeyDelegation()
// ---------------------------------------------------------------------------

test("createScanKeyDelegation() returns hotConfig and coldConfig with correct keys", () => {
  const keyPair = {
    scanKey: { public: "02aabbccddeeff", private: "private_scan_key_hex" },
    spendKey: { public: "0311223344556677" },
  };
  const { hotConfig, coldConfig } = createScanKeyDelegation(keyPair);
  assert.equal(hotConfig.scanPrivateKey, "private_scan_key_hex");
  assert.equal(hotConfig.scanPublicKey, "02aabbccddeeff");
  assert.equal(hotConfig.spendPublicKey, "0311223344556677");
  assert.equal(coldConfig.spendPublicKey, "0311223344556677");
  assert.ok(
    coldConfig.warning.toLowerCase().includes("spend key"),
    "coldConfig warning should mention the spend key"
  );
});

test("createScanKeyDelegation() throws when scan private key is missing", () => {
  const keyPair = {
    scanKey: { public: "02aabbcc" }, // no private key
    spendKey: { public: "02ddeeff" },
  };
  assert.throws(
    () => createScanKeyDelegation(keyPair),
    /Scan private key required/
  );
});

test("createScanKeyDelegation() coldConfig does NOT contain the spend private key", () => {
  const keyPair = {
    scanKey: { public: "02aabbcc", private: "scan_priv" },
    spendKey: { public: "02ddeeff", private: "spend_priv_cold" },
  };
  const { coldConfig } = createScanKeyDelegation(keyPair);
  assert.ok(
    !JSON.stringify(coldConfig).includes("spend_priv_cold"),
    "cold config must not leak the spend private key"
  );
});

// ---------------------------------------------------------------------------
// generateSPDescriptor()
// ---------------------------------------------------------------------------

test("generateSPDescriptor() returns a descriptor string containing both xpubs", () => {
  const result = generateSPDescriptor("xpubScan123", "xpubSpend456");
  assert.ok(result.descriptor.includes("xpubScan123"), "descriptor should include scan xpub");
  assert.ok(result.descriptor.includes("xpubSpend456"), "descriptor should include spend xpub");
  assert.ok(result.descriptor.startsWith("sp("), "descriptor should start with sp(");
});

test("generateSPDescriptor() includes a checksum in the descriptor", () => {
  const result = generateSPDescriptor("xpubScan123", "xpubSpend456");
  assert.ok(result.checksum, "checksum should be non-empty");
  assert.ok(result.descriptor.includes("#" + result.checksum), "descriptor should embed checksum after #");
});

test("generateSPDescriptor() defaults to testnet network", () => {
  const result = generateSPDescriptor("xpubScan", "xpubSpend");
  assert.equal(result.network, "testnet");
});

test("generateSPDescriptor() respects explicit mainnet network parameter", () => {
  const result = generateSPDescriptor(
    "xpubScan",
    "xpubSpend",
    "m/352'/0'/0'/1'/0",
    "m/352'/0'/0'/0'/0",
    "bitcoin"
  );
  assert.equal(result.network, "bitcoin");
});

test("generateSPDescriptor() records the key origin paths", () => {
  const result = generateSPDescriptor(
    "xpubScan",
    "xpubSpend",
    "m/352'/0'/0'/1'/0",
    "m/352'/0'/0'/0'/0"
  );
  assert.equal(result.scanKeyOrigin, "m/352'/0'/0'/1'/0");
  assert.equal(result.spendKeyOrigin, "m/352'/0'/0'/0'/0");
});

// ---------------------------------------------------------------------------
// getHWWalletSPSupport() / getAllHWWalletSPSupport()
// ---------------------------------------------------------------------------

test("getHWWalletSPSupport() returns correct data for 'coldcard'", () => {
  const result = getHWWalletSPSupport("coldcard");
  assert.equal(result.device, "coldcard");
  assert.equal(result.supportsSP, false);
});

test("getHWWalletSPSupport() returns correct data for 'ledger'", () => {
  const result = getHWWalletSPSupport("ledger");
  assert.equal(result.device, "ledger");
  assert.equal(result.supportsSP, false);
});

test("getHWWalletSPSupport() returns a fallback object for an unknown device type", () => {
  const result = getHWWalletSPSupport("generic");
  assert.equal(result.device, "generic");
  assert.equal(result.supportsSP, false);
  assert.ok(result.notes.length > 0, "fallback should include notes");
});

test("getAllHWWalletSPSupport() returns all 6 known hardware wallets", () => {
  const devices = getAllHWWalletSPSupport();
  assert.equal(devices.length, 6);
  const names = devices.map((d) => d.device);
  assert.ok(names.includes("coldcard"));
  assert.ok(names.includes("bitbox02"));
  assert.ok(names.includes("ledger"));
  assert.ok(names.includes("trezor"));
  assert.ok(names.includes("seedsigner"));
  assert.ok(names.includes("jade"));
});

test("getAllHWWalletSPSupport() returns a copy (mutation does not affect internal state)", () => {
  const devices1 = getAllHWWalletSPSupport();
  devices1.pop(); // remove last element from copy
  const devices2 = getAllHWWalletSPSupport();
  assert.equal(devices2.length, 6, "internal list should not be mutated");
});

// ---------------------------------------------------------------------------
// buildSPPSBTFields()
// ---------------------------------------------------------------------------

test("buildSPPSBTFields() returns PSBT fields for a valid real SP address", () => {
  const outpoints = [{ txid: "deadbeef01020304", vout: 0 }];
  const result = buildSPPSBTFields(REAL_SP_MAINNET, outpoints, "02scanpubkey");
  assert.deepEqual(result.scanData.outpoints, outpoints);
  assert.ok(result.scanData.scanPubKey.length > 0, "scanPubKey should be non-empty");
  assert.equal(result.outputInfo.recipientAddress, REAL_SP_MAINNET);
});

test("buildSPPSBTFields() throws when address is invalid", () => {
  assert.throws(
    () => buildSPPSBTFields("bc1qnotanspaddr", [{ txid: "abc", vout: 0 }], "02key"),
    /Invalid Silent Payment address/
  );
});

// ---------------------------------------------------------------------------
// validateSPPSBT()
// ---------------------------------------------------------------------------

// validateSPPSBT() tests construct SPPSBTField directly (buildSPPSBTFields throws
// NotImplementedError until BIP-352 Bech32m decoding is complete).

test("validateSPPSBT() returns valid=true for well-formed PSBT fields with a real SP address", () => {
  const fields = {
    scanData: { outpoints: [{ txid: "deadbeef", vout: 1 }], scanPubKey: "02scankey" },
    outputInfo: { recipientAddress: REAL_SP_MAINNET, outputPubKey: "02outpubkey", tweak: "0".repeat(64) },
  };
  const result = validateSPPSBT(fields);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateSPPSBT() returns valid=false when outpoints array is empty", () => {
  const fields = {
    scanData: { outpoints: [], scanPubKey: "02scankey" },
    outputInfo: { recipientAddress: REAL_SP_MAINNET, outputPubKey: "02outpubkey", tweak: "0".repeat(64) },
  };
  const result = validateSPPSBT(fields);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("outpoints")));
});

test("validateSPPSBT() returns valid=false when recipient is not an SP address", () => {
  const fields = {
    scanData: { outpoints: [{ txid: "abc", vout: 0 }], scanPubKey: "02key" },
    outputInfo: { recipientAddress: "bc1qnotanspaddress", outputPubKey: "02outpubkey", tweak: "0".repeat(64) },
  };
  const result = validateSPPSBT(fields);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("not a valid SP address")));
});

test("validateSPPSBT() returns valid=false when recipient address is empty", () => {
  const fields = {
    scanData: { outpoints: [{ txid: "abc", vout: 0 }], scanPubKey: "02key" },
    outputInfo: { recipientAddress: "", outputPubKey: "02outpubkey", tweak: "0".repeat(64) },
  };
  const result = validateSPPSBT(fields);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

// ---------------------------------------------------------------------------
// Feature flag helpers
// ---------------------------------------------------------------------------

test("getSPScanMode() returns 'light' when env var is not set", () => {
  const original = process.env.ARXMINT_SP_SCAN_MODE;
  delete process.env.ARXMINT_SP_SCAN_MODE;
  try {
    assert.equal(getSPScanMode(), "light");
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_SCAN_MODE = original;
  }
});

test("getSPScanMode() returns 'full' when ARXMINT_SP_SCAN_MODE=full", () => {
  const original = process.env.ARXMINT_SP_SCAN_MODE;
  process.env.ARXMINT_SP_SCAN_MODE = "full";
  try {
    assert.equal(getSPScanMode(), "full");
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_SCAN_MODE = original;
    else delete process.env.ARXMINT_SP_SCAN_MODE;
  }
});

test("getSPIndexerUrl() returns default localhost URL when env var is not set", () => {
  const original = process.env.ARXMINT_SP_INDEXER_URL;
  delete process.env.ARXMINT_SP_INDEXER_URL;
  try {
    assert.equal(getSPIndexerUrl(), "http://localhost:8100");
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_INDEXER_URL = original;
  }
});

test("getSPIndexerUrl() reads from ARXMINT_SP_INDEXER_URL env var", () => {
  const original = process.env.ARXMINT_SP_INDEXER_URL;
  process.env.ARXMINT_SP_INDEXER_URL = "http://my-indexer:9000";
  try {
    assert.equal(getSPIndexerUrl(), "http://my-indexer:9000");
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_INDEXER_URL = original;
    else delete process.env.ARXMINT_SP_INDEXER_URL;
  }
});

test("isSPEnabled() returns false when ARXMINT_SP_ENABLED is not set", () => {
  const original = process.env.ARXMINT_SP_ENABLED;
  delete process.env.ARXMINT_SP_ENABLED;
  try {
    assert.equal(isSPEnabled(), false);
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_ENABLED = original;
  }
});

test("isSPEnabled() returns true when ARXMINT_SP_ENABLED=true", () => {
  const original = process.env.ARXMINT_SP_ENABLED;
  process.env.ARXMINT_SP_ENABLED = "true";
  try {
    assert.equal(isSPEnabled(), true);
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_ENABLED = original;
    else delete process.env.ARXMINT_SP_ENABLED;
  }
});

test("isSPEnabled() returns false when ARXMINT_SP_ENABLED=false", () => {
  const original = process.env.ARXMINT_SP_ENABLED;
  process.env.ARXMINT_SP_ENABLED = "false";
  try {
    assert.equal(isSPEnabled(), false);
  } finally {
    if (original !== undefined) process.env.ARXMINT_SP_ENABLED = original;
    else delete process.env.ARXMINT_SP_ENABLED;
  }
});
