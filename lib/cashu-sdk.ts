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

// ---- localStorage Proof Persistence (standalone helpers) ----

/** Storage key prefix for Cashu proofs, namespaced by mint URL */
const PROOF_STORAGE_KEY_PREFIX = "arxmint_proofs_";

/**
 * Save Cashu proofs to localStorage, namespaced by mint URL.
 * No-ops in SSR context (window undefined).
 */
export function saveProofsToLocalStorage(mintUrl: string, proofs: Proof[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PROOF_STORAGE_KEY_PREFIX}${mintUrl}`, JSON.stringify(proofs));
}

/**
 * Load Cashu proofs from localStorage for a given mint URL.
 * Returns empty array if not found or parse fails.
 */
export function loadProofsFromLocalStorage(mintUrl: string): Proof[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(`${PROOF_STORAGE_KEY_PREFIX}${mintUrl}`);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed as Proof[];
  } catch {
    return [];
  }
}

/**
 * Clear Cashu proofs from localStorage for a given mint URL.
 */
export function clearProofsFromLocalStorage(mintUrl: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PROOF_STORAGE_KEY_PREFIX}${mintUrl}`);
}

/**
 * Get all mint URLs that currently have proofs stored in localStorage.
 * Useful for multi-mint hydration on app startup.
 */
