// ============================================================
// ArxMint — Identity Unlink API
// DELETE /api/identity/unlink — Remove an identity alias link
//
// Auth: ArxMint session cookie, Bearer cross-auth, or X-Marketplace-Secret
//
// @openapi
// /api/identity/unlink:
//   delete:
//     summary: Remove an identity alias link
//     operationId: unlinkIdentity
//     x-agent-scope: identity:write
//     x-agent-safe: false
//     x-privacy-level: sensitive
//     x-l402-scope: identity:write
//     security:
//       - NIP98: []
//       - MarketplaceSecret: []
//       - L402: [identity:write]
//     tags: [Identity]
//     see: docs/openapi/identity.yaml
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { unlinkIdentity, isValidNamespace } from "@/lib/identity";

/**
 * DELETE /api/identity/unlink
 *
 * Body:
 *   namespace:  string — namespace of the alias to remove
 *   externalId: string — the foreign identifier to unlink
 *
 * Auth: caller identity extracted via getCallerFromRequest().
 *
 * Returns:
 *   200: { ok: true }
 *   400: validation error
 *   401: unauthenticated
 *   500: unlink failed
 */
export async function DELETE(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { namespace, externalId } = body as {
    namespace?: string;
    externalId?: string;
  };

  if (!namespace || typeof namespace !== "string" || !isValidNamespace(namespace)) {
    return NextResponse.json(
      { error: "namespace is required (lowercase alphanumeric, hyphens, underscores, max 64 chars)" },
      { status: 400 }
    );
  }
  if (!externalId || typeof externalId !== "string") {
    return NextResponse.json({ error: "externalId is required" }, { status: 400 });
  }

  const removed = await unlinkIdentity(namespace, externalId);

  if (!removed) {
    return NextResponse.json({ error: "Failed to unlink identity" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
