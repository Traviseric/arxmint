/**
 * Tests for lib/backup-engine.ts
 * Uses Node's built-in test runner with --experimental-strip-types.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { register } from "node:module";

register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore — dynamic import after hook registration
const { encryptBackup, decryptBackup, getLastBackupTime, runBackup } =
  await import("../lib/backup-engine.ts");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = join(tmpdir(), `arxmint-backup-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// 32 bytes = 64 hex chars
const TEST_KEY = "a".repeat(64);

// ── encryptBackup / decryptBackup ─────────────────────────────────────────────

describe("encryptBackup / decryptBackup", () => {
  it("round-trips plaintext through AES-256-GCM", async () => {
    const dir = makeTmpDir();
    const plainPath = join(dir, "test.bin");
    const plaintext = "hello sovereign backup world";
    writeFileSync(plainPath, plaintext, "utf8");

    const encPath = await encryptBackup(plainPath, TEST_KEY);
    assert.ok(encPath.endsWith(".enc"), "encrypted file should have .enc extension");
    assert.ok(existsSync(encPath), "encrypted file should exist");

    const decPath = await decryptBackup(encPath, TEST_KEY);
    const recovered = readFileSync(decPath, "utf8");
    assert.equal(recovered, plaintext, "decrypted content should match original");

    rmSync(dir, { recursive: true, force: true });
  });

  it("throws if key is wrong length", async () => {
    const dir = makeTmpDir();
    const f = join(dir, "test.bin");
    writeFileSync(f, "data");
    await assert.rejects(
      () => encryptBackup(f, "tooshort"),
      /32 bytes/,
      "should reject short key"
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

// ── getLastBackupTime ─────────────────────────────────────────────────────────

describe("getLastBackupTime", () => {
  it("returns null for nonexistent directory", () => {
    assert.equal(getLastBackupTime("/nonexistent/path/xyz"), null);
  });

  it("returns the mtime of the newest file", async () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, "old.txt"), "old");
    await new Promise((r) => setTimeout(r, 60));
    writeFileSync(join(dir, "new.txt"), "new");

    const result = getLastBackupTime(dir);
    assert.ok(result instanceof Date, "should return a Date");
    assert.ok(result!.getTime() > 0);

    rmSync(dir, { recursive: true, force: true });
  });
});

// ── runBackup ────────────────────────────────────────────────────────────────

describe("runBackup", () => {
  it("returns BackupResult with success=true (no LND running)", async () => {
    const dir = makeTmpDir();
    const result = await runBackup({
      lndDataDir: "/nonexistent/lnd",
      backupDir: dir,
      destinations: ["local"],
    });

    assert.equal(typeof result.success, "boolean");
    assert.equal(result.success, true);
    assert.equal(typeof result.timestamp, "string");
    assert.ok(Array.isArray(result.files));
    assert.equal(result.encrypted, false);

    rmSync(dir, { recursive: true, force: true });
  });

  it("marks result as encrypted when encryptionKey is provided", async () => {
    const dir = makeTmpDir();
    const result = await runBackup({
      lndDataDir: "/nonexistent/lnd",
      backupDir: dir,
      encryptionKey: TEST_KEY,
      destinations: ["local"],
    });
    assert.equal(result.encrypted, true);
    rmSync(dir, { recursive: true, force: true });
  });
});
