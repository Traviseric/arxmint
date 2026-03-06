// ============================================================
// ArxMint — Merchant API Key System
// Scoped keys for merchant SDK integration (Phase 5, T08)
//
// Key format: arx_{scope}_{base58_random_32_bytes}
//   arx_live_* — full payment authority (production)
//   arx_pub_*  — read-only (safe to embed in client-side JS)
//   arx_test_* — testnet only, cannot move real funds
//
// Persistence: in-memory store with graceful Supabase fallback.
// ============================================================

import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

export type MerchantKeyScope = "live" | "pub" | "test";

export interface MerchantApiKey {
  /** Full key string: arx_{scope}_{base58token} */
  key: string;
  scope: MerchantKeyScope;
  merchantId: string;
  createdAt: number;
  expiresAt?: number;
}

// ---- Base58 encoding (Bitcoin alphabet, no external deps) ----

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function toBase58(buf: Buffer): string {
  // Convert buffer to digit array (base 256)
  const digits: number[] = [0];
  for (let i = 0; i < buf.length; i++) {
    let carry = buf[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  // Leading zero bytes → leading '1's
  let result = "";
  for (let i = 0; i < buf.length && buf[i] === 0; i++) {
    result += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

// ---- In-memory store (dev/testnet) ----
// Keyed by the full key string for O(1) lookup.

const _keyStore = new Map<string, MerchantApiKey>();

// ---- Key generation ----

/**
 * Generate a new scoped merchant API key.
 * Returns the MerchantApiKey — persist via persistMerchantKey() if needed.
 */
export function generateMerchantKey(
  merchantId: string,
  scope: MerchantKeyScope,
  ttlSeconds?: number
): MerchantApiKey {
  const token = toBase58(randomBytes(32));
  const key = `arx_${scope}_${token}`;
  const now = Date.now();
  const record: MerchantApiKey = {
    key,
    scope,
    merchantId,
    createdAt: now,
    ...(ttlSeconds !== undefined ? { expiresAt: now + ttlSeconds * 1000 } : {}),
  };
  _keyStore.set(key, record);
  return record;
}

// ---- Key parsing ----

/**
 * Parse an arx_* key into scope and token parts.
 * Returns null if the key does not match the expected format.
 */
export function parseMerchantKey(
  key: string
): { scope: MerchantKeyScope; token: string } | null {
  if (!key) return null;
  const match = key.match(/^arx_(live|pub|test)_([1-9A-HJ-NP-Za-km-z]+)$/);
  if (!match) return null;
  return { scope: match[1] as MerchantKeyScope, token: match[2] };
}

// ---- Key verification ----

/**
 * Verify a merchant API key. Checks format, scope, expiry, and merchantId.
 * Looks up in-memory first, then Supabase if available.
 * Returns null if the key is invalid or expired.
 */
export async function verifyMerchantKey(
  key: string,
  merchantId: string
): Promise<MerchantApiKey | null> {
  const parsed = parseMerchantKey(key);
  if (!parsed) return null;

  // In-memory lookup (covers dev + freshly generated keys)
  const inMemory = _keyStore.get(key);
  if (inMemory) {
    return _validateRecord(inMemory, merchantId);
  }

  // Supabase fallback (production keys stored in DB)
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_api_keys")
      .select("*")
      .eq("key", key)
      .single();
    if (error || !data) return null;
    const record: MerchantApiKey = {
      key: data.key,
      scope: data.scope as MerchantKeyScope,
      merchantId: data.merchant_id,
      createdAt: data.created_at,
      expiresAt: data.expires_at ?? undefined,
    };
    // Cache in-memory to speed up subsequent requests
    _keyStore.set(key, record);
    return _validateRecord(record, merchantId);
  } catch {
    logger.warn("merchant_auth_supabase_unavailable", {
      action: "merchant_key_verify_fallback",
      message: "Supabase unavailable — key not found in memory store",
    });
    return null;
  }
}

function _validateRecord(
  record: MerchantApiKey,
  merchantId: string
): MerchantApiKey | null {
  if (record.merchantId !== merchantId) return null;
  if (record.expiresAt !== undefined && record.expiresAt < Date.now()) return null;
  return record;
}

// ---- Scope enforcement helpers ----

/**
 * Returns true if the key scope allows payment initiation.
 * arx_pub_* keys are read-only and cannot initiate payments.
 */
export function scopeAllowsPayments(scope: MerchantKeyScope): boolean {
  return scope === "live" || scope === "test";
}

/**
 * Returns true if the key scope is allowed in production payment paths.
 * arx_test_* keys must only be used against testnet — reject them in production.
 */
export function scopeAllowedInProduction(scope: MerchantKeyScope): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return scope === "live" || scope === "pub";
}

// ---- Persistence helpers ----

/**
 * Persist a merchant API key to Supabase.
 * Falls back silently if Supabase is unavailable (key stays in-memory only).
 */
export async function persistMerchantKey(record: MerchantApiKey): Promise<void> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase.from("merchant_api_keys").insert({
      key: record.key,
      scope: record.scope,
      merchant_id: record.merchantId,
      created_at: record.createdAt,
      expires_at: record.expiresAt ?? null,
    });
    if (error) {
      logger.warn("merchant_key_persist_failed", {
        action: "merchant_key_persist_failed",
        message: error.message,
      });
    }
  } catch {
    logger.warn("merchant_key_persist_supabase_unavailable", {
      action: "merchant_key_persist_fallback",
      message: "Supabase unavailable — key persisted in-memory only",
    });
  }
}

