/**
 * ArxMint Stack Update Engine
 * Checks for updates via a signed version manifest and reports availability.
 * Signing: shape validation for pilot. Document where to insert GPG verification.
 *
 * T20 / Roadmap 5.11a
 */

import { readFileSync } from "fs";
import { join } from "path";

export interface VersionManifest {
  version: string;
  channel: "stable" | "beta";
  changelog: string;
  minNodeVersion: string;
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
 * Validates manifest shape (structural check for pilot).
 * TODO: Replace with GPG signature verification in production.
 * Place the ArxMint release signing public key at: update/arxmint-release.pub.asc
 * Use: `gpg --verify manifest.json.sig manifest.json`
 */
export function verifyManifest(manifest: VersionManifest, _signature: string): boolean {
  return (
    typeof manifest.version === "string" &&
    typeof manifest.changelog === "string" &&
    typeof manifest.minNodeVersion === "string" &&
    (manifest.channel === "stable" || manifest.channel === "beta") &&
    typeof manifest.sha256 === "object"
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
