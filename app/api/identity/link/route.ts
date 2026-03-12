// ============================================================
// ArxMint — Identity Link API
// POST /api/identity/link — Link an external identity to an ArxMint user
//
// Auth: ArxMint session cookie, Bearer cross-auth, or X-Marketplace-Secret
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { linkIdentity, isValidNamespace, type LinkRequest } from "@/lib/identity";

/**
 * POST /api/identity/link
 *
 * Body:
 *   rootId:     string — ArxMint User.id to link to (required)
 *   namespace:  string — caller-defined namespace (lowercase alphanumeric, hyphens, underscores)
 *   externalId: string — the foreign identifier
 *   metadata?:  object — optional context
 *
 * Auth: caller identity extracted via getCallerFromRequest().
 * The caller's identity (Nostr pubkey or "marketplace-system") is recorded as linkedBy.
 *
 * Returns:
 *   201: { ok: true, alias, created: true }
 *   200: { ok: true, alias, created: false }  (idempotent — already linked)
 *   400: validation error
 *   401: unauthenticated
 *   404: root user not found
 *   409: externalId already linked to a different root
 */
export async function POST(request: NextRequest) {
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

  const { rootId, namespace, externalId, metadata } = body as {
    rootId?: string;
    namespace?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  };

  if (!rootId || typeof rootId !== "string") {
    return NextResponse.json({ error: "rootId is required" }, { status: 400 });
  }
  if (!namespace || typeof namespace !== "string" || !isValidNamespace(namespace)) {
    return NextResponse.json(
      { error: "namespace is required (lowercase alphanumeric, hyphens, underscores, max 64 chars)" },
      { status: 400 }
    );
  }
  if (!externalId || typeof externalId !== "string") {
    return NextResponse.json({ error: "externalId is required" }, { status: 400 });
  }
  if (externalId.length > 512) {
    return NextResponse.json({ error: "externalId too long (max 512)" }, { status: 400 });
  }

  const linkReq: LinkRequest = {
    namespace,
    externalId,
    linkedBy: caller,
    metadata,
  };

  const result = await linkIdentity(rootId, linkReq);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { ok: true, alias: result.alias, created: result.created },
    { status: result.created ? 201 : 200 }
  );
}
