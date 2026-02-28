// ============================================================
// ArxMint — Auth API: POST /api/auth
// Verifies a NIP-98 signed event, creates an httpOnly session cookie
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyEvent } from "nostr-tools";
import { createSession } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limiter";

const NIP98_KIND = 27235;
const MAX_AGE_SEC = 60; // event must be fresh within 60 seconds
const SESSION_COOKIE = "arxmint_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(`auth:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { pubkey, signedEvent } = body;

    if (!pubkey || typeof pubkey !== "string") {
      return NextResponse.json({ error: "Missing pubkey" }, { status: 400 });
    }
    if (!signedEvent || typeof signedEvent !== "object") {
      return NextResponse.json({ error: "Missing signedEvent" }, { status: 400 });
    }

    // Validate NIP-98 event kind
    if (signedEvent.kind !== NIP98_KIND) {
      return NextResponse.json(
        { error: `Invalid event kind — expected ${NIP98_KIND} (NIP-98)` },
        { status: 400 }
      );
    }

    // Check timestamp freshness
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - signedEvent.created_at) > MAX_AGE_SEC) {
      return NextResponse.json({ error: "Event expired" }, { status: 400 });
    }

    // Verify pubkey matches the signed event
    if (signedEvent.pubkey !== pubkey) {
      return NextResponse.json({ error: "Pubkey mismatch" }, { status: 401 });
    }

    // Require NIP-98 u and method tags
    const urlTag = (signedEvent.tags as string[][]).find((t) => t[0] === "u");
    const methodTag = (signedEvent.tags as string[][]).find((t) => t[0] === "method");
    if (!urlTag || !methodTag) {
      return NextResponse.json(
        { error: "Missing required NIP-98 tags (u, method)" },
        { status: 400 }
      );
    }

    // Validate tag VALUES against the actual request (prevents cross-endpoint replay)
    const expectedUrl = `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/auth`;
    if (urlTag[1] !== expectedUrl) {
      return NextResponse.json(
        { error: "NIP-98 URL mismatch — token not issued for this endpoint" },
        { status: 401 }
      );
    }
    if (methodTag[1] !== "POST") {
      return NextResponse.json(
        { error: "NIP-98 method mismatch — expected POST" },
        { status: 401 }
      );
    }

    // Cryptographic signature verification via nostr-tools
    const valid = verifyEvent(signedEvent);
    if (!valid) {
      return NextResponse.json({ error: "Invalid event signature" }, { status: 401 });
    }

    // Create server-side session
    const token = createSession(pubkey);

    const response = NextResponse.json({ success: true, pubkey });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[ArxMint] POST /api/auth error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