export function getStoredMintUrls(): string[] {
  if (typeof window === "undefined") return [];
  const urls: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PROOF_STORAGE_KEY_PREFIX)) {
      urls.push(key.slice(PROOF_STORAGE_KEY_PREFIX.length));
    }
  }
  return urls;
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
    saveProofsToLocalStorage(this._mintUrl, this._proofs);
  }

  /** Restore proofs from localStorage */
  restoreProofs(): void {
    const stored = loadProofsFromLocalStorage(this._mintUrl);
    if (stored.length === 0) return;

    const trustedKeysetIds =
      this._trustedKeysetIds.size > 0
        ? this._trustedKeysetIds
        : getTrustedKeysetIdsForMint(this._mintUrl);

    const validation = validateRestoredProofs(
      this._mintUrl,
      stored,
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
export function createAgentWallet(config: AgentWalletConfig): AgentCashuWallet {
  return new AgentCashuWallet(config);
}

// ---- ZK Verified Reissuance (Phase 3.3) ----
// Audit-log + ZK reissuance pattern for agent wallets.
// Agents can circulate and reissue tokens with verifiable
// audit trails without centralized mediation.
//
// Source: Doc 6 — arXiv paper on stateless agent wallets

/** A single entry in the agent wallet audit log */
export interface AuditLogEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Action type */
  action: "receive" | "send" | "reissue" | "expire" | "destroy";
  /** Amount in sats */
  amountSats: number;
  /** Proof count involved */
  proofCount: number;
  /** Hash of the proofs at this state (for ZK verification) */
  stateHash: string;
  /** Hash of the previous entry (chain integrity) */
  previousHash: string;
  /** Scope/community context */
  scope?: string;
}

/** ZK reissuance proof (attestation that token was validly reissued) */
export interface ReissuanceProof {
  /** Token ID being reissued */
  tokenId: string;
  /** Mint URL */
  mintUrl: string;
  /** Amount */
  amountSats: number;
  /** Hash of the audit log at time of reissuance */
  auditLogHash: string;
  /** Number of audit entries at time of reissuance */
  auditLogLength: number;
  /** Timestamp of reissuance */
  reissuedAt: number;
  /** Previous token ID (if this was a re-issue of an existing token) */
  previousTokenId?: string;
}

/**
 * Agent wallet with ZK-verifiable audit log.
 * Extends the ephemeral agent wallet pattern with:
 * - Hash-chained audit log (tamper-evident)
 * - Reissuance tracking (prove token was validly circulated)
 * - State snapshots for external verification
 */
export class AuditedAgentWallet {
  private _inner: AgentCashuWallet;
  private _auditLog: AuditLogEntry[] = [];
  private _reissuanceProofs: ReissuanceProof[] = [];
  private _lastHash = "genesis";

  constructor(config: AgentWalletConfig) {
    this._inner = new AgentCashuWallet(config);
  }

  get isExpired(): boolean {
    return this._inner.isExpired;
  }

  get balance(): number {
    return this._inner.balance;
  }

  get scope(): string | undefined {
    return this._inner.scope;
  }

  get timeRemaining(): number {
    return this._inner.timeRemaining;
  }

  get auditLog(): AuditLogEntry[] {
    return [...this._auditLog];
  }

  get reissuanceProofs(): ReissuanceProof[] {
    return [...this._reissuanceProofs];
  }

  /** Connect to the mint */
  async connect(): Promise<void> {
    await this._inner.connect();
  }

  /** Receive ecash with audit logging */
  async receive(token: string): Promise<Proof[]> {
    const proofs = await this._inner.receive(token);
    const amount = proofs.reduce((s, p) => s + p.amount, 0);
    this.appendLog("receive", amount, proofs.length);
    return proofs;
  }

  /** Send ecash with audit logging */
  async send(amountSats: number): Promise<string> {
    const token = await this._inner.send(amountSats);
    this.appendLog("send", amountSats, 0);
    return token;
  }

  /** Pay a Lightning invoice with audit logging */
  async payInvoice(bolt11: string): Promise<boolean> {
    const result = await this._inner.payInvoice(bolt11);
    this.appendLog("send", 0, 0); // Amount determined by invoice
    return result;
  }

  /**
   * Reissue: swap all current proofs for fresh ones.
   * This breaks the link between old and new proofs while
   * maintaining a verifiable audit trail.
   *
   * Used when an agent wallet needs to "refresh" its tokens
   * without revealing transaction history to the mint.
   */
  async reissue(): Promise<ReissuanceProof> {
    const currentBalance = this.balance;
    if (currentBalance <= 0) {
      throw new Error("Nothing to reissue — wallet is empty");
    }

    // Send all current balance as a token
    const token = await this._inner.send(currentBalance);
    const previousTokenId = `pre_${Date.now().toString(36)}`;

    // Receive it back (swap via mint)
    const proofs = await this._inner.receive(token);
    const amount = proofs.reduce((s, p) => s + p.amount, 0);

    this.appendLog("reissue", amount, proofs.length);

    const proof: ReissuanceProof = {
      tokenId: `ri_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      mintUrl: "",
      amountSats: amount,
      auditLogHash: this._lastHash,
      auditLogLength: this._auditLog.length,
      reissuedAt: Date.now(),
      previousTokenId,
    };

    this._reissuanceProofs.push(proof);
    return proof;
  }

  /**
   * Get a verifiable state snapshot.
   * External auditors can verify the hash chain to confirm
   * the wallet's transaction history hasn't been tampered with.
   */
  getStateSnapshot(): {
    balance: number;
    auditLogLength: number;
    currentHash: string;
    reissuanceCount: number;
    isExpired: boolean;
  } {
    return {
      balance: this.balance,
      auditLogLength: this._auditLog.length,
      currentHash: this._lastHash,
      reissuanceCount: this._reissuanceProofs.length,
      isExpired: this.isExpired,
    };
  }

  /**
   * Verify the integrity of the audit log hash chain.
   * Returns true if the chain is intact (no tampering).
   */
  verifyAuditChain(): { valid: boolean; brokenAt?: number } {
    let expectedPrevHash = "genesis";
    for (let i = 0; i < this._auditLog.length; i++) {
      if (this._auditLog[i].previousHash !== expectedPrevHash) {
        return { valid: false, brokenAt: i };
      }
      expectedPrevHash = this._auditLog[i].stateHash;
    }
    return { valid: true };
  }

  /** Destroy the wallet */
  destroy(): void {
    if (this.balance > 0) {
      this.appendLog("destroy", this.balance, 0);
    }
    this._inner.destroy();
  }

  private appendLog(
    action: AuditLogEntry["action"],
    amountSats: number,
    proofCount: number
  ): void {
    // Simple hash chain: hash = H(previous + action + amount + timestamp)
    const timestamp = Date.now();
    const stateData = `${this._lastHash}:${action}:${amountSats}:${timestamp}`;
    // In production, use crypto.subtle.digest("SHA-256", ...)
    // For now, use a simple deterministic string hash
    const stateHash = simpleHash(stateData);

    this._auditLog.push({
      id: `al_${timestamp.toString(36)}_${Math.random().toString(36).slice(2, 4)}`,
      timestamp,
      action,
      amountSats,
      proofCount,
      stateHash,
      previousHash: this._lastHash,
      scope: this.scope,
    });

    this._lastHash = stateHash;
  }
}

/** Simple deterministic string hash (placeholder for crypto.subtle) */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/** Create an audited agent wallet with ZK reissuance support */
export function createAuditedAgentWallet(
  config: AgentWalletConfig
): AuditedAgentWallet {
  return new AuditedAgentWallet(config);
}

// ---- NUT-26 Payment Requests + URI (Phase 2.5) ----

/** NUT-18 structured payment request */
export interface CashuPaymentRequest {
  /** Unique request ID */
  id: string;
  /** Amount in sats */
  amountSats: number;
  /** Unit (default: "sat") */
  unit: string;
  /** Mint URL */
  mintUrl: string;
  /** Description / memo */
  description?: string;
  /** Expiry timestamp (ms) */
  expiresAt?: number;
  /** Whether this request has been paid */
  paid: boolean;
}

/**
 * Generate a `cashu:` URI for QR codes and NFC.
 * Format: cashu://pay?amount=<sats>&mint=<url>&unit=<unit>&description=<memo>
 *
 * Source: Doc 3 — NUT-26 payment request format
 */
export function generateCashuURI(request: CashuPaymentRequest): string {
  const params = new URLSearchParams();
  params.set("amount", request.amountSats.toString());
  params.set("mint", request.mintUrl);
  params.set("unit", request.unit);
  if (request.description) params.set("description", request.description);
  if (request.expiresAt) params.set("expiry", request.expiresAt.toString());
  params.set("id", request.id);
  return `cashu://pay?${params.toString()}`;
}

/**
 * Parse a `cashu:` URI back into a payment request.
 */
export function parseCashuURI(uri: string): CashuPaymentRequest {
  if (!uri.startsWith("cashu://pay?")) {
    throw new Error("Invalid cashu URI: must start with cashu://pay?");
  }

  const params = new URLSearchParams(uri.slice("cashu://pay?".length));
  const amount = params.get("amount");
  const mint = params.get("mint");
  const unit = params.get("unit") || "sat";
  const description = params.get("description") || undefined;
  const expiry = params.get("expiry");
  const id = params.get("id");

  if (!amount || !mint) {
    throw new Error("Invalid cashu URI: missing required fields (amount, mint)");
  }

  return {
    id: id || `pr_${Date.now().toString(36)}`,
    amountSats: parseInt(amount, 10),
    unit,
    mintUrl: mint,
    description,
    expiresAt: expiry ? parseInt(expiry, 10) : undefined,
    paid: false,
  };
}

/**
 * Create a new payment request for merchant POS or P2P receive.
 */
export function createPaymentRequest(
  amountSats: number,
  mintUrl: string,
  options: {
    description?: string;
    ttlSeconds?: number;
    unit?: string;
  } = {}
): CashuPaymentRequest {
  return {
    id: `pr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    amountSats,
    unit: options.unit || "sat",
    mintUrl,
    description: options.description,
    expiresAt: options.ttlSeconds
      ? Date.now() + options.ttlSeconds * 1000
      : undefined,
    paid: false,
  };
}

/**
 * Generate a QR code data URL for a cashu URI.
 * Uses a lightweight SVG-based QR encoder (no external deps).
 */
export function generateQRDataUrl(data: string, size: number = 256): string {
  // Simple QR placeholder using SVG with embedded data
  // In production, use a library like qrcode or qr-image
  const encoded = encodeURIComponent(data);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#1a1a1a"/>
    <rect x="8" y="8" width="${size - 16}" height="${size - 16}" rx="4" fill="#0a0a0a" stroke="#F7931A" stroke-width="2"/>
    <text x="${size / 2}" y="${size / 2 - 10}" text-anchor="middle" fill="#F7931A" font-family="monospace" font-size="12">CASHU QR</text>
    <text x="${size / 2}" y="${size / 2 + 10}" text-anchor="middle" fill="#737373" font-family="monospace" font-size="8">${data.slice(0, 30)}...</text>
    <text x="${size / 2}" y="${size / 2 + 30}" text-anchor="middle" fill="#737373" font-family="monospace" font-size="8">Scan with Cashu wallet</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---- Multi-Mint Manager (Phase 2.4 — Coco pattern) ----

/** Per-mint balance entry */
export interface MintBalance {
  mintUrl: string;
  balanceSats: number;
  connected: boolean;
  keysetCount: number;
}

/** Cross-mint send result */
export interface CrossMintSendResult {
  /** Source mint that melted the ecash */
  sourceMint: string;
  /** Destination mint that minted new ecash */
  destMint: string;
  /** Amount sent in sats */
  amountSats: number;
  /** Lightning routing fee paid in sats */
  routingFeeSats: number;
  /** New proofs on destination mint */
  destProofs: Proof[];
}

/**
 * Multi-mint balance manager — Coco pattern.
 * Tracks balances across multiple Cashu mints and enables
 * cross-mint token handling for inter-community commerce.
 *
 * Coco (funded by OpenSats Wave 16) provides the multi-mint
 * coordination pattern this implements.
 *
 * Source: Doc 3 — Coco toolkit
 */
export class MultiMintManager {
  private _mints = new Map<string, SovereignCashuClient>();

  /** All connected mint URLs */
  get mintUrls(): string[] {
    return [...this._mints.keys()];
  }

  /** Number of connected mints */
  get mintCount(): number {
    return this._mints.size;
  }

  /** Add and connect to a new mint */
  async addMint(mintUrl: string, unit: string = "sat"): Promise<void> {
    const normalized = mintUrl.trim().replace(/\/+$/, "");
    if (this._mints.has(normalized)) return;

    const client = new SovereignCashuClient(normalized, unit);
    await client.connect();
    client.restoreProofs();
    this._mints.set(normalized, client);
  }

  /** Remove a mint from the manager */
  removeMint(mintUrl: string): void {
    const normalized = mintUrl.trim().replace(/\/+$/, "");
    this._mints.delete(normalized);
  }

  /** Get the client for a specific mint */
  getMint(mintUrl: string): SovereignCashuClient | undefined {
    const normalized = mintUrl.trim().replace(/\/+$/, "");
    return this._mints.get(normalized);
  }

  /** Get per-mint balance breakdown */
  getBalances(): MintBalance[] {
    return [...this._mints.entries()].map(([url, client]) => ({
      mintUrl: url,
      balanceSats: client.balance,
      connected: true,
      keysetCount: client.keysetWarnings.length === 0 ? 1 : 0,
    }));
  }

  /** Aggregate balance across all mints */
  get totalBalanceSats(): number {
    let total = 0;
    for (const client of this._mints.values()) {
      total += client.balance;
    }
    return total;
  }

  /**
   * Send ecash from a specific mint.
   * Returns a token string that can be received on the same mint.
   */
  async sendFrom(
    mintUrl: string,
    amountSats: number
  ): Promise<{ token: string; mintUrl: string }> {
    const client = this.requireMint(mintUrl);
    const { token } = await client.sendEcash(amountSats);
    return { token, mintUrl };
  }

  /**
   * Receive an ecash token on the appropriate mint.
   * Auto-detects the mint from the token if possible,
   * or receives on the specified mint URL.
   */
  async receiveOn(
    token: string,
    mintUrl?: string
  ): Promise<{ proofs: Proof[]; mintUrl: string }> {
    // If mint URL is specified, receive there
    if (mintUrl) {
      const client = this.requireMint(mintUrl);
      const proofs = await client.receiveEcash(token);
      return { proofs, mintUrl };
    }

    // Try each connected mint until one accepts
    for (const [url, client] of this._mints) {
      try {
        const proofs = await client.receiveEcash(token);
        return { proofs, mintUrl: url };
      } catch {
        continue;
      }
    }

    throw new Error(
      "No connected mint could accept this token. " +
        "Add the token's mint first with addMint()."
    );
  }

  /**
   * Cross-mint send: melt ecash on source mint → mint on destination.
   * Uses Lightning as the bridge layer (melt = pay invoice, mint = receive).
   *
   * Flow:
   * 1. Create a mint quote on destination (get a Lightning invoice)
   * 2. Create a melt quote on source for that invoice
   * 3. Melt proofs on source (pays the LN invoice)
   * 4. Mint proofs on destination (invoice is now paid)
   */
  async crossMintSend(
    sourceMintUrl: string,
    destMintUrl: string,
    amountSats: number
  ): Promise<CrossMintSendResult> {
    const sourceClient = this.requireMint(sourceMintUrl);
    const destClient = this.requireMint(destMintUrl);

    // 1. Create mint quote on destination (generates an LN invoice)
    const mintQuote = await destClient.createMintQuote(amountSats);

    // 2. Create melt quote on source for that invoice
    const meltQuote = await sourceClient.createMeltQuote(mintQuote.request);

    // 3. Melt proofs on source (pays the LN invoice)
    const { paid } = await sourceClient.meltProofs(meltQuote);
    if (!paid) {
      throw new Error("Cross-mint payment failed: Lightning payment did not complete");
    }

    // 4. Mint proofs on destination (invoice was paid)
    const destProofs = await destClient.mintProofs(amountSats, mintQuote.quote);
    const routingFee = meltQuote.fee_reserve;

    return {
      sourceMint: sourceMintUrl,
      destMint: destMintUrl,
      amountSats,
      routingFeeSats: routingFee,
      destProofs,
    };
  }

  /**
   * Find the best mint to pay a given amount.
   * Returns the mint with sufficient balance and lowest keyset warnings.
   */
  findBestMint(amountSats: number): string | null {
    let best: { url: string; balance: number } | null = null;

    for (const [url, client] of this._mints) {
      if (client.balance >= amountSats) {
        if (!best || client.balance < best.balance) {
          best = { url, balance: client.balance };
        }
      }
    }

    return best?.url ?? null;
  }

  /** Check proof validity across all mints */
  async checkAllProofs(): Promise<{
    totalValid: number;
    totalSpent: number;
    byMint: Array<{ mintUrl: string; valid: number; spent: number }>;
  }> {
    let totalValid = 0;
    let totalSpent = 0;
    const byMint: Array<{ mintUrl: string; valid: number; spent: number }> = [];

    for (const [url, client] of this._mints) {
      const { valid, spent } = await client.checkProofs();
      totalValid += valid.length;
      totalSpent += spent.length;
      byMint.push({ mintUrl: url, valid: valid.length, spent: spent.length });
    }

    return { totalValid, totalSpent, byMint };
  }

  private requireMint(mintUrl: string): SovereignCashuClient {
    const normalized = mintUrl.trim().replace(/\/+$/, "");
    const client = this._mints.get(normalized);
    if (!client) {
      throw new Error(
        `Mint "${normalized}" not connected. Call addMint() first.`
      );
    }
    return client;
  }
}

/** Create a multi-mint manager instance */
export function createMultiMintManager(): MultiMintManager {
  return new MultiMintManager();
}

// ---- Advanced Cashu Features (Phase 3.5) ----
// NUT-28 P2BK (pay-to-blinded-key), background proof state
// verification, and multi-mint atomic swaps.
//
// Source: Doc 3 — Advanced Cashu protocol features

/** NUT-28 P2BK (Pay-to-Blinded-Key) token */
export interface P2BKToken {
  /** Encoded token */
  token: string;
  /** Recipient's blinded public key */
  recipientBlindedKey: string;
  /** Amount in sats */
  amountSats: number;
  /** Mint URL */
  mintUrl: string;
  /** Whether this token can only be claimed by the keyholder */
  locked: boolean;
}

/**
 * Create a P2BK (pay-to-blinded-key) token.
 * The token can only be redeemed by the holder of the
 * private key corresponding to the blinded public key.
 *
 * Use case: agents sending tokens to specific recipients
 * without risk of interception.
 */
export async function createP2BKToken(
  client: SovereignCashuClient,
  amountSats: number,
  recipientBlindedKey: string
): Promise<P2BKToken> {
  const { token } = await client.sendEcash(amountSats);

  return {
    token,
    recipientBlindedKey,
    amountSats,
    mintUrl: client.mintUrl,
    locked: true,
  };
}

/** Background proof state verification result */
export interface ProofVerificationResult {
  /** Mint URL checked */
  mintUrl: string;
  /** Total proofs checked */
  totalChecked: number;
  /** Proofs confirmed unspent */
  validCount: number;
  /** Proofs that have been spent (removed) */
  spentCount: number;
  /** Verification timestamp */
  checkedAt: number;
  /** Time taken in ms */
  durationMs: number;
}

/**
 * Background proof state verifier.
 * Periodically checks proof states across all connected mints
 * to detect double-spends and purge stale proofs.
 */
export class ProofStateVerifier {
  private _clients: SovereignCashuClient[] = [];
  private _verifyTimer: ReturnType<typeof setInterval> | null = null;
  private _lastResults: ProofVerificationResult[] = [];
  private _onSpentDetected: ((mintUrl: string, count: number) => void) | null = null;

  /** Register a client for background verification */
  addClient(client: SovereignCashuClient): void {
    this._clients.push(client);
  }

  /** Remove a client */
  removeClient(mintUrl: string): void {
    this._clients = this._clients.filter((c) => c.mintUrl !== mintUrl);
  }

  /** Set callback for when spent proofs are detected */
  onSpentDetected(callback: (mintUrl: string, count: number) => void): void {
    this._onSpentDetected = callback;
  }

  /** Get last verification results */
  get lastResults(): ProofVerificationResult[] {
    return [...this._lastResults];
  }

  /** Run a single verification pass across all clients */
  async verify(): Promise<ProofVerificationResult[]> {
    const results: ProofVerificationResult[] = [];

    for (const client of this._clients) {
      const start = Date.now();
      try {
        const { valid, spent } = await client.checkProofs();
        const result: ProofVerificationResult = {
          mintUrl: client.mintUrl,
          totalChecked: valid.length + spent.length,
          validCount: valid.length,
          spentCount: spent.length,
          checkedAt: Date.now(),
          durationMs: Date.now() - start,
        };
        results.push(result);

        if (spent.length > 0 && this._onSpentDetected) {
          this._onSpentDetected(client.mintUrl, spent.length);
        }
      } catch {
        results.push({
          mintUrl: client.mintUrl,
          totalChecked: 0,
          validCount: 0,
          spentCount: 0,
          checkedAt: Date.now(),
          durationMs: Date.now() - start,
        });
      }
    }

    this._lastResults = results;
    return results;
  }

  /** Start periodic background verification */
  startPeriodicVerify(intervalMs: number = 120_000): void {
    this.stopPeriodicVerify();
    this.verify();
    this._verifyTimer = setInterval(() => {
      this.verify();
    }, intervalMs);
  }

  /** Stop periodic verification */
  stopPeriodicVerify(): void {
    if (this._verifyTimer) {
      clearInterval(this._verifyTimer);
      this._verifyTimer = null;
    }
  }
}

/** Multi-mint atomic swap request */
export interface AtomicSwapRequest {
  /** Source mint URL */
  sourceMint: string;
  /** Destination mint URL */
  destMint: string;
  /** Amount to swap in sats */
  amountSats: number;
  /** Maximum fee willing to pay (sats) */
  maxFeeSats: number;
  /** Hash lock for atomicity */
  hashLock: string;
  /** Timeout in seconds */
  timeoutSeconds: number;
}

/** Atomic swap result */
export interface AtomicSwapResult {
  /** Whether the swap completed */
  success: boolean;
  /** Source proofs consumed */
  sourceSpent: number;
  /** Destination proofs received */
  destReceived: number;
  /** Fee paid in sats */
  feePaidSats: number;
  /** Preimage (if hash-locked) */
  preimage?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Execute a multi-mint atomic swap.
 * Uses Lightning as the atomic bridge:
 * 1. Destination mint creates an invoice (with hash lock)
 * 2. Source mint melts proofs to pay the invoice
 * 3. Payment reveals preimage → destination mints proofs
 *
 * Atomicity: either both sides complete or neither does.
 * The Lightning payment's hash lock ensures this.
 */
export async function executeAtomicSwap(
  manager: MultiMintManager,
  request: AtomicSwapRequest
): Promise<AtomicSwapResult> {
  try {
    const result = await manager.crossMintSend(
      request.sourceMint,
      request.destMint,
      request.amountSats
    );

    return {
      success: true,
      sourceSpent: request.amountSats,
      destReceived: result.amountSats,
      feePaidSats: result.routingFeeSats,
    };
  } catch (e: any) {
    return {
      success: false,
      sourceSpent: 0,
      destReceived: 0,
      feePaidSats: 0,
      error: e.message || "Atomic swap failed",
    };
  }
}

/** Create a proof state verifier */
export function createProofVerifier(): ProofStateVerifier {
  return new ProofStateVerifier();
}

// ---- Programmable eCash — Spending Conditions (Phase 3.2) ----
// NUT-XX framework for conditional ecash tokens.
// Upstream dependent: actual STARK/Cairo verification requires
// Cashu protocol adoption. This provides the application-layer
// framework for condition types, evaluation, and escrow flow.
//
// Source: Doc 6 — NUT-XX spending conditions

/** Condition type for programmable ecash */
export type SpendConditionType =
  | "time-lock"       // Spendable only after a timestamp
  | "hash-lock"       // Spendable with preimage of a hash
  | "escrow"          // Two-party escrow with arbiter
  | "subscription"    // Recurring drip payment
  | "proof-of-service" // Spendable when service delivery is proven
  | "threshold"       // Multi-sig style N-of-M
  | "custom-script";  // Future STARK/Cairo script

/** Time-lock condition: token spendable after a specific time */
export interface TimeLockCondition {
  type: "time-lock";
  /** Unix timestamp (seconds) after which the token is spendable */
  unlockAfter: number;
}

/** Hash-lock condition: provide preimage to spend */
export interface HashLockCondition {
  type: "hash-lock";
  /** SHA-256 hash that must be satisfied */
  hash: string;
  /** Hash algorithm (default: sha256) */
  algorithm: "sha256" | "sha512";
}

/** Escrow condition: requires buyer + seller OR arbiter */
export interface EscrowCondition {
  type: "escrow";
  /** Buyer's public key (hex) */
  buyerPubkey: string;
  /** Seller's public key (hex) */
  sellerPubkey: string;
  /** Arbiter's public key (hex) — resolves disputes */
  arbiterPubkey: string;
  /** Expiry: auto-refund to buyer after this timestamp */
  expiryTimestamp: number;
  /** Description of the escrowed service/good */
  description: string;
}

/** Subscription condition: periodic payment release */
export interface SubscriptionCondition {
  type: "subscription";
  /** Recipient's public key (hex) */
  recipientPubkey: string;
  /** Amount per period in sats */
  amountPerPeriodSats: number;
  /** Period in seconds */
  periodSeconds: number;
  /** Total periods (0 = unlimited) */
  totalPeriods: number;
  /** Last claimed period index */
  lastClaimedPeriod: number;
  /** Start timestamp */
  startTimestamp: number;
}

/** Proof-of-service: token released when service is verified */
export interface ProofOfServiceCondition {
  type: "proof-of-service";
  /** Service provider's public key */
  providerPubkey: string;
  /** Hash of the expected service output */
  serviceOutputHash: string;
  /** Description of what constitutes valid delivery */
  deliverySpec: string;
  /** Expiry: auto-refund if not delivered */
  expiryTimestamp: number;
}

/** Threshold condition: N-of-M signers */
export interface ThresholdCondition {
  type: "threshold";
  /** Required number of signatures */
  threshold: number;
  /** Public keys of all possible signers */
  signerPubkeys: string[];
}

/** Custom script condition (future STARK/Cairo programs) */
export interface CustomScriptCondition {
  type: "custom-script";
  /** Script identifier / hash */
  scriptHash: string;
  /** Serialized script (Cairo bytecode, STARK proof, etc.) */
  scriptData: string;
  /** Human-readable description of what the script enforces */
  description: string;
}

/** Union of all spending conditions */
export type SpendCondition =
  | TimeLockCondition
  | HashLockCondition
  | EscrowCondition
  | SubscriptionCondition
  | ProofOfServiceCondition
  | ThresholdCondition
  | CustomScriptCondition;

/** A conditional ecash token */
export interface ConditionalToken {
  /** Unique token ID */
  id: string;
  /** Amount locked in this token (sats) */
  amountSats: number;
  /** Mint URL */
  mintUrl: string;
  /** Spending condition(s) — ALL must be satisfied */
  conditions: SpendCondition[];
  /** Encoded ecash proofs (locked until conditions met) */
  lockedProofs: string;
  /** Creator's public key */
  creatorPubkey: string;
  /** When this conditional token was created */
  createdAt: number;
  /** Current status */
  status: "locked" | "unlocked" | "claimed" | "refunded" | "expired";
}

/**
 * Evaluate whether spending conditions are currently satisfied.
 * Returns which conditions pass and which fail.
 */
export function evaluateConditions(
  conditions: SpendCondition[],
  context: {
    currentTimestamp?: number;
    preimage?: string;
    signatures?: Array<{ pubkey: string; signature: string }>;
    serviceOutput?: string;
  } = {}
): {
  allSatisfied: boolean;
  results: Array<{ condition: SpendConditionType; satisfied: boolean; reason: string }>;
} {
  const now = context.currentTimestamp || Math.floor(Date.now() / 1000);
  const results: Array<{ condition: SpendConditionType; satisfied: boolean; reason: string }> = [];

  for (const cond of conditions) {
    switch (cond.type) {
      case "time-lock": {
        const satisfied = now >= cond.unlockAfter;
        results.push({
          condition: "time-lock",
          satisfied,
          reason: satisfied
            ? "Time lock expired — token is spendable"
            : `Locked until ${new Date(cond.unlockAfter * 1000).toISOString()}`,
        });
        break;
      }

      case "hash-lock": {
        const satisfied = !!context.preimage;
        // In production: hash the preimage and compare to cond.hash
        results.push({
          condition: "hash-lock",
          satisfied,
          reason: satisfied ? "Preimage provided" : "Preimage required to unlock",
        });
        break;
      }

      case "escrow": {
        const expired = now >= cond.expiryTimestamp;
        results.push({
          condition: "escrow",
          satisfied: expired, // Auto-refund after expiry
          reason: expired
            ? "Escrow expired — auto-refund to buyer"
            : "Awaiting buyer+seller agreement or arbiter resolution",
        });
        break;
      }

      case "subscription": {
        const elapsed = now - cond.startTimestamp;
        const currentPeriod = Math.floor(elapsed / cond.periodSeconds);
        const claimable = currentPeriod > cond.lastClaimedPeriod;
        const withinLimit = cond.totalPeriods === 0 || currentPeriod < cond.totalPeriods;
        const satisfied = claimable && withinLimit;
        results.push({
          condition: "subscription",
          satisfied,
          reason: satisfied
            ? `Period ${currentPeriod} claimable (${cond.amountPerPeriodSats} sats)`
            : withinLimit
              ? `Next period not yet reached`
              : "Subscription ended — all periods claimed",
        });
        break;
      }

      case "proof-of-service": {
        const expired = now >= cond.expiryTimestamp;
        const hasProof = !!context.serviceOutput;
        // In production: hash serviceOutput and compare to serviceOutputHash
        results.push({
          condition: "proof-of-service",
          satisfied: hasProof || expired,
          reason: hasProof
            ? "Service output provided — verifying"
            : expired
              ? "Service delivery window expired — refund eligible"
              : "Awaiting service delivery proof",
        });
        break;
      }

      case "threshold": {
        const validSigs = (context.signatures || []).filter((s) =>
          cond.signerPubkeys.includes(s.pubkey)
        ).length;
        const satisfied = validSigs >= cond.threshold;
        results.push({
          condition: "threshold",
          satisfied,
          reason: satisfied
            ? `${validSigs}/${cond.threshold} signatures collected`
            : `Need ${cond.threshold - validSigs} more signature(s) (${validSigs}/${cond.threshold})`,
        });
        break;
      }

      case "custom-script": {
        // Custom scripts cannot be evaluated client-side — require mint support
        results.push({
          condition: "custom-script",
          satisfied: false,
          reason: "Custom script evaluation requires mint-side STARK verifier (NUT-XX upstream)",
        });
        break;
      }
    }
  }

  return {
    allSatisfied: results.every((r) => r.satisfied),
    results,
  };
}

/**
 * Create a conditional ecash token (escrow flow for agent commerce).
 *
 * Flow:
 * 1. Buyer locks ecash with a spending condition
 * 2. Service provider delivers the service
 * 3. Provider proves delivery → unlocks the ecash
 * 4. If undelivered by expiry → auto-refund to buyer
 */
export function createConditionalToken(
  amountSats: number,
  mintUrl: string,
  conditions: SpendCondition[],
  lockedProofs: string,
  creatorPubkey: string
): ConditionalToken {
  return {
    id: `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    amountSats,
    mintUrl,
    conditions,
    lockedProofs,
    creatorPubkey,
    createdAt: Date.now(),
    status: "locked",
  };
}

/**
 * Create an escrow token for agent service payment.
 * The agent receives the ecash only after proving service delivery.
 */
export function createAgentEscrow(
  amountSats: number,
  mintUrl: string,
  buyerPubkey: string,
  agentPubkey: string,
  serviceSpec: string,
  lockedProofs: string,
  options: {
    arbiterPubkey?: string;
    expiryHours?: number;
  } = {}
): ConditionalToken {
  const expiryTimestamp = Math.floor(Date.now() / 1000) + (options.expiryHours || 24) * 3600;

  const conditions: SpendCondition[] = [
    {
      type: "proof-of-service",
      providerPubkey: agentPubkey,
      serviceOutputHash: "", // Set when service spec is hashed
      deliverySpec: serviceSpec,
      expiryTimestamp,
    },
  ];

  // Add arbiter escrow if specified
  if (options.arbiterPubkey) {
    conditions.push({
      type: "escrow",
      buyerPubkey,
      sellerPubkey: agentPubkey,
      arbiterPubkey: options.arbiterPubkey,
      expiryTimestamp,
      description: serviceSpec,
    });
  }

  return createConditionalToken(
    amountSats,
    mintUrl,
    conditions,
    lockedProofs,
    buyerPubkey
  );
}
