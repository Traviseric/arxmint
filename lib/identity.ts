// ============================================================
// ArxMint — Identity Alias Graph (Generic)
// Links external identifiers to ArxMint User roots.
//
// Namespaces are free-form strings — callers define their own.
// ArxMint does not prescribe or enumerate namespaces.
//
// SECURITY: externalIds may contain PII (emails, user IDs).
// Never log full externalIds — use prefixed truncation.
// ============================================================

import { logger } from "@/lib/logger";
import { parseTeneoAuthUserId as _parseTeneoAuthUserId } from "./teneo-jwt";

export interface IdentityAlias {
  id: string;
  rootId: string;
  namespace: string;
  externalId: string;
  linkedBy: string;
  metadata?: Record<string, unknown> | null;
  linkedAt: Date;
}

export interface ResolvedIdentity {
  rootId: string;
  aliases: IdentityAlias[];
}

export interface LinkRequest {
  namespace: string;
  externalId: string;
  linkedBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * Validate that a namespace string is safe for storage.
 * Must be 1-64 lowercase alphanumeric characters, hyphens, or underscores.
 */
export function isValidNamespace(ns: string): boolean {
  return /^[a-z0-9_-]{1,64}$/.test(ns);
}

/**
 * Link an external identity to an ArxMint user.
 * If the externalId is already linked to this rootId, returns the existing alias.
 * If the externalId is linked to a DIFFERENT rootId, returns an error (conflict).
 */
export async function linkIdentity(
  rootId: string,
  req: LinkRequest
): Promise<{ alias: IdentityAlias; created: boolean } | { error: string; status: number }> {
  try {
    const { supabase } = await import("@/lib/supabase");

    // Check if this externalId is already linked
    const { data: existing, error: lookupError } = await supabase
      .from("identity_aliases")
      .select("*")
      .eq("namespace", req.namespace)
      .eq("external_id", req.externalId)
      .maybeSingle();

    if (lookupError) {
      logger.error("identity_link_lookup_failed", {
        action: "identity_link",
        message: lookupError.message,
      });
      return { error: "Failed to check existing links", status: 500 };
    }

    if (existing) {
      if (existing.root_id === rootId) {
        return { alias: rowToAlias(existing), created: false };
      }
      return {
        error: `Identity ${req.namespace}:${truncateId(req.externalId)} is already linked to a different user`,
        status: 409,
      };
    }

    // Verify root user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", rootId)
      .maybeSingle();

    if (userError || !user) {
      return { error: "Root user not found", status: 404 };
    }

    // Create the link
    const { data: created, error: insertError } = await supabase
      .from("identity_aliases")
      .insert({
        root_id: rootId,
        namespace: req.namespace,
        external_id: req.externalId,
        linked_by: req.linkedBy,
        metadata: req.metadata ?? null,
      })
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return {
          error: `Identity ${req.namespace}:${truncateId(req.externalId)} was just linked by another request`,
          status: 409,
        };
      }
      logger.error("identity_link_insert_failed", {
        action: "identity_link",
        message: insertError.message,
      });
      return { error: "Failed to create identity link", status: 500 };
    }

    logger.info("identity_linked", {
      action: "identity_link",
      rootId: truncateId(rootId),
      namespace: req.namespace,
      externalId: truncateId(req.externalId),
      linkedBy: req.linkedBy,
    });

    return { alias: rowToAlias(created), created: true };
  } catch (err) {
    logger.error("identity_link_exception", {
      action: "identity_link",
      message: err instanceof Error ? err.message : String(err),
    });
    return { error: "Internal error during identity linking", status: 500 };
  }
}

/**
 * Resolve any external ID to a root identity and all its aliases.
 * Optionally narrow by namespace.
 */
