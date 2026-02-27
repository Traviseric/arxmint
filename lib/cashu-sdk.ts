"use client";

// ============================================================
// ArxMint — Cashu SDK Wrapper
// Uses @cashu/cashu-ts v3.x — pure TypeScript, no WASM
// Lightweight fallback when Fedimint is overkill
//
// Security: Includes NUT-13 keyset ID validation to prevent
// collision attacks (see Jan 2026 vulnerability disclosure).
// ============================================================

import {
  Wallet,
  getEncodedTokenV4,
  getKeysetIdInt,
  verifyKeysetId,
  type Proof,
  type MintKeys,
  type MintQuoteResponse,
  type MeltQuoteResponse,
} from "@cashu/cashu-ts";

// ---- Keyset ID Validation (NUT-13 security) ----

interface RegistryEntry {
  mintUrl: string;
  keysetIdInt: string;
}

interface KeysetSnapshot {
  id: string;
  active: boolean;
}

interface KeysetValidationResult {
  valid: boolean;
  trustedKeysetIds: string[];
  warnings: string[];
  errors: string[];
}

interface RestoreValidationResult {
  proofs: Proof[];
  warnings: string[];
  rejected: number;
}

const MIN_KEYSET_ID_LEN = 8;
const KEYSET_ID_HEX_RE = /^[0-9a-f]+$/i;

/** Known keyset IDs across all connected mints — used for collision detection */
const keysetRegistryById = new Map<string, RegistryEntry>(); // keysetId -> entry
const keysetRegistryByInt = new Map<string, Set<string>>(); // keyset_id_int -> keysetIds

function normalizeMintUrl(mintUrl: string): string {
  return mintUrl.trim().replace(/\/+$/, "");
}

function isLikelyKeysetId(id: string): boolean {
  return id.length >= MIN_KEYSET_ID_LEN && KEYSET_ID_HEX_RE.test(id);
}

/** Derive the NUT-13 `keyset_id_int` value used by deterministic secret derivation. */
export function deriveKeysetIdInt(keysetId: string): bigint {
  return getKeysetIdInt(keysetId);
}

function getTrustedKeysetIdsForMint(mintUrl: string): Set<string> {
  const normalizedMint = normalizeMintUrl(mintUrl);
  const ids = new Set<string>();
  for (const [id, entry] of keysetRegistryById.entries()) {
    if (entry.mintUrl === normalizedMint) {
      ids.add(id);
    }
  }
  return ids;
}

/**
 * Register trusted keysets and detect namespace collisions across known mints.
 */
export function validateAndRegisterKeysets(
  mintUrl: string,
  keysetIds: string[]
): KeysetValidationResult {
  const normalizedMint = normalizeMintUrl(mintUrl);
  const warnings: string[] = [];
  const errors: string[] = [];
  const trustedKeysetIds = new Set<string>();

  for (const keysetId of keysetIds) {
    if (!isLikelyKeysetId(keysetId)) {
      errors.push(`Invalid keyset ID "${keysetId}" for mint ${normalizedMint}`);
      continue;
    }

    const existing = keysetRegistryById.get(keysetId);
    if (existing && existing.mintUrl !== normalizedMint) {
      errors.push(
        `Full keyset ID collision: "${keysetId}" already belongs to ${existing.mintUrl}`
      );
      continue;
    }

    const keysetIdInt = deriveKeysetIdInt(keysetId).toString();
    const collidingIds = keysetRegistryByInt.get(keysetIdInt);
    if (collidingIds) {
      for (const collidingId of collidingIds) {
        if (collidingId === keysetId) continue;
        const collidingMint = keysetRegistryById.get(collidingId)?.mintUrl;
        errors.push(
          `31-bit keyset_id_int collision (${keysetIdInt}): "${keysetId}" ` +
            `collides with "${collidingId}" from ${collidingMint || "unknown mint"}`
        );
      }
    }

    trustedKeysetIds.add(keysetId);
  }

  if (errors.length > 0) {
    return { valid: false, trustedKeysetIds: [], warnings, errors };
  }

  for (const keysetId of trustedKeysetIds) {
    const keysetIdInt = deriveKeysetIdInt(keysetId).toString();
    keysetRegistryById.set(keysetId, { mintUrl: normalizedMint, keysetIdInt });

    const bucket = keysetRegistryByInt.get(keysetIdInt) || new Set<string>();
    bucket.add(keysetId);
    keysetRegistryByInt.set(keysetIdInt, bucket);
  }

  return {
    valid: true,
    trustedKeysetIds: [...trustedKeysetIds],
    warnings,
    errors: [],
  };
}

