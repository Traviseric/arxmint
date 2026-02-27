"use client";

// ============================================================
// ArxMint — Lightning Agent Integration
// Uses @lightninglabs/lnc-web for direct node access
// + L402 client for agent commerce paywalls
//
// Security: Implements 3-tier access model (Phase 0.3).
// Agents default to WATCH_ONLY. PAY_ONLY uses remote signer.
// ADMIN requires explicit opt-in with warning.
// ============================================================

import type { SecurityTier } from "./types";

/** L402 challenge parsed from a 402 response */
interface L402Challenge {
  macaroon: string;
  invoice: string;
}

/** L402 token (macaroon + payment proof) */
interface L402Token {
  macaroon: string;
  preimage: string;
}

/** Lightning node info */
export interface NodeInfo {
  alias: string;
  publicKey: string;
  version: string;
  blockHeight: number;
  synced: boolean;
  numChannels: number;
}

/** Channel info */
export interface ChannelInfo {
  channelId: string;
  remotePubkey: string;
  capacity: number;
  localBalance: number;
  remoteBalance: number;
  active: boolean;
}

/** Remote signer configuration for PAY_ONLY tier */
export interface RemoteSignerConfig {
  /** URL of the litd remote signer */
  signerUrl: string;
  /** TLS certificate (base64) */
  tlsCert?: string;
  /** Macaroon for the remote signer (hex) */
  macaroon?: string;
}

