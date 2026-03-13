// ============================================================
// ArxMint — Teneo JWT utility (pure, no external dependencies)
// Extracts userId claims from unverified teneo-auth JWTs.
// ============================================================

/**
 * Parse a teneo-auth JWT from the `X-Teneo-Auth` header and extract the userId.
 *
 * NOTE: Performs unverified JWT payload decoding — we don't hold teneo-auth's
 * signing key. This is intentional: auto-linking is best-effort enrichment
 * and the checkout is NOT gated on this data. Verification is deferred until
 * teneo-auth exposes a JWKS endpoint or shares a verification secret.
 *
 * Accepts:
 *   - Standard JWT (header.payload.signature, base64url-encoded payload)
 *   - Optional "Bearer " prefix
 *
 * Looks for userId in claims: sub → userId → id (in priority order).
 * Returns null on any parse failure.
 */
export function parseTeneoAuthUserId(header: string): string | null {
  if (!header || typeof header !== "string") return null;

  // Strip optional "Bearer " prefix
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    // Base64url → base64 → decode payload JSON
    const base64url = parts[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    const claims = JSON.parse(decoded) as Record<string, unknown>;

    // Try common userId claim names in priority order
    const userId = claims.sub ?? claims.userId ?? claims.id;
    if (typeof userId === "string" && userId) return userId;
    if (typeof userId === "number" && !isNaN(userId)) return String(userId);
    return null;
  } catch {
    return null;
  }
}