/**
 * Validate keysets from mint metadata + pubkeys before trusting a mint.
 */
export function validateMintKeysetSnapshot(
  mintUrl: string,
  keysets: KeysetSnapshot[],
  mintKeys: MintKeys[],
  verifyFn: (keys: MintKeys) => boolean = verifyKeysetId
): KeysetValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const verifiedIds = new Set<string>();
  const normalizedMint = normalizeMintUrl(mintUrl);

  for (const mk of mintKeys) {
    if (!isLikelyKeysetId(mk.id)) {
      errors.push(`Mint returned malformed keyset ID "${mk.id}" in /keys response`);
      continue;
    }
    if (!verifyFn(mk)) {
      errors.push(
        `Keyset ID verification failed for "${mk.id}" from mint ${normalizedMint}`
      );
      continue;
    }
    verifiedIds.add(mk.id);
  }

  for (const ks of keysets) {
    if (!isLikelyKeysetId(ks.id)) {
      errors.push(`Mint metadata contains malformed keyset ID "${ks.id}"`);
      continue;
    }
    if (ks.active && !verifiedIds.has(ks.id)) {
      errors.push(
        `Active keyset "${ks.id}" has no verifiable mint pubkeys. Refusing mint.`
      );
    }
  }

  if (verifiedIds.size === 0) {
    errors.push(`Mint ${normalizedMint} exposed no verifiable keysets`);
  }

  if (errors.length > 0) {
    return { valid: false, trustedKeysetIds: [], warnings, errors };
  }

  const registry = validateAndRegisterKeysets(normalizedMint, [...verifiedIds]);
  return {
    valid: registry.valid,
    trustedKeysetIds: registry.trustedKeysetIds,
    warnings: [...warnings, ...registry.warnings],
    errors: [...errors, ...registry.errors],
  };
}

/**
 * Validate proof payload restored from storage before trusting it.
 */
export function validateRestoredProofs(
  mintUrl: string,
  maybeProofs: unknown,
  trustedKeysetIds: Set<string>
): RestoreValidationResult {
  if (!Array.isArray(maybeProofs)) {
    return {
      proofs: [],
      warnings: ["Stored proofs payload is not an array. Ignoring restore payload."],
      rejected: 0,
    };
  }

  const warnings: string[] = [];
  const proofs: Proof[] = [];
  let rejected = 0;
  const normalizedMint = normalizeMintUrl(mintUrl);
  const seenSecrets = new Set<string>();

  for (const raw of maybeProofs) {
    const candidate = raw as Partial<Proof>;
    const malformed =
      !candidate ||
      typeof candidate.id !== "string" ||
      !isLikelyKeysetId(candidate.id) ||
      typeof candidate.secret !== "string" ||
      candidate.secret.length === 0 ||
      typeof candidate.C !== "string" ||
      candidate.C.length === 0 ||
      typeof candidate.amount !== "number" ||
      !Number.isFinite(candidate.amount) ||
      candidate.amount <= 0;

    if (malformed) {
      rejected += 1;
      warnings.push("Rejected malformed proof entry from restore payload.");
      continue;
    }

    const proofId = candidate.id as string;
    const proofSecret = candidate.secret as string;

    if (seenSecrets.has(proofSecret)) {
      rejected += 1;
      warnings.push("Rejected duplicate proof secret from restore payload.");
      continue;
    }

    if (trustedKeysetIds.size > 0 && !trustedKeysetIds.has(proofId)) {
      rejected += 1;
      warnings.push(
        `Rejected proof with unknown keyset ID "${proofId}" for mint ${normalizedMint}`
      );
      continue;
    }

    const registered = keysetRegistryById.get(proofId);
    if (registered && registered.mintUrl !== normalizedMint) {
      rejected += 1;
      warnings.push(
        `Rejected proof with keyset ID "${proofId}" owned by ${registered.mintUrl}`
      );
      continue;
    }

    seenSecrets.add(proofSecret);
    proofs.push(candidate as Proof);
  }

  return { proofs, warnings, rejected };
}

