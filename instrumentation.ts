// ============================================================
// ArxMint - Startup instrumentation
// Fail fast on missing critical environment variables in production.
// ============================================================

import { validateRequiredEnv } from "@/lib/env-check";

export async function register(): Promise<void> {
  const result = validateRequiredEnv();

  if (process.env.NODE_ENV === "production" && !result.valid) {
    throw new Error(
      `[ArxMint] Missing required environment variables: ${result.missing.join(", ")}`
    );
  }
}
