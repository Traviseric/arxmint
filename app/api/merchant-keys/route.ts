// ============================================================
// ArxMint — Merchant API Keys CRUD
// Requires session auth (Nostr NIP-98 session cookie) to manage.
//
// GET    /api/merchant-keys?merchantId=...  — list keys
// POST   /api/merchant-keys                 — create key
// DELETE /api/merchant-keys?key=...        — revoke key
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getCallerFromRequest } from "@/lib/auth-middleware";
import {
  generateMerchantKey,
  persistMerchantKey,
  listMerchantKeys,
  revokeMerchantKey,
  parseMerchantKey,
  type MerchantKeyScope,
} from "@/lib/merchant-auth";

const VALID_SCOPES: MerchantKeyScope[] = ["live", "pub", "test"];

/** GET /api/merchant-keys?merchantId=... — list keys for a merchant */
export async function GET(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const merchantId = searchParams.get("merchantId");
  if (!merchantId) {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }

  const keys = await listMerchantKeys(merchantId);
  // Return keys with token obscured (show prefix only) for security
  return NextResponse.json({
    merchantId,
    keys: keys.map((k) => ({
      keyPreview: k.key.slice(0, 16) + "...",
      scope: k.scope,
      merchantId: k.merchantId,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
    })),
    count: keys.length,
  });
}

/** POST /api/merchant-keys — create a new merchant API key */
export async function POST(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { merchantId?: string; scope?: string; ttlSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { merchantId, scope, ttlSeconds } = body;

  if (!merchantId || typeof merchantId !== "string") {
    return NextResponse.json({ error: "merchantId is required" }, { status: 400 });
  }
  if (!scope || !VALID_SCOPES.includes(scope as MerchantKeyScope)) {
    return NextResponse.json(
      { error: `scope must be one of: ${VALID_SCOPES.join(", ")}` },
      { status: 400 }
    );
  }

  const record = generateMerchantKey(
    merchantId,
    scope as MerchantKeyScope,
    typeof ttlSeconds === "number" ? ttlSeconds : undefined
  );

  // Persist to DB (best-effort)
  await persistMerchantKey(record);

  return NextResponse.json(
    {
      key: record.key, // Full key returned only on creation — store it securely
      scope: record.scope,
      merchantId: record.merchantId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      warning:
        record.scope === "pub"
          ? "arx_pub_* keys are read-only. Safe to embed in client JS but cannot initiate payments."
          : record.scope === "test"
            ? "arx_test_* keys are testnet-only and will be rejected in production payment paths."
            : "arx_live_* keys have full payment authority. Treat like a password — never expose client-side.",
    },
    { status: 201 }
  );
}

/** DELETE /api/merchant-keys?key=...&merchantId=... — revoke a key */
export async function DELETE(request: NextRequest) {
  const caller = getCallerFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const merchantId = searchParams.get("merchantId");

  if (!key || !merchantId) {
    return NextResponse.json(
      { error: "key and merchantId are required" },
      { status: 400 }
    );
  }

  const parsed = parseMerchantKey(key);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  const revoked = await revokeMerchantKey(key, merchantId);
  if (!revoked) {
    return NextResponse.json(
      { error: "Key not found or merchantId mismatch" },
      { status: 404 }
    );
  }

  return NextResponse.json({ revoked: true, key: key.slice(0, 16) + "..." });
}