/** Test-only helpers for security validation logic. */
export const __cashuSecurityTestUtils = {
  resetRegistry(): void {
    keysetRegistryById.clear();
    keysetRegistryByInt.clear();
  },
  getRegistrySnapshot(): { byId: Record<string, RegistryEntry>; byInt: Record<string, string[]> } {
    const byId: Record<string, RegistryEntry> = {};
    for (const [key, value] of keysetRegistryById.entries()) {
      byId[key] = { ...value };
    }

    const byInt: Record<string, string[]> = {};
    for (const [key, value] of keysetRegistryByInt.entries()) {
      byInt[key] = [...value];
    }

    return { byId, byInt };
  },
};

export class SovereignCashuClient {
  private wallet: Wallet | null = null;
  private _mintUrl: string;
  private _proofs: Proof[] = [];
  private _unit: string;
  private _keysetWarnings: string[] = [];
  private _trustedKeysetIds = new Set<string>();

  constructor(mintUrl: string, unit: string = "sat") {
    this._mintUrl = mintUrl;
    this._unit = unit;
  }

  get mintUrl(): string {
    return this._mintUrl;
  }

  /** Any keyset validation warnings from connect() */
  get keysetWarnings(): string[] {
    return [...this._keysetWarnings];
  }

  /** Connect to the Cashu mint, load keysets, and validate keyset IDs */
  async connect(): Promise<void> {
    this.wallet = new Wallet(this._mintUrl, { unit: this._unit });
    await this.wallet.loadMint();

    const keysets = this.wallet.keyChain.getKeysets();
    const mintKeys = this.wallet.keyChain.getAllKeys();
    const snapshot = keysets.map((ks) => ({
      id: ks.id,
      active: Boolean(ks.isActive),
    }));

    const validation = validateMintKeysetSnapshot(
      this._mintUrl,
      snapshot,
      mintKeys
    );

    this._keysetWarnings = validation.warnings;
    if (!validation.valid) {
      this.wallet = null;
      this._trustedKeysetIds.clear();
      throw new Error(
        `Mint keyset validation failed: ${validation.errors.join("; ")}`
      );
    }

    this._trustedKeysetIds = new Set(validation.trustedKeysetIds);

    if (validation.warnings.length > 0) {
      console.warn(
        `[ArxMint] Cashu keyset warnings for ${this._mintUrl}:`,
        validation.warnings
      );
    }
  }

  /** Get stored proofs (ecash tokens) */
  get proofs(): Proof[] {
    return [...this._proofs];
  }

  /** Get total balance in sats */
  get balance(): number {
    return this._proofs.reduce((sum, p) => sum + p.amount, 0);
  }

  /** Load proofs from external storage (localStorage, DB, etc.) */
  loadProofs(proofs: Proof[]): void {
    this._proofs = [...proofs];
  }

  // ----- Minting (Receive sats via Lightning → ecash) -----

  /** Create a mint quote — returns a Lightning invoice to pay */
  async createMintQuote(amountSats: number): Promise<MintQuoteResponse> {
    this.requireConnected();
    return await this.wallet!.createMintQuoteBolt11(amountSats);
  }

  /** Check if a mint quote has been paid */
  async checkMintQuote(quoteId: string): Promise<MintQuoteResponse> {
    this.requireConnected();
    return await this.wallet!.checkMintQuoteBolt11(quoteId);
  }

  /** Mint ecash proofs after the invoice has been paid */
  async mintProofs(
    amountSats: number,
    quoteId: string
  ): Promise<Proof[]> {
    this.requireConnected();
    const proofs = await this.wallet!.mintProofs(amountSats, quoteId);
    this._proofs.push(...proofs);
    this.persistProofs();
    return proofs;
  }

  // ----- Melting (Send sats via Lightning — pay an invoice with ecash) -----

  /** Create a melt quote for a Lightning invoice */
  async createMeltQuote(bolt11: string): Promise<MeltQuoteResponse> {
    this.requireConnected();
    return await this.wallet!.createMeltQuoteBolt11(bolt11);
  }

