"use client";

// ============================================================
// ArxMint — Cashu SDK Wrapper
// Uses @cashu/cashu-ts v3.x — pure TypeScript, no WASM
// Lightweight fallback when Fedimint is overkill
// ============================================================

import {
  Wallet,
  MintQuoteState,
  getEncodedTokenV4,
  type Proof,
  type MintQuoteResponse,
  type MeltQuoteResponse,
} from "@cashu/cashu-ts";

export class SovereignCashuClient {
  private wallet: Wallet | null = null;
  private _mintUrl: string;
  private _proofs: Proof[] = [];
  private _unit: string;

  constructor(mintUrl: string, unit: string = "sat") {
    this._mintUrl = mintUrl;
    this._unit = unit;
  }

  get mintUrl(): string {
    return this._mintUrl;
  }

  /** Connect to the Cashu mint and load keysets */
  async connect(): Promise<void> {
    this.wallet = new Wallet(this._mintUrl, { unit: this._unit });
    await this.wallet.loadMint();
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

  /** Receive an ecash token string */
  async receiveEcash(token: string): Promise<Proof[]> {
    this.requireConnected();
    const received = await this.wallet!.receive(token);
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
