// ============================================================
// ArxMint — Identity Resolution API
// GET /api/identity/resolve — Resolve any external ID to a root identity + all aliases
//
// Auth: ArxMint session cookie, Bearer cross-auth, or X-Marketplace-Secret
//
// @openapi
// /api/identity/resolve:
//   get:
//     summary: Resolve an external ID to a root identity and all aliases
//     x-agent-scope: identity:read
//     x-agent-safe: true
//     x-auth-method: NIP-98 | X-Marketplace-Secret
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { resolveIdentity, getAllAliases, isValidNamespace } from "@/lib/identity";

/**
 * GET /api/identity/resolve?id={externalId}&namespace={optional}
 *
 * Query params:
 *   id:         string — the external identifier to resolve (required unless rootId given)
 *   namespace:  string — narrow search to a specific namespace (optional)
 *   rootId:     string — alternatively, get all aliases for a known ArxMint User.id
 *
 * Returns:
 *   200: { ok: true, rootId, aliases: [...] }
 *   400: validation error
 *   401: unauthenticated
 *   404: identity not found
 */
export async function GET(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const externalId = searchParams.get("id");
  const namespace = searchParams.get("namespace");
  const rootId = searchParams.get("rootId");

  // Mode 1: Get all aliases for a known root user
  if (rootId) {
    const result = await getAllAliases(rootId);
    if (!result) {
      return NextResponse.json({ error: "No aliases found for this user" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...result });
  }

  // Mode 2: Resolve by external ID
  if (!externalId) {
    return NextResponse.json(
      { error: "id or rootId query parameter is required" },
      { status: 400 }
    );
  }

  if (namespace && !isValidNamespace(namespace)) {
    return NextResponse.json(
      { error: "namespace must be lowercase alphanumeric, hyphens, or underscores (max 64 chars)" },
      { status: 400 }
    );
  }

  const result = await resolveIdentity(externalId, namespace ?? undefined);

  if (!result) {
    return NextResponse.json(
      { error: "Identity not found", id: externalId },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