  /** Pay a Lightning invoice by melting ecash proofs */
  async meltProofs(
    meltQuote: MeltQuoteResponse
  ): Promise<{ paid: boolean; change: Proof[] }> {
    this.requireConnected();
    const amountNeeded = meltQuote.amount + meltQuote.fee_reserve;

    const { keep, send } = await this.wallet!.send(amountNeeded, this._proofs, {
      includeFees: true,
    });

    const result = await this.wallet!.meltProofs(meltQuote, send);

    // Update stored proofs: keep the kept ones + any change from melt
    this._proofs = [...keep, ...(result.change || [])];
    this.persistProofs();

    return {
      paid: !!result.quote.payment_preimage,
      change: result.change || [],
    };
  }

  // ----- Peer-to-peer ecash transfers -----

  /** Create a sendable ecash token string */
  async sendEcash(amountSats: number): Promise<{ token: string; kept: Proof[] }> {
    this.requireConnected();
    const { keep, send } = await this.wallet!.send(amountSats, this._proofs);

    const token = getEncodedTokenV4({
      mint: this._mintUrl,
      proofs: send,
    });

    this._proofs = [...keep];
    this.persistProofs();

    return { token, kept: keep };
  }

  /** Receive an ecash token string (validates proofs before accepting) */
  async receiveEcash(token: string): Promise<Proof[]> {
    this.requireConnected();
    const received = await this.wallet!.receive(token);
    const normalizedMint = normalizeMintUrl(this._mintUrl);

    // Validate received proofs have keyset IDs we trust
    for (const proof of received) {
      if (
        this._trustedKeysetIds.size > 0 &&
        !this._trustedKeysetIds.has(proof.id)
      ) {
        throw new Error(
          `Received proof with unknown keyset ID "${proof.id}" for mint ${normalizedMint}. ` +
            `Refusing to accept untrusted restore/swap output.`
        );
      }

      const knownMint = keysetRegistryById.get(proof.id)?.mintUrl;
      if (knownMint && knownMint !== normalizedMint) {
        throw new Error(
          `Received proof with keyset ID "${proof.id}" belongs to a different mint (${knownMint}). ` +
            `Refusing to accept — possible cross-mint token injection.`
        );
      }
    }

    this._proofs.push(...received);
    this.persistProofs();
    return received;
  }

  // ----- Proof management -----

  /** Check which proofs are still valid (unspent) */
  async checkProofs(): Promise<{
    valid: Proof[];
    spent: Proof[];
  }> {
    this.requireConnected();
    const states = await this.wallet!.checkProofsStates(this._proofs);

    const valid: Proof[] = [];
    const spent: Proof[] = [];

    states.forEach((state: any, i: number) => {
      if (state.state === "UNSPENT") {
        valid.push(this._proofs[i]);
      } else {
        spent.push(this._proofs[i]);
      }
    });

    // Remove spent proofs
    this._proofs = valid;
    this.persistProofs();

    return { valid, spent };
  }

  // ----- Persistence -----

