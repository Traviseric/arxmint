// ============================================================
// ArxMint - Session User + Community Ownership Helpers
// ============================================================

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthPubkey } from "@/lib/auth-middleware";

export class SessionUserError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "USER_LOOKUP_FAILED"
  ) {
    super(message);
    this.name = "SessionUserError";
  }
}

/**
 * Resolve the current session user from the signed auth cookie.
 * Upserts a user record by nostr pubkey if missing.
 */
export async function requireSessionUserId(
  request: NextRequest
): Promise<string> {
  const pubkey = getAuthPubkey(request);
  if (!pubkey) {
    throw new SessionUserError("Unauthorized", "UNAUTHENTICATED");
  }

  try {
    const user = await db.user.upsert({
      where: { nostrPubkey: pubkey },
      update: {},
      create: { nostrPubkey: pubkey },
      select: { id: true },
    });
    return user.id;
  } catch (error: unknown) {
    throw new SessionUserError(
      error instanceof Error ? error.message : "Failed to resolve session user",
      "USER_LOOKUP_FAILED"
    );
  }
}

/** Check whether a community is owned by a specific user. */
export async function isCommunityOwnedByUser(
  communityId: string,
  userId: string
): Promise<boolean> {
  const community = await db.community.findUnique({
    where: { id: communityId },
    select: { userId: true },
  });
  if (!community?.userId) return false;
  return community.userId === userId;
}
