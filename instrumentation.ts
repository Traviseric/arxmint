// ============================================================
// ArxMint - Startup instrumentation
// Fail fast on missing critical environment variables in production.
// ============================================================

import { validateRequiredEnv } from "@/lib/env-check";

export async function register(): Promise<void> {
  const result = validateRequiredEnv();

  if (!result.valid) {
    // Log missing vars but do NOT crash — payment features (Cashu, L402)
    // are not yet live and should not block the merchant pledge API.
    console.warn(
      `[ArxMint] Missing environment variables: ${result.missing.join(", ")}. ` +
      `Payment features will be unavailable until these are set.`
    );
  }
}