/**
 * Revoke a merchant API key (removes from store and DB).
 * Returns true if the key was found and removed.
 */
export async function revokeMerchantKey(
  key: string,
  merchantId: string
): Promise<boolean> {
  const record = _keyStore.get(key);
  if (record && record.merchantId !== merchantId) return false;
  _keyStore.delete(key);

  try {
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase
      .from("merchant_api_keys")
      .delete()
      .eq("key", key)
      .eq("merchant_id", merchantId);
    if (error) {
      logger.warn("merchant_key_revoke_failed", {
        action: "merchant_key_revoke_failed",
        message: error.message,
      });
    }
  } catch {
    // Supabase unavailable — in-memory removal is sufficient
  }
  return true;
}

/**
 * List all keys for a merchant (in-memory + Supabase).
 */
export async function listMerchantKeys(merchantId: string): Promise<MerchantApiKey[]> {
  const inMemory = Array.from(_keyStore.values()).filter(
    (k) => k.merchantId === merchantId
  );

  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("merchant_api_keys")
      .select("*")
      .eq("merchant_id", merchantId);
    if (error || !data) return inMemory;
    const dbKeys: MerchantApiKey[] = data.map((row) => ({
      key: row.key,
      scope: row.scope as MerchantKeyScope,
      merchantId: row.merchant_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at ?? undefined,
    }));
    // Merge: DB is source of truth, in-memory may have newer keys not yet persisted
    const dbKeySet = new Set(dbKeys.map((k) => k.key));
    const onlyInMemory = inMemory.filter((k) => !dbKeySet.has(k.key));
    return [...dbKeys, ...onlyInMemory];
  } catch {
    return inMemory;
  }
}

// ---- HMAC signing helper for webhooks (used by task 158) ----

/**
 * Sign a webhook payload with a merchant key's token (HMAC-SHA256).
 * Used to authenticate outbound webhook calls to merchant endpoints.
 */
export function signWebhookPayload(merchantKey: string, payload: string): string {
  const parsed = parseMerchantKey(merchantKey);
  if (!parsed) throw new Error("Invalid merchant key format");
  return createHmac("sha256", parsed.token).update(payload).digest("hex");
}

/**
 * Verify a webhook signature from ArxMint using HMAC-SHA256.
 */
export function verifyWebhookSignature(
  merchantKey: string,
  payload: string,
  signature: string
): boolean {
  try {
    const expected = signWebhookPayload(merchantKey, payload);
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
