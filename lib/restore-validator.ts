/**
 * ArxMint Restore Validator
 * Validates restore readiness — backup file presence, LND seed format,
 * and overall recovery status for display in the merchant dashboard.
 *
 * T22 / Roadmap 5.11c
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

export interface BackupFileStatus {
  postgresBackup: string | null;
  cashuProofs: string | null;
  envBackup: boolean;
  channelBackup: string | null;
  lastModified: Date | null;
}

export interface RestoreStatus {
  ready: boolean;
  backupFiles: BackupFileStatus;
  missingFiles: string[];
  warnings: string[];
}

/**
 * Checks which backup files exist in the given directory.
 * Returns paths to the most recent backup of each type.
 */
export function checkBackupFiles(dir: string): BackupFileStatus {
  const findLatest = (prefix: string, ext: string): string | null => {
    if (!existsSync(dir)) return null;
    const files = readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
      .sort()
      .reverse();
    return files.length > 0 ? join(dir, files[0]) : null;
  };

  const postgresBackup = findLatest("postgres-", ".sql.gz");
  const cashuProofs = findLatest("cashu-proofs-", ".json");
  const channelBackup =
    existsSync(join(dir, "channel.backup.latest"))
      ? join(dir, "channel.backup.latest")
      : findLatest("channel.backup.", "");
  const envBackup = existsSync(join(dir, ".env.local.backup"));

  // Last modified = most recent file among those found
  const candidates = [postgresBackup, cashuProofs, channelBackup].filter(Boolean) as string[];
  let lastModified: Date | null = null;
  for (const f of candidates) {
    try {
      const mtime = statSync(f).mtime;
      if (!lastModified || mtime > lastModified) lastModified = mtime;
    } catch {
      // ignore
    }
  }

  return { postgresBackup, cashuProofs, channelBackup, envBackup, lastModified };
}

/**
 * Validates an aezeed seed phrase (24 words).
 * Checks word count and that each word is non-empty.
 * Full wordlist validation can be added when @lightninglabs/aezeed is available.
 */
export function validateLndSeed(words: string[]): { valid: boolean; error?: string } {
  const cleaned = words.map((w) => w.trim().toLowerCase()).filter(Boolean);
  if (cleaned.length !== 24) {
    return { valid: false, error: `Expected 24 words, got ${cleaned.length}` };
  }
  const invalidChars = /[^a-z]/;
  const bad = cleaned.find((w) => invalidChars.test(w));
  if (bad) {
    return { valid: false, error: `Word "${bad}" contains invalid characters` };
  }
  return { valid: true };
}

/**
 * Returns a full restore readiness report for the merchant dashboard.
 * backupDir defaults to ./backup relative to cwd.
 */
export function getRestoreStatus(backupDir?: string): RestoreStatus {
  const dir = backupDir ?? join(process.cwd(), "backup");
  const files = checkBackupFiles(dir);
  const missingFiles: string[] = [];
  const warnings: string[] = [];

  if (!files.postgresBackup) missingFiles.push("postgres database backup (postgres-*.sql.gz)");
  if (!files.cashuProofs) warnings.push("No Cashu proof backup found — ecash balances may be unrecoverable");
  if (!files.channelBackup) missingFiles.push("LND channel backup (channel.backup.latest)");
  if (!files.envBackup) warnings.push("No .env.local backup found — secrets must be re-entered manually");

  const ready = missingFiles.length === 0;
  return { ready, backupFiles: files, missingFiles, warnings };
}
