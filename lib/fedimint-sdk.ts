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
    // SDK returns OutgoingLightningPayment: { payment_type, contract_id, fee }
    // The operationId lives inside payment_type as either { lightning: id } or { internal: id }
    const result = await this.wallet.lightning.payInvoice(bolt11);
    type FedimintPaymentType = { lightning?: string; internal?: string };
    const pt = result.payment_type as FedimintPaymentType;
    const operationId: string = pt.lightning ?? pt.internal ?? result.contract_id;
    if (!operationId) {
      throw new Error("payInvoice: could not extract operationId from SDK response");
    }
    return { operationId };
  }

  /**
   * Wait for a lightning payment operation to complete and return the real preimage.
   * Uses wallet.lightning.waitForPay() which streams LnPayState until success or failure.
   * The returned preimage satisfies SHA256(preimage) === rHash (required for L402 tokens).
   */
  async waitForLightningPayment(
    operationId: string,
    timeoutMs = 60_000
  ): Promise<{ preimage: string }> {
    this.requireOpen();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Fedimint payment timeout after ${timeoutMs}ms for operation ${operationId}`)),
        timeoutMs
      )
    );
    const result = await Promise.race([
      this.wallet.lightning.waitForPay(operationId),
      timeoutPromise,
    ]);
    if (!result.success) {
      throw new Error(
        `Fedimint lightning payment failed: ${result.error ?? "unknown error"}`
      );
    }
    return { preimage: result.data.preimage };
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

// ---- Agent Wallet Pattern (Phase 1.6) ----

/** Configuration for ephemeral Fedimint agent wallets */
export interface FedimintAgentWalletConfig {
  /** Federation invite code */
  inviteCode: string;
  /** Time-to-live in seconds */
  ttlSeconds: number;
  /** Maximum balance in msats */
  maxBalanceMsats: number;
  /** Community/scope restriction */
  scope?: string;
}

/**
 * Ephemeral Fedimint wallet for agent processes.
 * - In-memory only — no persistent state
 * - Auto-expires after configured TTL
 * - Balance limits enforced
 * - Clean teardown on disconnect
 */
export class AgentFedimintWallet {
  private client: SovereignFedimintClient | null = null;
  private _config: FedimintAgentWalletConfig;
  private _createdAt: number;
  private _expireTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;
  private _balanceMsats = 0;

  constructor(config: FedimintAgentWalletConfig) {
    this._config = config;
    this._createdAt = Date.now();

    this._expireTimer = setTimeout(() => {
      this.destroy();
    }, config.ttlSeconds * 1000);
  }

  get isExpired(): boolean {
    return this._destroyed || Date.now() > this._createdAt + this._config.ttlSeconds * 1000;
  }

  get balanceMsats(): number {
    return this._balanceMsats;
  }

  get balanceSats(): number {
    return Math.floor(this._balanceMsats / 1000);
  }

  get scope(): string | undefined {
    return this._config.scope;
  }

  get timeRemaining(): number {
    const remaining = (this._createdAt + this._config.ttlSeconds * 1000) - Date.now();
    return Math.max(0, remaining);
  }

  /** Initialize and join federation (in-memory) */
  async connect(): Promise<void> {
    this.requireAlive();
    this.client = new SovereignFedimintClient();
    await this.client.init();
    await this.client.joinFederation(this._config.inviteCode);
  }

  /** Receive ecash notes (with balance limit enforcement) */
  async receive(notes: string): Promise<void> {
    this.requireAlive();
    this.requireConnected();

    const parsed = await this.client!.parseNotes(notes);
    if (this._balanceMsats + parsed.total_amount > this._config.maxBalanceMsats) {
      throw new Error(
        `Agent wallet balance limit exceeded: ` +
        `${this._balanceMsats + parsed.total_amount} > ${this._config.maxBalanceMsats} msats`
      );
    }

    await this.client!.receiveEcash(notes);
    this._balanceMsats = await this.client!.getBalance();
  }

  /** Spend ecash notes */
  async spend(amountMsats: number): Promise<string> {
    this.requireAlive();
    this.requireConnected();
    const notes = await this.client!.spendEcash(amountMsats);
    this._balanceMsats = await this.client!.getBalance();
    return notes;
  }

  /** Pay a Lightning invoice */
  async payInvoice(bolt11: string): Promise<{ operationId: string }> {
    this.requireAlive();
    this.requireConnected();
    const result = await this.client!.payInvoice(bolt11);
    this._balanceMsats = await this.client!.getBalance();
    return result;
  }

  /** Destroy the wallet — clean up WASM resources */
  async destroy(): Promise<void> {
    if (this._expireTimer) {
      clearTimeout(this._expireTimer);
      this._expireTimer = null;
    }
    if (this.client) {
      await this.client.cleanup();
      this.client = null;
    }
    this._balanceMsats = 0;
    this._destroyed = true;
  }

  private requireAlive(): void {
    if (this.isExpired) {
      throw new Error("Agent wallet has expired. Create a new one.");
    }
  }

  private requireConnected(): void {
    if (!this.client || !this.client.isOpen) {
      throw new Error("Agent wallet not connected. Call connect() first.");
    }
  }
}

/** Create an ephemeral Fedimint agent wallet */
export function createFedimintAgentWallet(
  config: FedimintAgentWalletConfig
): AgentFedimintWallet {
  return new AgentFedimintWallet(config);
}

// ---- Fedimint Gateway → L402 Bridge (Phase 2.8) ----

/** Gateway bridge configuration */
export interface GatewayBridgeConfig {
  /** Fedimint client to use for ecash */
  fedimintClient: SovereignFedimintClient;
  /** Maximum sats to auto-pay per request */
  maxAutoPaySats: number;
  /** Timeout in ms to wait for the lightning payment result (default: 60_000) */
  paymentTimeoutMs?: number;
}

/** L402 challenge from a 402 response */
interface GatewayL402Challenge {
  macaroon: string;
  invoice: string;
  amountMsats: number;
}

/**
 * Fedimint Gateway L402 Bridge.
 * Routes L402 payments through the Fedimint gateway so users
 * holding Fedimint ecash can pay for L402-gated services without
 * a separate Lightning wallet.
 *
 * Flow:
 * 1. Fetch L402-gated URL → receive 402 + WWW-Authenticate
 * 2. Parse the Lightning invoice from the challenge
 * 3. Pay the invoice via Fedimint gateway (ecash → Lightning)
 * 4. Retry with the L402 token (macaroon:preimage)
 *
 * Source: Doc 2 — route L402 through Fedimint gateway
 */
export class FedimintGatewayBridge {
  private _config: GatewayBridgeConfig;
  private _tokenCache = new Map<string, { macaroon: string; preimage: string }>();

  constructor(config: GatewayBridgeConfig) {
    this._config = config;
  }

  /**
   * Fetch an L402-gated URL, paying with Fedimint ecash via gateway.
   * If the server returns 402, automatically pays the Lightning invoice
   * through the Fedimint gateway and retries.
   *
   * @param timeoutMs - How long to wait for the lightning payment to settle (default: 60s).
   */
  async fetch(url: string, options: RequestInit = {}, timeoutMs?: number): Promise<Response> {
    if (!this._config.fedimintClient.isOpen) {
      throw new Error("Fedimint client not connected. Call joinFederation() first.");
    }

    const domain = new URL(url).hostname;

    // Check cached token
    const cached = this._tokenCache.get(domain);
    if (cached) {
      const resp = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `L402 ${cached.macaroon}:${cached.preimage}`,
        },
      });
      if (resp.status !== 402) return resp;
      this._tokenCache.delete(domain);
    }

    // Initial request
    const response = await fetch(url, options);
    if (response.status !== 402) return response;

    // Parse L402 challenge
    const wwwAuth = response.headers.get("WWW-Authenticate");
    if (!wwwAuth) {
      throw new Error("402 response but no WWW-Authenticate header");
    }

    const challenge = this.parseChallenge(wwwAuth);

    // Check amount limit
    const amountSats = Math.ceil(challenge.amountMsats / 1000);
    if (amountSats > this._config.maxAutoPaySats) {
      throw new Error(
        `L402 invoice amount (${amountSats} sats) exceeds auto-pay limit (${this._config.maxAutoPaySats} sats). ` +
          `Increase maxAutoPaySats or pay manually.`
      );
    }

    // Pay via Fedimint gateway (ecash → Lightning)
    const { operationId } = await this._config.fedimintClient.payInvoice(
      challenge.invoice
    );

    // Wait for the lightning payment to complete and extract the real preimage.
    // SHA256(preimage) === rHash must hold for the L402 token to be accepted by the server.
    const paymentTimeoutMs = timeoutMs ?? this._config.paymentTimeoutMs ?? 60_000;
    const { preimage } = await this.waitForLightningPayment(operationId, paymentTimeoutMs);

    // Cache the token
    this._tokenCache.set(domain, {
      macaroon: challenge.macaroon,
      preimage,
    });

    // Retry with L402 credentials
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `L402 ${challenge.macaroon}:${preimage}`,
      },
    });
  }

  /** Clear the L402 token cache */
  clearCache(): void {
    this._tokenCache.clear();
  }

  /**
   * Wait for a Fedimint lightning payment operation to finish and return the preimage.
   * Delegates to SovereignFedimintClient.waitForLightningPayment() which uses
   * the SDK's waitForPay() stream internally.
   */
  private async waitForLightningPayment(
    operationId: string,
    timeoutMs: number
  ): Promise<{ preimage: string }> {
    return this._config.fedimintClient.waitForLightningPayment(operationId, timeoutMs);
  }

  /** Parse L402 or Cashu challenge from WWW-Authenticate header */
  private parseChallenge(wwwAuth: string): GatewayL402Challenge {
    // L402 format: L402 macaroon="...", invoice="..."
    const macaroonMatch = wwwAuth.match(/macaroon="([^"]+)"/);
    const invoiceMatch = wwwAuth.match(/invoice="([^"]+)"/);

    if (!macaroonMatch || !invoiceMatch) {
      throw new Error("Invalid L402 challenge: missing macaroon or invoice");
    }

    // Estimate amount from invoice (in production, decode BOLT11)
    // BOLT11 amount is encoded in the human-readable part
    const invoice = invoiceMatch[1];
    let amountMsats = 0;
    const amountMatch = invoice.match(/lnbc(\d+)([munp]?)/i);
    if (amountMatch) {
      const num = parseInt(amountMatch[1], 10);
      const multiplier = amountMatch[2];
      switch (multiplier) {
        case "m": amountMsats = num * 100_000_000; break; // milli-BTC
        case "u": amountMsats = num * 100_000; break;     // micro-BTC
        case "n": amountMsats = num * 100; break;         // nano-BTC
        case "p": amountMsats = num; break;               // pico-BTC (msats)
        default: amountMsats = num * 100_000_000_000; break; // BTC
      }
    }

    return {
      macaroon: macaroonMatch[1],
      invoice,
      amountMsats,
    };
  }
}

/** Create a gateway bridge for L402 payments via Fedimint ecash */
export function createGatewayBridge(
  config: GatewayBridgeConfig
): FedimintGatewayBridge {
  return new FedimintGatewayBridge(config);
}
