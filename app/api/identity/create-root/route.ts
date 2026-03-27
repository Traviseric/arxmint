// ============================================================
// ArxMint — Identity Create Root
// POST /api/identity/create-root
//
// Creates a minimal ArxMint user to serve as an identity root.
// Used by external ecosystem services that need to link
// identities before any ArxMint-native user exists.
//
// Auth: X-Marketplace-Secret only (server-to-server).
//
// @openapi
// /api/identity/create-root:
//   post:
//     summary: Create a minimal ArxMint identity root for ecosystem services
//     operationId: createIdentityRoot
//     x-agent-scope: identity:write
//     x-agent-safe: false
//     x-privacy-level: sensitive
//     x-l402-scope: identity:write
//     security:
//       - MarketplaceSecret: []
//       - NIP98: []
//     tags: [Identity]
//     see: docs/openapi/identity.yaml
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";

/**
 * POST /api/identity/create-root
 *
 * Body:
 *   linkedBy: string — who triggered the creation (for audit trail)
 *   metadata?: object — optional context (e.g., { event: "signup", source: "teneo-auth" })
 *
 * Auth: X-Marketplace-Secret header (server-to-server only).
 * Regular user auth (session cookie, Bearer) is also accepted.
 *
 * Returns:
 *   201: { ok: true, id, createdAt }
 *   400: validation error
 *   401: unauthenticated
 *   500: creation failed
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

  const { linkedBy, metadata } = body as {
    linkedBy?: string;
    metadata?: Record<string, unknown>;
  };

  if (!linkedBy || typeof linkedBy !== "string") {
    return NextResponse.json({ error: "linkedBy is required" }, { status: 400 });
  }

  try {
    const { supabase } = await import("@/lib/supabase");

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        // Minimal user — no pubkey, no email, no name.
        // These can be filled in later when the user authenticates natively.
      })
      .select("id, created_at")
      .single();

    if (error) {
      logger.error("identity_create_root_failed", {
        action: "identity_create_root",
        message: error.message,
        caller,
      });
      return NextResponse.json({ error: "Failed to create root user" }, { status: 500 });
    }

    logger.info("identity_root_created", {
      action: "identity_create_root",
      rootId: user.id.slice(0, 8) + "...",
      linkedBy,
      caller,
      metadata: metadata ? JSON.stringify(metadata).slice(0, 200) : undefined,
    });

    return NextResponse.json(
      { ok: true, id: user.id, createdAt: user.created_at },
      { status: 201 }
    );
  } catch (err) {
    logger.error("identity_create_root_exception", {
      action: "identity_create_root",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
