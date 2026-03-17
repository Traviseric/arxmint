// ============================================================
// ArxMint — Teneo JWT utility (pure, no external dependencies)
// Extracts userId claims from unverified teneo-auth JWTs.
// ============================================================

export interface TeneoOrgMembership {
  id: string;
  slug?: string;
  name?: string;
  role?: string;
}

type TeneoClaims = Record<string, unknown>;

function decodeClaims(header: string): TeneoClaims | null {
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
    return JSON.parse(decoded) as TeneoClaims;
  } catch {
    return null;
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getSiteGrant(claims: TeneoClaims, siteSlug: string): TeneoClaims | null {
  const sites = claims.sites;
  if (!sites || typeof sites !== "object") {
    return null;
  }

  const siteGrant = (sites as Record<string, unknown>)[siteSlug];
  return siteGrant && typeof siteGrant === "object"
    ? (siteGrant as TeneoClaims)
    : null;
}

function hasPrivilegedOrgRole(role: unknown): boolean {
  const normalized = asNonEmptyString(role)?.toLowerCase();
  return normalized === "owner" || normalized === "admin" || normalized === "manager";
}

export function parseTeneoAuthClaims(header: string): TeneoClaims | null {
  return decodeClaims(header);
}

/**
 * Parse a teneo-auth JWT from the `X-Teneo-Auth` header and extract the userId.
 *
 * NOTE: Performs unverified JWT payload decoding — we don't hold teneo-auth's
 * signing key. This is intentional: auto-linking is best-effort enrichment
 * and the checkout is NOT gated on this data. Verification is deferred until
 * teneo-auth exposes a JWKS endpoint or shares a verification secret.
 */
export function parseTeneoAuthUserId(header: string): string | null {
  const claims = decodeClaims(header);
  if (!claims) return null;

  const userId = claims.sub ?? claims.userId ?? claims.id;
  if (typeof userId === "string" && userId) return userId;
  if (typeof userId === "number" && !isNaN(userId)) return String(userId);
  return null;
}

export function parseTeneoAuthOrgs(header: string): TeneoOrgMembership[] {
  const claims = decodeClaims(header);
  if (!claims) return [];

  const orgs = claims.orgs;
  if (!Array.isArray(orgs)) {
    return [];
  }

  return orgs
    .map((org) => {
      if (!org || typeof org !== "object") {
        return null;
      }

      const record = org as Record<string, unknown>;
      const id = asNonEmptyString(record.id);
      if (!id) {
        return null;
      }

      const membership: TeneoOrgMembership = { id };
      const slug = asNonEmptyString(record.slug);
      const name = asNonEmptyString(record.name);
      const role = asNonEmptyString(record.role);

      if (slug) membership.slug = slug;
      if (name) membership.name = name;
      if (role) membership.role = role;

      return membership;
    })
    .filter((org): org is TeneoOrgMembership => org !== null);
}

export function parseTeneoActiveOrg(
  header: string,
  siteSlug = "arxmint"
): TeneoOrgMembership | null {
  const claims = decodeClaims(header);
  if (!claims) return null;

  const orgs = parseTeneoAuthOrgs(header);
  if (orgs.length === 0) {
    return null;
  }

  const siteGrant = getSiteGrant(claims, siteSlug);
  const explicitCandidates = [
    asNonEmptyString(claims.orgId),
    asNonEmptyString(claims.org_id),
    asNonEmptyString(claims.organizationId),
    asNonEmptyString(claims.organization_id),
    asNonEmptyString(siteGrant?.orgId),
    asNonEmptyString(siteGrant?.org_id),
    asNonEmptyString(siteGrant?.organizationId),
    asNonEmptyString(siteGrant?.organization_id),
  ];

  for (const candidate of explicitCandidates) {
    const match =
      orgs.find((org) => org.id === candidate || org.slug === candidate) ?? null;
    if (match) {
      return match;
    }
  }

  if (orgs.length === 1) {
    return orgs[0];
  }

  return orgs.find((org) => hasPrivilegedOrgRole(org.role)) ?? orgs[0];
}
