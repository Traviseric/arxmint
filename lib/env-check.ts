// ============================================================
// ArxMint — Startup Environment Validation
// Fail fast if required environment variables are missing.
// Call validateRequiredEnv() on server startup (e.g., in
// instrumentation.ts or the health route).
// ============================================================

interface EnvCheckResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

// Variables that MUST be set in production — app is unsafe without them
const REQUIRED_PROD_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "CASHU_PRIVATE_KEY",
];

// Variables that SHOULD be set (warn in dev, error in prod)
const RECOMMENDED_VARS = [
  "MACAROON_ROOT_KEY",
  "POSTGRES_PASSWORD",
  "CASHU_MINT_URL",
];

export function validateRequiredEnv(): EnvCheckResult {
  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_PROD_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      if (isProd) {
        missing.push(key);
      } else {
        warnings.push(`${key} is not set — required in production`);
      }
    }
  }

  for (const key of RECOMMENDED_VARS) {
    if (!process.env[key]) {
      warnings.push(`${key} is not set — recommended for production`);
    }
  }

  // Specific validations
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && (secret === "dev-secret-change-in-production" || secret.length < 32)) {
    if (isProd) {
      missing.push("NEXTAUTH_SECRET (must be ≥32 chars and not the default value)");
    } else {
      warnings.push("NEXTAUTH_SECRET is using the default dev value — change in production");
    }
  }

  const cashuKey = process.env.CASHU_PRIVATE_KEY;
  if (cashuKey && cashuKey === "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef") {
    if (isProd) {
      missing.push("CASHU_PRIVATE_KEY (must not use the known public test key)");
    } else {
      warnings.push("CASHU_PRIVATE_KEY is using the known public deadbeef test key — never use in production");
    }
  }

  if (missing.length > 0) {
    console.error(
      "[ArxMint] FATAL: Required environment variables are missing:\n" +
        missing.map((v) => `  • ${v}`).join("\n") +
        "\nSet these variables and restart the server."
    );
  }

  if (warnings.length > 0) {
    console.warn(
      "[ArxMint] Environment warnings:\n" + warnings.map((w) => `  • ${w}`).join("\n")
    );
  }

  return { valid: missing.length === 0, missing, warnings };
}
