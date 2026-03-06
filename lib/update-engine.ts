/**
 * ArxMint Stack Update Engine
 * Checks for updates via a signed version manifest and reports availability.
 * Signing: SHA-256 checksum verification for pilot (Option A).
 *   For production, replace with GPG detached signature (Option B):
 *   - Place the ArxMint release signing public key at: update/arxmint-release.pub.asc
 *   - Ship manifest.json.sig alongside manifest.json
 *   - Verify with: gpg --verify manifest.json.sig manifest.json
 *   - Set ARXMINT_RELEASE_KEY_ID env var to the expected key fingerprint
 *
 * T20 / Roadmap 5.11a
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

export interface VersionManifest {
  version: string;
  channel: "stable" | "beta";
  changelog: string;
  minNodeVersion: string;
  /** SHA-256 hex digest of the primary release tarball for this version. */
  checksum: string;
  sha256: Record<string, string>;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  version: string;
  changelog: string;
  currentVersion: string;
}

const MANIFEST_URL = "https://arxmint.com/update/manifest.json";
const LOCAL_MANIFEST_PATH = join(process.cwd(), "update", "manifest.json");

/** Returns the version from package.json */
export function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Fetches the remote version manifest.
 * Falls back to local update/manifest.json when offline or in dev.
 */
export async function fetchRemoteManifest(
  channel: "stable" | "beta" = "stable"
): Promise<VersionManifest> {
  try {
    const url = `${MANIFEST_URL}?channel=${channel}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data as VersionManifest;
  } catch {
    // Offline or unreachable — fall back to local manifest
    const raw = readFileSync(LOCAL_MANIFEST_PATH, "utf8");
    return JSON.parse(raw) as VersionManifest;
  }
}

/**
 * Verifies a downloaded artifact's integrity against its expected SHA-256 checksum.
 * Call this after downloading the release tarball, before extracting or installing.
 *
 * @param data     Raw bytes of the downloaded artifact.
 * @param expected Hex-encoded SHA-256 digest from the manifest's `checksum` field.
 * @returns        true if the digest matches, false if tampered or mismatched.
 */
export function verifyChecksum(data: Buffer, expected: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(expected)) return false;
  const actual = createHash("sha256").update(data).digest("hex");
  return actual === expected;
}

/** SHA-256 hex pattern — 64 lowercase hex characters. */
const HEX64_RE = /^[0-9a-f]{64}$/i;

/**
 * Validates manifest structure and cryptographic fields (pilot: SHA-256 checksum format).
 *
 * Checks:
 *  1. Required string fields are present and non-empty.
 *  2. `channel` is one of the known enum values.
 *  3. `checksum` is a valid 64-character hex digest (format check; content is
 *     verified separately via `verifyChecksum()` after artifact download).
 *
 * Production upgrade path (Option B — GPG):
 *   Replace or augment this function with GPG signature verification once the
 *   ArxMint release signing key is distributed. See module-level doc comment.
 */
export function verifyManifest(manifest: VersionManifest, _signature: string): boolean {
  return (
    typeof manifest.version === "string" && manifest.version.length > 0 &&
    typeof manifest.changelog === "string" &&
    typeof manifest.minNodeVersion === "string" && manifest.minNodeVersion.length > 0 &&
    (manifest.channel === "stable" || manifest.channel === "beta") &&
    typeof manifest.sha256 === "object" &&
    typeof manifest.checksum === "string" && HEX64_RE.test(manifest.checksum)
  );
}

/**
 * Compares semantic versions.
 * Returns 'update-available' | 'up-to-date' | 'downgrade'
 */
export function compareVersions(
  current: string,
  remote: string
): "update-available" | "up-to-date" | "downgrade" {
  const parse = (v: string) => v.split(".").map(Number);
  const [cm, cmi, cp] = parse(current);
  const [rm, rmi, rp] = parse(remote);

  if (rm > cm) return "update-available";
  if (rm < cm) return "downgrade";
  if (rmi > cmi) return "update-available";
  if (rmi < cmi) return "downgrade";
  if (rp > cp) return "update-available";
  if (rp < cp) return "downgrade";
  return "up-to-date";
}

/** Primary export — used by /api/update/check */
export async function checkForUpdate(
  channel: "stable" | "beta" = "stable"
): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentVersion();
  try {
    const manifest = await fetchRemoteManifest(channel);
    if (!verifyManifest(manifest, "")) {
      return { hasUpdate: false, version: currentVersion, changelog: "", currentVersion };
    }
    const cmp = compareVersions(currentVersion, manifest.version);
    return {
      hasUpdate: cmp === "update-available",
      version: manifest.version,
      changelog: manifest.changelog,
      currentVersion,
    };
  } catch {
    return { hasUpdate: false, version: currentVersion, changelog: "", currentVersion };
  }
}
