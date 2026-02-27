"use client";

// ============================================================
// ArxMint — Fedimint SDK Wrapper
// Uses @fedimint/core + @fedimint/transport-web (WASM)
// Client-side only — runs in Web Worker
// ============================================================

import type { WalletBalance } from "./types";

// Lazy-loaded to avoid SSR issues with WASM
let WalletDirector: any;
let WasmWorkerTransport: any;

async function loadFedimintSDK() {
  if (!WalletDirector) {
    const core = await import("@fedimint/core");
    const transport = await import("@fedimint/transport-web");
    WalletDirector = core.WalletDirector;
    WasmWorkerTransport = transport.WasmWorkerTransport;
  }
}

export class SovereignFedimintClient {
  private director: any = null;
  private wallet: any = null;
  private _isOpen = false;
  private _federationId: string | null = null;

  /** Initialize the WASM client (call once on app load) */
  async init(): Promise<void> {
    await loadFedimintSDK();
    this.director = new WalletDirector(new WasmWorkerTransport());
    this.wallet = await this.director.createWallet();
  }

  /** Check if already connected to a federation */
  get isOpen(): boolean {
    return this._isOpen;
  }

  get federationId(): string | null {
    return this._federationId;
  }

  /** Open existing wallet (reconnect to previously joined federation) */
  async open(): Promise<boolean> {
    if (!this.wallet) throw new Error("Call init() first");
    await this.wallet.open();
    this._isOpen = this.wallet.isOpen?.() ?? false;
    if (this._isOpen) {
      this._federationId = await this.wallet.federation.getFederationId();
    }
    return this._isOpen;
  }

  /** Preview a federation before joining */
  async previewFederation(inviteCode: string): Promise<{
    name: string;
    guardians: number;
    modules: string[];
  }> {
    if (!this.wallet) throw new Error("Call init() first");
    const preview = await this.wallet.previewFederation(inviteCode);
    return preview;
  }

  /** Join a Fedimint federation using its invite code */
  async joinFederation(inviteCode: string): Promise<string> {
    if (!this.wallet) throw new Error("Call init() first");

    // Generate and set mnemonic if not already set
    const hasMnemonic = await this.wallet.hasMnemonicSet();
    if (!hasMnemonic) {
      const mnemonic = await this.wallet.generateMnemonic();
      await this.wallet.setMnemonic(mnemonic);
      // IMPORTANT: User should back up this mnemonic
      console.warn(
        "[ArxMint] New mnemonic generated — back it up securely!"
      );
    }

    await this.wallet.joinFederation(inviteCode);
    this._isOpen = true;
    this._federationId = await this.wallet.federation.getFederationId();
    return this._federationId!;
  }

  /** Get the invite code for the current federation */
  async getInviteCode(): Promise<string> {
    this.requireOpen();
    return await this.wallet.federation.getInviteCode();
  }

  // ----- Balance -----

  /** Get current ecash balance in msats */
  async getBalance(): Promise<number> {
    this.requireOpen();
    return await this.wallet.balance.getBalance();
  }

  /** Subscribe to balance changes */
  subscribeBalance(callback: (balanceMsats: number) => void): () => void {
    this.requireOpen();
    return this.wallet.balance.subscribeBalance(callback);
  }

  // ----- Ecash (Mint) -----

  /** Create ecash notes to send to someone (spend) */
  async spendEcash(amountMsats: number): Promise<string> {
    this.requireOpen();
    return await this.wallet.mint.spendNotes(amountMsats);
  }

  /** Receive ecash notes from someone (redeem) */
  async receiveEcash(notes: string): Promise<void> {
    this.requireOpen();
    await this.wallet.mint.redeemEcash(notes);
  }

  /** Parse ecash notes to inspect amount */
  async parseNotes(notes: string): Promise<{ total_amount: number }> {
    if (!this.director) throw new Error("Call init() first");
    return await this.director.parseOobNotes(notes);
  }

  // ----- Lightning -----

  /** Create a Lightning invoice (receive via LN) */
  async createInvoice(
    amountMsats: number,
    description?: string
  ): Promise<{ invoice: string; operationId: string }> {
    this.requireOpen();
    return await this.wallet.lightning.createInvoice(
      amountMsats,
      description || "ArxMint payment"
    );
  }

  /** Pay a Lightning invoice (send via LN) */
  async payInvoice(bolt11: string): Promise<{ operationId: string }> {
    this.requireOpen();
    return await this.wallet.lightning.payInvoice(bolt11);
  }

  /** Parse a BOLT11 invoice */
  async parseInvoice(
    bolt11: string
  ): Promise<{ amount_msat: number; description: string; expiry: number }> {
    if (!this.wallet) throw new Error("Call init() first");
    return await this.wallet.parseBolt11Invoice(bolt11);
  }

  // ----- Federation Info -----

  /** Get federation configuration */
  async getConfig(): Promise<any> {
    this.requireOpen();
    return await this.wallet.federation.getConfig();
  }

  /** List operations */
  async listOperations(): Promise<any[]> {
    this.requireOpen();
    return await this.wallet.federation.listOperations();
  }

  // ----- On-Chain -----

  /** Generate a deposit address */
  async getDepositAddress(): Promise<string> {
    this.requireOpen();
    return await this.wallet.wallet.generateAddress();
  }

  // ----- Cleanup -----

  /** Cleanup WASM resources (call on unmount) */
  async cleanup(): Promise<void> {
    if (this.wallet) {
      await this.wallet.cleanup();
      this.wallet = null;
      this._isOpen = false;
    }
  }

  private requireOpen(): void {
    if (!this._isOpen || !this.wallet) {
      throw new Error("Not connected to a federation. Call joinFederation() or open() first.");
    }
  }
}

/** Singleton instance */
let _instance: SovereignFedimintClient | null = null;

export function getFedimintClient(): SovereignFedimintClient {
  if (!_instance) {
    _instance = new SovereignFedimintClient();
  }
  return _instance;
}
