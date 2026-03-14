/**
 * Tests for lib/update-engine.ts
 * Uses Node's built-in test runner with --experimental-strip-types.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "crypto";
import { register } from "node:module";

register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore — dynamic import after hook registration
const { verifyChecksum, verifyManifest, compareVersions, getCurrentVersion } =
  await import("../lib/update-engine.ts");

// ── verifyChecksum ─────────────────────────────────────────────────────────────

describe("verifyChecksum", () => {
  it("returns true when data matches the expected SHA-256 digest", () => {
    const data = Buffer.from("arxmint release artifact");
    const expected = createHash("sha256").update(data).digest("hex");
    assert.equal(verifyChecksum(data, expected), true);
  });

  it("returns false when data has been tampered with", () => {
    const original = Buffer.from("arxmint release artifact");
    const expected = createHash("sha256").update(original).digest("hex");
    const tampered = Buffer.from("arxmint release artifact TAMPERED");
    assert.equal(verifyChecksum(tampered, expected), false);
  });

  it("returns false for an expected digest that is not 64 hex chars", () => {
    const data = Buffer.from("hello");
    assert.equal(verifyChecksum(data, "tooshort"), false);
    assert.equal(verifyChecksum(data, "z".repeat(64)), false); // invalid hex
  });

  it("is case-insensitive for the expected digest", () => {
    const data = Buffer.from("case test");
    const lower = createHash("sha256").update(data).digest("hex");
    const upper = lower.toUpperCase();
    assert.equal(verifyChecksum(data, lower), true);
    assert.equal(verifyChecksum(data, upper), true);
  });
});

// ── verifyManifest ─────────────────────────────────────────────────────────────

const VALID_MANIFEST = {
  version: "0.5.0",
  channel: "stable" as const,
  changelog: "Phase 5",
  minNodeVersion: "22.0.0",
  // SHA-256 of empty string — a valid 64-char hex digest
  checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  sha256: {} as Record<string, string>,
};

describe("verifyManifest", () => {
  it("accepts a well-formed manifest", () => {
    assert.equal(verifyManifest(VALID_MANIFEST, ""), true);
  });

  it("accepts beta channel", () => {
    assert.equal(verifyManifest({ ...VALID_MANIFEST, channel: "beta" }, ""), true);
  });

  it("rejects unknown channel value", () => {
    assert.equal(verifyManifest({ ...VALID_MANIFEST, channel: "nightly" as any }, ""), false);
  });

  it("rejects missing version", () => {
    assert.equal(verifyManifest({ ...VALID_MANIFEST, version: "" }, ""), false);
  });

  it("rejects missing minNodeVersion", () => {
    assert.equal(verifyManifest({ ...VALID_MANIFEST, minNodeVersion: "" }, ""), false);
  });

  it("rejects checksum that is not 64-char hex", () => {
    assert.equal(verifyManifest({ ...VALID_MANIFEST, checksum: "deadbeef" }, ""), false);
  });

  it("rejects checksum with non-hex characters", () => {
    assert.equal(
      verifyManifest({ ...VALID_MANIFEST, checksum: "z".repeat(64) }, ""),
      false
    );
  });

  it("rejects manifest with missing checksum field", () => {
    const { checksum: _removed, ...noChecksum } = VALID_MANIFEST;
    assert.equal(verifyManifest(noChecksum as any, ""), false);
  });
});

// ── compareVersions ────────────────────────────────────────────────────────────

describe("compareVersions", () => {
  it("detects update available", () => {
    assert.equal(compareVersions("0.4.0", "0.5.0"), "update-available");
    assert.equal(compareVersions("0.5.0", "1.0.0"), "update-available");
    assert.equal(compareVersions("0.5.0", "0.5.1"), "update-available");
  });

  it("detects up-to-date", () => {
    assert.equal(compareVersions("0.5.0", "0.5.0"), "up-to-date");
  });

  it("detects downgrade", () => {
    assert.equal(compareVersions("1.0.0", "0.5.0"), "downgrade");
  });
});

// ── getCurrentVersion ──────────────────────────────────────────────────────────

describe("getCurrentVersion", () => {
  it("returns a non-empty version string", () => {
    const v = getCurrentVersion();
    assert.equal(typeof v, "string");
    assert.ok(v.length > 0, "version should not be empty");
  });
});