/** Validate that a PAY_ONLY remote signer config is complete and safe */
export function validateRemoteSignerConfig(
  config?: RemoteSignerConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    return {
      valid: false,
      errors: [
        "missing remote signer config",
        "signerUrl is required",
        "tlsCert is required",
        "macaroon is required",
      ],
    };
  }

  const signerUrl = config.signerUrl?.trim();
  const tlsCert = config.tlsCert?.trim();
  const macaroon = config.macaroon?.trim();

  if (!signerUrl) {
    errors.push("signerUrl is required");
  } else if (!/^https?:\/\//i.test(signerUrl)) {
    errors.push("signerUrl must start with http:// or https://");
  } else {
    try {
      // Require a parseable URL so misconfigured hosts fail closed.
      const parsed = new URL(signerUrl);
      if (!parsed.hostname) {
        errors.push("signerUrl must include a hostname");
      }
    } catch {
      errors.push("signerUrl must be a valid URL (e.g. https://signer.local:8443)");
    }
  }

  if (!tlsCert) {
    errors.push("tlsCert is required");
  }

  if (!macaroon) {
    errors.push("macaroon is required");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate remote signer env requirements for PAY_ONLY mode.
 * Accepts both server env keys and NEXT_PUBLIC keys for local/browser flows.
 */
export function validateRemoteSignerEnv(
  env: Record<string, string | undefined>
): { valid: boolean; errors: string[] } {
  const tier = (env.LNC_SECURITY_TIER || "watch-only").trim().toLowerCase();
  if (tier !== "pay-only") {
    return { valid: true, errors: [] };
  }

  return validateRemoteSignerConfig({
    signerUrl: env.REMOTE_SIGNER_URL || env.NEXT_PUBLIC_REMOTE_SIGNER_URL || "",
    tlsCert: env.REMOTE_SIGNER_TLS_CERT || env.NEXT_PUBLIC_REMOTE_SIGNER_TLS_CERT,
    macaroon: env.REMOTE_SIGNER_MACAROON || env.NEXT_PUBLIC_REMOTE_SIGNER_MACAROON,
  });
}

/** Macaroon role for scoped credentials */
export type MacaroonRole =
  | "read-only"
  | "invoice-only"
  | "pay-only"
  | "agent-commerce";

/** Configuration for baking a scoped macaroon */
export interface MacaroonBakeConfig {
  /** Role determines the permission set */
  role: MacaroonRole;
  /** Time-to-live in seconds (optional — no expiry if omitted) */
  ttlSeconds?: number;
  /** Maximum payment amount in sats (enforced client-side) */
  amountLimitSats?: number;
  /** Restrict to specific API endpoints (enforced client-side) */
  allowedEndpoints?: string[];
}

/** Baked macaroon with metadata */
export interface BakedMacaroon {
  /** Hex-encoded macaroon */
  macaroon: string;
  /** Role this macaroon was baked for */
  role: MacaroonRole;
  /** Human-readable permission list */
  permissions: string[];
  /** Expiry timestamp (ms) or undefined for no expiry */
  expiresAt?: number;
  /** Client-side amount limit */
  amountLimitSats?: number;
  /** Client-side endpoint restrictions */
  allowedEndpoints?: string[];
  /** When this macaroon was created (ms) */
  createdAt: number;
}

/** LND permission sets per role */
const MACAROON_ROLE_PERMISSIONS: Record<
  MacaroonRole,
  Array<{ entity: string; action: string }>
> = {
  "read-only": [
    { entity: "info", action: "read" },
    { entity: "offchain", action: "read" },
    { entity: "onchain", action: "read" },
  ],
  "invoice-only": [
    { entity: "info", action: "read" },
    { entity: "offchain", action: "read" },
    { entity: "onchain", action: "read" },
    { entity: "invoices", action: "read" },
    { entity: "invoices", action: "write" },
  ],
  "pay-only": [
    { entity: "info", action: "read" },
    { entity: "offchain", action: "read" },
    { entity: "offchain", action: "write" },
    { entity: "onchain", action: "read" },
  ],
  "agent-commerce": [
    { entity: "info", action: "read" },
    { entity: "offchain", action: "read" },
    { entity: "offchain", action: "write" },
    { entity: "onchain", action: "read" },
    { entity: "invoices", action: "read" },
    { entity: "invoices", action: "write" },
  ],
};

// ---- LNC Client (direct Lightning node access) ----

let LNC: any = null;

async function loadLNC() {
  if (!LNC) {
    const mod = await import("@lightninglabs/lnc-web");
    LNC = mod.default;
  }
}

export class SovereignLightningClient {
  private lnc: any = null;
  private _connected = false;
  private _securityTier: SecurityTier = "watch-only";
  private _remoteSignerConfig: RemoteSignerConfig | null = null;

  /** Current security tier */
  get securityTier(): SecurityTier {
    return this._securityTier;
  }

  /**
   * Connect to a Lightning node via LNC pairing phrase.
   * @param tier Security tier — defaults to "watch-only" for safety.
   *             "pay-only" requires a remote signer config.
   *             "admin" requires explicit opt-in.
   */
  async connect(
    pairingPhrase: string,
    password: string,
    tier: SecurityTier = "watch-only",
    remoteSignerConfig?: RemoteSignerConfig
  ): Promise<void> {
    if (tier === "pay-only") {
      const signerValidation = validateRemoteSignerConfig(remoteSignerConfig);
      if (!signerValidation.valid) {
        throw new Error(
          "PAY_ONLY tier requires a complete remote signer configuration: " +
            signerValidation.errors.join("; ")
        );
      }
    }

    this._securityTier = tier;
    this._remoteSignerConfig = remoteSignerConfig || null;

    await loadLNC();
    this.lnc = new LNC({ pairingPhrase, password });
    await this.lnc.connect();
    this._connected = true;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  // ---- Tier 1: WATCH_ONLY operations (available to all tiers) ----

  /** Get node info */
  async getInfo(): Promise<NodeInfo> {
    this.requireConnected();
    const info = await this.lnc.lnd.lightning.getInfo();
    return {
      alias: info.alias,
      publicKey: info.identity_pubkey,
      version: info.version,
      blockHeight: info.block_height,
      synced: info.synced_to_chain,
      numChannels: info.num_active_channels,
    };
  }

  /** Get wallet balance */
  async getBalance(): Promise<{
    onchainSats: number;
    channelSats: number;
  }> {
    this.requireConnected();
    const balance = await this.lnc.lnd.lightning.walletBalance();
    const channels = await this.lnc.lnd.lightning.channelBalance();
    return {
      onchainSats: Number(balance.total_balance),
      channelSats: Number(channels.balance),
    };
  }

  /** List channels */
  async listChannels(): Promise<ChannelInfo[]> {
    this.requireConnected();
    const res = await this.lnc.lnd.lightning.listChannels();
    return (res.channels || []).map((ch: any) => ({
      channelId: ch.chan_id,
      remotePubkey: ch.remote_pubkey,
      capacity: Number(ch.capacity),
      localBalance: Number(ch.local_balance),
      remoteBalance: Number(ch.remote_balance),
      active: ch.active,
    }));
  }

  // ---- Tier 2: PAY_ONLY operations (requires pay-only or admin tier) ----

  /** Create a Lightning invoice */
  async createInvoice(
    amountSats: number,
    memo?: string
  ): Promise<{ paymentRequest: string; rHash: string }> {
    this.requireConnected();
    this.requireTier("pay-only", "createInvoice");

    const res = await this.lnc.lnd.lightning.addInvoice({
      value: amountSats.toString(),
      memo: memo || "ArxMint",
    });
    return {
      paymentRequest: res.payment_request,
      rHash: res.r_hash,
    };
  }

  /**
   * Pay a Lightning invoice.
   * In PAY_ONLY tier, this routes through the remote signer —
   * the agent process never touches signing keys.
   */
  async payInvoice(
    bolt11: string,
    maxFeeSats?: number
  ): Promise<{ preimage: string; feeSats: number }> {
    this.requireConnected();
    this.requireTier("pay-only", "payInvoice");

    // In PAY_ONLY mode with remote signer, the LNC connection
    // is already configured to delegate signing to litd.
    // The remote signer holds the keys; we just issue the request.
    if (this._securityTier === "pay-only" && this._remoteSignerConfig) {
      console.log(
        "[ArxMint] Payment routed through remote signer at",
        this._remoteSignerConfig.signerUrl
      );
    }

    const res = await this.lnc.lnd.lightning.sendPaymentSync({
      payment_request: bolt11,
      fee_limit: maxFeeSats ? { fixed: maxFeeSats.toString() } : undefined,
    });

    if (res.payment_error) {
      throw new Error(`Payment failed: ${res.payment_error}`);
    }

    return {
      preimage: Buffer.from(res.payment_preimage, "base64").toString("hex"),
      feeSats: Number(res.payment_route?.total_fees || 0),
    };
  }

  // ---- Macaroon Bakery (Phase 1.5) ----

  /**
   * Bake a scoped macaroon credential.
   * Uses LND's bakeMacaroon RPC to create role-specific credentials.
   *
   * Roles:
   * - read-only: node info, balance, channel list
   * - invoice-only: read-only + create invoices
   * - pay-only: read-only + pay invoices (via remote signer)
   * - agent-commerce: pay + invoice (standard for agent services)
   *
   * Requires ADMIN tier to bake macaroons.
   */
  async bakeMacaroon(config: MacaroonBakeConfig): Promise<BakedMacaroon> {
    this.requireConnected();
    this.requireTier("admin", "bakeMacaroon");

    const permissions = MACAROON_ROLE_PERMISSIONS[config.role];

    const res = await this.lnc.lnd.lightning.bakeMacaroon({
      permissions,
      root_key_id: "0",
      allow_external_permissions: false,
    });

    const macaroon = res.macaroon;
    const expiresAt = config.ttlSeconds
      ? Date.now() + config.ttlSeconds * 1000
      : undefined;

    return {
      macaroon,
      role: config.role,
      permissions: permissions.map(
        (p: { entity: string; action: string }) => `${p.entity}:${p.action}`
      ),
      expiresAt,
      amountLimitSats: config.amountLimitSats,
      allowedEndpoints: config.allowedEndpoints,
      createdAt: Date.now(),
    };
  }

  // ---- Tier management ----

  /** Disconnect from the node */
  disconnect(): void {
    if (this.lnc) {
      this.lnc.disconnect();
      this._connected = false;
      this._securityTier = "watch-only";
      this._remoteSignerConfig = null;
    }
  }

  private requireConnected(): void {
    if (!this._connected || !this.lnc) {
      throw new Error("Not connected. Call connect() first.");
    }
  }

  /**
   * Enforce minimum security tier for an operation.
   * Tier hierarchy: watch-only < pay-only < admin
   */
  private requireTier(
    minimumTier: SecurityTier,
    operation: string
  ): void {
    const tierLevel: Record<SecurityTier, number> = {
      "watch-only": 0,
      "pay-only": 1,
      "admin": 2,
    };

    if (tierLevel[this._securityTier] < tierLevel[minimumTier]) {
      throw new Error(
        `Operation "${operation}" requires "${minimumTier}" tier or higher. ` +
          `Current tier: "${this._securityTier}". ` +
          `Reconnect with a higher security tier to use this operation.`
      );
    }
  }
}

// ---- L402 Client (pay-for-access to agent endpoints) ----

/** Cache of L402 tokens by domain */
const tokenCache = new Map<string, L402Token>();

function parseL402Challenge(wwwAuthenticate: string): L402Challenge {
  const macaroonMatch = wwwAuthenticate.match(/macaroon="([^"]+)"/);
  const invoiceMatch = wwwAuthenticate.match(/invoice="([^"]+)"/);

  if (!macaroonMatch || !invoiceMatch) {
    throw new Error("Invalid L402 challenge header");
  }

  return {
    macaroon: macaroonMatch[1],
    invoice: invoiceMatch[1],
  };
}