  private persistProofs(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `arxmint_cashu_proofs_${this._mintUrl}`,
        JSON.stringify(this._proofs)
      );
    }
  }

  /** Restore proofs from localStorage */
  restoreProofs(): void {
    if (typeof window === "undefined") return;

    const storageKey = `arxmint_cashu_proofs_${this._mintUrl}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      this._proofs = [];
      console.warn(
        `[ArxMint] Ignoring invalid Cashu restore payload for ${this._mintUrl}: invalid JSON`
      );
      return;
    }

    const trustedKeysetIds =
      this._trustedKeysetIds.size > 0
        ? this._trustedKeysetIds
        : getTrustedKeysetIdsForMint(this._mintUrl);

    const validation = validateRestoredProofs(
      this._mintUrl,
      parsed,
      trustedKeysetIds
    );

    this._proofs = validation.proofs;

    if (validation.warnings.length > 0) {
      console.warn(
        `[ArxMint] Cashu restore filtered ${validation.rejected} unsafe proof(s) for ${this._mintUrl}:`,
        validation.warnings
      );
    }
  }

  private requireConnected(): void {
    if (!this.wallet) {
      throw new Error("Not connected to mint. Call connect() first.");
    }
  }
}

/** Create a Cashu client for a given mint URL */
export function createCashuClient(
  mintUrl: string = "http://localhost:3338"
): SovereignCashuClient {
  return new SovereignCashuClient(mintUrl);
}

// ---- Agent Wallet Pattern (Phase 1.6) ----

/** Configuration for ephemeral agent wallets */
export interface AgentWalletConfig {
  /** Mint URL for this agent wallet */
  mintUrl: string;
  /** Time-to-live in seconds (auto-expire after this) */
  ttlSeconds: number;
  /** Maximum balance this wallet can hold (sats) */
  maxBalanceSats: number;
  /** Community/scope this wallet is restricted to */
  scope?: string;
  /** Unit (default: "sat") */
  unit?: string;
}

/**
 * Ephemeral Cashu wallet for agent processes.
 * - In-memory only — no localStorage persistence
 * - Auto-expires after configured TTL
 * - Balance limits enforced
 * - Clean teardown on disconnect
 *
 * Source: Doc 1 (ecash as bearer value), Doc 6 (transaction independence)
 */
export class AgentCashuWallet {
  private wallet: Wallet | null = null;
  private _proofs: Proof[] = [];
  private _config: AgentWalletConfig;
  private _createdAt: number;
  private _expireTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;

  constructor(config: AgentWalletConfig) {
    this._config = config;
    this._createdAt = Date.now();

    // Set auto-expire timer
    this._expireTimer = setTimeout(() => {
      this.destroy();
    }, config.ttlSeconds * 1000);
  }

  get isExpired(): boolean {
    return this._destroyed || Date.now() > this._createdAt + this._config.ttlSeconds * 1000;
  }

  get balance(): number {
    return this._proofs.reduce((sum, p) => sum + p.amount, 0);
  }

  get scope(): string | undefined {
    return this._config.scope;
  }

  get timeRemaining(): number {
    const remaining = (this._createdAt + this._config.ttlSeconds * 1000) - Date.now();
    return Math.max(0, remaining);
  }

  /** Connect to the mint (in-memory only) */
  async connect(): Promise<void> {
    this.requireAlive();
    this.wallet = new Wallet(this._config.mintUrl, {
      unit: this._config.unit || "sat",
    });
    await this.wallet.loadMint();
  }

  /** Receive an ecash token (with balance limit enforcement) */
  async receive(token: string): Promise<Proof[]> {
    this.requireAlive();
    this.requireConnected();

    const proofs = await this.wallet!.receive(token);
    const incoming = proofs.reduce((s, p) => s + p.amount, 0);

    if (this.balance + incoming > this._config.maxBalanceSats) {
      throw new Error(
        `Agent wallet balance limit exceeded: ${this.balance + incoming} > ${this._config.maxBalanceSats} sats`
      );
    }

    this._proofs.push(...proofs);
    return proofs;
  }

  /** Send ecash (creates a token) */
  async send(amountSats: number): Promise<string> {
    this.requireAlive();
    this.requireConnected();

    const { keep, send } = await this.wallet!.send(amountSats, this._proofs);
    this._proofs = [...keep];

    return getEncodedTokenV4({
      mint: this._config.mintUrl,
      proofs: send,
    });
  }

  /** Pay a Lightning invoice via melt */
  async payInvoice(bolt11: string): Promise<boolean> {
    this.requireAlive();
    this.requireConnected();

    const quote = await this.wallet!.createMeltQuoteBolt11(bolt11);
    const needed = quote.amount + quote.fee_reserve;
    const { keep, send } = await this.wallet!.send(needed, this._proofs, {
      includeFees: true,
    });
    const result = await this.wallet!.meltProofs(quote, send);
    this._proofs = [...keep, ...(result.change || [])];
    return !!result.quote.payment_preimage;
  }

  /** Destroy the wallet — clear all proofs from memory */
  destroy(): void {
    if (this._expireTimer) {
      clearTimeout(this._expireTimer);
      this._expireTimer = null;
    }
    this._proofs = [];
    this.wallet = null;
    this._destroyed = true;
  }

  private requireAlive(): void {
    if (this.isExpired) {
      throw new Error("Agent wallet has expired. Create a new one.");
    }
  }

  private requireConnected(): void {
    if (!this.wallet) {
      throw new Error("Agent wallet not connected. Call connect() first.");
    }
  }
}

/** Create an ephemeral agent wallet */
export function createAgentWallet(config: AgentWalletCo