export async function resolveIdentity(
  externalId: string,
  namespace?: string
): Promise<ResolvedIdentity | null> {
  try {
    const { supabase } = await import("@/lib/supabase");

    let query = supabase
      .from("identity_aliases")
      .select("*")
      .eq("external_id", externalId);

    if (namespace) {
      query = query.eq("namespace", namespace);
    }

    const { data: match, error } = await query.maybeSingle();

    if (error) {
      // Multiple matches (no namespace) — take the first
      if (error.code === "PGRST116") {
        const { data: firstMatch } = await supabase
          .from("identity_aliases")
          .select("*")
          .eq("external_id", externalId)
          .limit(1)
          .single();
        if (firstMatch) {
          return await getAllAliases(firstMatch.root_id);
        }
      }
      logger.warn("identity_resolve_lookup_failed", {
        action: "identity_resolve",
        message: error.message,
      });
      return null;
    }

    if (!match) return null;
    return await getAllAliases(match.root_id);
  } catch (err) {
    logger.error("identity_resolve_exception", {
      action: "identity_resolve",
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Get all aliases for a root user ID.
 */
export async function getAllAliases(rootId: string): Promise<ResolvedIdentity | null> {
  try {
    const { supabase } = await import("@/lib/supabase");

    const { data: aliases, error } = await supabase
      .from("identity_aliases")
      .select("*")
      .eq("root_id", rootId)
      .order("linked_at", { ascending: true });

    if (error) {
      logger.warn("identity_get_aliases_failed", {
        action: "identity_aliases",
        message: error.message,
      });
      return null;
    }

    return {
      rootId,
      aliases: (aliases ?? []).map(rowToAlias),
    };
  } catch (err) {
    logger.error("identity_get_aliases_exception", {
      action: "identity_aliases",
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Remove an identity link. Returns true if removed, false if not found.
 */
export async function unlinkIdentity(
  namespace: string,
  externalId: string
): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase");

    const { error, count } = await supabase
      .from("identity_aliases")
      .delete()
      .eq("namespace", namespace)
      .eq("external_id", externalId);

    if (error) {
      logger.error("identity_unlink_failed", {
        action: "identity_unlink",
        message: error.message,
      });
      return false;
    }

    if (count && count > 0) {
      logger.info("identity_unlinked", {
        action: "identity_unlink",
        namespace,
        externalId: truncateId(externalId),
      });
    }

    return true;
  } catch {
    return false;
  }
}

// ---- Cross-auth auto-linking ----

/**
 * Parse a teneo-auth JWT from the `X-Teneo-Auth` header and extract the userId.
 * Implemented in lib/teneo-jwt.ts (no external deps, testable standalone).
 */
export const parseTeneoAuthUserId = _parseTeneoAuthUserId;

/**
 * Best-effort: link a teneo-auth userId to the ArxMint rootId of a Nostr user.
 *
 * Resolves the rootId for the Nostr pubkey from the identity graph, then
 * links the teneo-auth identity to that root. Silent on failure — never throws.
 *
 * Call this after a successful checkout when both identities are detected.
 */
export async function autoLinkCheckoutIdentity(
  nostrPubkey: string,
  teneoUserId: string
): Promise<void> {
  try {
    // Resolve the ArxMint rootId for this Nostr pubkey
    const resolved = await resolveIdentity(nostrPubkey, "nostr");
    if (!resolved) {
      // User doesn't have an ArxMint root identity yet — skip silently
      logger.warn("identity_auto_link_no_root", {
        action: "checkout_auto_link",
        message: "Nostr pubkey has no ArxMint root identity — skipping teneo-auth link",
        nostrPubkey: truncateId(nostrPubkey),
      });
      return;
    }

    const result = await linkIdentity(resolved.rootId, {
      namespace: "teneo-auth",
      externalId: teneoUserId,
      linkedBy: "checkout-auto-link",
      metadata: { source: "checkout", nostrPubkey: truncateId(nostrPubkey) },
    });

    if ("error" in result) {
      // Conflict (already linked) or other non-fatal error — log and continue
      logger.warn("identity_auto_link_skipped", {
        action: "checkout_auto_link",
        reason: result.error,
        status: result.status,
      });
    } else {
      logger.info("identity_auto_linked", {
        action: "checkout_auto_link",
        rootId: truncateId(resolved.rootId),
        teneoUserId: truncateId(teneoUserId),
        nostrPubkey: truncateId(nostrPubkey),
        created: result.created,
      });
    }
  } catch (err) {
    // Always silent — checkout must never fail due to identity linking
    logger.warn("identity_auto_link_exception", {
      action: "checkout_auto_link",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---- Helpers ----

function rowToAlias(row: Record<string, unknown>): IdentityAlias {
  return {
    id: row.id as string,
    rootId: row.root_id as string,
    namespace: row.namespace as string,
    externalId: row.external_id as string,
    linkedBy: row.linked_by as string,
    metadata: row.metadata as Record<string, unknown> | null,
    linkedAt: new Date(row.linked_at as string),
  };
}

/** Truncate an ID for safe logging (first 8 chars + ...) */
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}