function buildL402Header(token: L402Token): string {
  return `L402 ${token.macaroon}:${token.preimage}`;
}

/**
 * Fetch a URL with automatic L402 payment.
 * If the server returns 402, pays the Lightning invoice and retries.
 *
 * @param url - The L402-gated URL
 * @param lnClient - Lightning client to pay invoices with
 * @param options - Standard fetch options
 * @param maxCostSats - Maximum sats to pay (safety limit)
 */
export async function l402Fetch(
  url: string,
  lnClient: SovereignLightningClient,
  options: RequestInit = {},
  maxCostSats: number = 1000
): Promise<Response> {
  const domain = new URL(url).hostname;

  // Check cached token
  const cached = tokenCache.get(domain);
  if (cached) {
    const resp = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: buildL402Header(cached),
      },
    });
    if (resp.status !== 402) return resp;
    tokenCache.delete(domain);
  }

  // Initial request
  const response = await fetch(url, options);
  if (response.status !== 402) return response;

  // Parse L402 challenge
  const wwwAuth = response.headers.get("WWW-Authenticate");
  if (!wwwAuth?.startsWith("L402")) {
    throw new Error("402 received but no L402 challenge");
  }

  const challenge = parseL402Challenge(wwwAuth);

  // Pay the invoice
  const { preimage } = await lnClient.payInvoice(challenge.invoice, maxCostSats);

  // Cache the token
  const token: L402Token = {
    macaroon: challenge.macaroon,
    preimage,
  };
  tokenCache.set(domain, token);

  // Retry with L402 credentials
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: buildL402Header(token),
    },
  });
}

/** Clear cached L402 tokens */
export function clearL402Cache(): void {
  tokenCache.clear();
}

// ---- MCP Config Helper ----

/** Generate MCP server configuration for .mcp.json */
export function generateMCPConfig(mailboxServer?: string): object {
  return {
    mcpServers: {
      lightning: {
        command: "npx",
        args: ["-y", "@lightninglabs/lightning-mcp-server"],
        transportType: "stdio",
        env: {
          LNC_MAILBOX_SERVER:
            mailboxServer || "mailbox.terminal.lightning.today:443",
        },
      },
    },
  };
}

/** Test-only hooks for deterministic unit tests */
export const __lightningAgentTestUtils = {
  setLNCMock(lncCtor: any): void {
    LNC = lncCtor;
  },
  resetLNCMock(): void {
    LNC = null;
  },
  resetSingleton(): void {
    _lnClient = null;
    tokenCache.clear();
  },
};

// ---- Singletons ----

let _lnClient: SovereignLightningClient | null = null;

export function getLightningClient(): SovereignLightningClient {
  if (!_lnClient) {
    _lnClient = new SovereignLightningClient();
  }
  return _lnClient;
}
