// ============================================================
// ArxMint — Lightning Remote Signer Validator
// Pure validation utilities — no "use client", importable by
// server-side API routes and client-side code alike.
// ============================================================

/** Remote signer configuration for PAY_ONLY tier */
export interface RemoteSignerConfig {
  /** URL of the litd remote signer */
  signerUrl: string;
  /** TLS certificate (base64) */
  tlsCert?: string;
  /** Macaroon for the remote signer (hex) */
  macaroon?: string;
}

/** Validate that a PAY_ONLY remote signer config is complete and safe */
export function validateRemoteSignerConfig(
  config?: RemoteSignerConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    return {
      valid: false,
      errors: [
        "missing remote signer config",
        "signerUrl is required",
        "tlsCert is required",
        "macaroon is required",
      ],
    };
  }

  const signerUrl = config.signerUrl?.trim();
  const tlsCert = config.tlsCert?.trim();
  const macaroon = config.macaroon?.trim();

  if (!signerUrl) {
    errors.push("signerUrl is required");
  } else if (!/^https?:\/\//i.test(signerUrl)) {
    errors.push("signerUrl must start with http:// or https://");
  } else {
    try {
      // Require a parseable URL so misconfigured hosts fail closed.
      const parsed = new URL(signerUrl);
      if (!parsed.hostname) {
        errors.push("signerUrl must include a hostname");
      }
    } catch {
      errors.push(
        "signerUrl must be a valid URL (e.g. https://signer.local:8443)"
      );
    }
  }

  if (!tlsCert) {
    errors.push("tlsCert is required");
  }

  if (!macaroon) {
    errors.push("macaroon is required");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate remote signer env requirements for PAY_ONLY mode.
 * Accepts both server env keys and NEXT_PUBLIC keys for local/browser flows.
 *
 * Hard failure cases:
 * - REMOTE_SIGNER_URL is set but LNC_SECURITY_TIER is not "pay-only" (ambiguous intent)
 * - LNC_SECURITY_TIER is "pay-only" but signer config is incomplete
 */
export function validateRemoteSignerEnv(
  env: Record<string, string | undefined>
): { valid: boolean; errors: string[] } {
  const tier = (env.LNC_SECURITY_TIER || "watch-only").trim().toLowerCase();
  const signerUrl =
    env.REMOTE_SIGNER_URL || env.NEXT_PUBLIC_REMOTE_SIGNER_URL;

  // If REMOTE_SIGNER_URL is set, we MUST be in pay-only mode — fail closed.
  if (signerUrl && tier !== "pay-only") {
    return {
      valid: false,
      errors: [
        `REMOTE_SIGNER_URL is set but LNC_SECURITY_TIER is "${tier}" — ` +
          `set LNC_SECURITY_TIER=pay-only to use remote signer mode`,
      ],
    };
  }

  if (tier !== "pay-only") {
    return { valid: true, errors: [] };
  }

  return validateRemoteSignerConfig({
    signerUrl: signerUrl || "",
    tlsCert:
      env.REMOTE_SIGNER_TLS_CERT || env.NEXT_PUBLIC_REMOTE_SIGNER_TLS_CERT,
    macaroon:
      env.REMOTE_SIGNER_MACAROON || env.NEXT_PUBLIC_REMOTE_SIGNER_MACAROON,
  });
}
