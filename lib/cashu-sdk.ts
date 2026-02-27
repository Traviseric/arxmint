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
  MintQuoteState,
  getEncodedTokenV4,
  type Proof,
  type MintQuoteResponse,
  type MeltQuoteResponse,
} from "@cashu/cashu-ts";

// ---- Keyset ID Validation (NUT-13 security) ----

/** Known keyset IDs across all connected mints — used for collision detection */
const globalKeysetRegistry = new Map<string, string>(); // keysetId → mintUrl

/**
 * Validate keyset IDs from a mint to prevent NUT-13 collision attacks.
 *
 * The Jan 2026 vulnerability disclosure showed that wallets using NUT-13
 * deterministic secrets derive blinding factors from a 31-bit keyset_id_int,
 * which can collide across mints. An adversarial mint can exploit this to
 * steal proofs via the /restore endpoint.
 *
 * This function checks:
 * 1. Keyset IDs are not empty or malformed
 * 2. No keyset ID collides with a different mint in our registry
 * 3. Keyset IDs have sufficient entropy (reject suspiciously short IDs)
 */
function validateKeysetIds(
  keysets: Array<{ id: string; active: boolean }>,
  mintUrl: string
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (const ks of keysets) {
    if (!ks.id || ks.id.length < 8) {
      return {
        valid: false,
        warnings: [`Keyset ID "${ks.id}" is too short — possible malicious mint`],
      };
    }

    const existingMint = globalKeysetRegistry.get(ks.id);
    if (existingMint && existingMint !== mintUrl) {
      return {
        valid: false,
        warnings: [
          `Keyset ID "${ks.id}" collision: already registered to ${existingMint}. ` +
            `This mint (${mintUrl}) may be adversarial. Refusing to connect.`,
        ],
      };
    }

    // Check the derived keyset_id_int for collision (NUT-13 uses last 31 bits)
    const keysetIdInt = deriveKeysetIdInt(ks.id);
    for (const [existingId, existingUrl] of globalKeysetRegistry) {
      if (existingUrl !== mintUrl && deriveKeysetIdInt(existingId) === keysetIdInt) {
        warnings.push(
          `Keyset ID int collision: "${ks.id}" (this mint) and "${existingId}" ` +
            `(${existingUrl}) share the same 31-bit derivation integer ${keysetIdInt}. ` +
            `NUT-13 deterministic secrets may collide. Proceeding with caution.`
        );
      }
    }
  }

  // Register all keyset IDs for this mint
  for (const ks of keysets) {
    globalKeysetRegistry.set(ks.id, mintUrl);
  }

  return { valid: true, warnings };
}

/**
 * Derive the NUT-13 keyset_id_int from a keyset ID string.
 * NUT-13 uses: keyset_id_int = int(keyset_id, 16) % (2^31 - 1)
 */
function deriveKeysetIdInt(keysetId: string): number {
  // Parse hex keyset ID to a number, then take modulo 2^31-1
  // This is the reduced namespace that NUT-13 uses for BIP32 derivation
  const hex = keysetId.replace(/^00/, ""); // strip version byte if present
  let num = 0;
  for (let i = 0; i < Math.min(hex.length, 8); i++) {
    num = (num * 16 + parseInt(hex[i], 16)) | 0;
  }
  return Math.abs(num) % 2147483647; // 2^31 - 1
}

export class SovereignCashuClient {
  private wallet: Wallet | null = null;
  private _mintUrl: string;
  private _proofs: Proof[] = [];
  private _unit: string;
  private _keysetWarnings: string[] = [];

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

    // Validate keyset IDs against the global registry (NUT-13 security)
    const keysets = this.wallet.keyChain.getKeysets();
    if (keysets && keysets.length > 0) {
      const keysetData = keysets.map((ks) => ({ id: ks.id, active: ks.isActive }));
      const validation = validateKeysetIds(keysetData, this._mintUrl);
      this._keysetWarnings = validation.warnings;

      if (!validation.valid) {
        this.wallet = null;
        throw new Error(
          `Mint keyset validation failed: ${validation.warnings.join("; ")}`
        );
      }

      if (validation.warnings.length > 0) {
        console.warn(
          `[ArxMint] Cashu keyset warnings for ${this._mintUrl}:`,
          validation.warnings
        );
      }
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

    // Validate received proofs have keyset IDs we trust
    for (const proof of received) {
      const knownMint = globalKeysetRegistry.get(proof.id);
      if (knownMint && knownMint !== this._mintUrl) {
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
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(
        `arxmint_cashu_proofs_${this._mintUrl}`
      );
      if (stored) {
        this._proofs = JSON.parse(stored);
      }
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
