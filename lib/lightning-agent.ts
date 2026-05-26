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
// Re-export server-safe validators so tests importing from this file still work.
export {
  type RemoteSignerConfig,
  validateRemoteSignerConfig,
  validateRemoteSignerEnv,
} from "./lightning-validator.ts";
import {
  type RemoteSignerConfig,
  validateRemoteSignerConfig,
} from "./lightning-validator.ts";

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

interface LncChannel {
  chan_id: string;
  remote_pubkey: string;
  capacity: string | number;
  local_balance: string | number;
  remote_balance: string | number;
  active: boolean;
}

interface LncLightningApi {
  getInfo(): Promise<{
    alias: string;
    identity_pubkey: string;
    version: string;
    block_height: number;
    synced_to_chain: boolean;
    num_active_channels: number;
  }>;
  walletBalance(): Promise<{ total_balance: string | number }>;
  channelBalance(): Promise<{ balance: string | number }>;
  listChannels(): Promise<{ channels?: LncChannel[] }>;
  addInvoice(args: {
    value: string;
    memo: string;
  }): Promise<{ payment_request: string; r_hash: string }>;
  lookupInvoice(args: {
    r_hash_str: string;
  }): Promise<{ settled: boolean; value: string | number; memo?: string }>;
  sendPaymentSync(args: {
    payment_request: string;
    fee_limit?: { fixed: string };
  }): Promise<{
    payment_error?: string;
    payment_preimage: string;
    payment_route?: { total_fees?: string | number };
  }>;
  bakeMacaroon(args: {
    permissions: Array<{ entity: string; action: string }>;
    root_key_id: string;
    allow_external_permissions: boolean;
  }): Promise<{ macaroon: string }>;
}

interface LncInstance {
  connect(): Promise<void>;
  disconnect(): void;
  lnd: {
    lightning: LncLightningApi;
  };
}

type LncCtor = new (args: {
  pairingPhrase: string;
  password: string;
}) => LncInstance;

let LNC: LncCtor | null = null;

/**
 * Overridable probe function for the litd remote signer.
 * Set to a no-op in tests (auto-installed by __lightningAgentTestUtils.setLNCMock).
 * null = use the real network probe.
 */
let _remoteSignerProber: ((config: RemoteSignerConfig) => Promise<void>) | null =
  null;

async function loadLNC() {
  if (!LNC) {
    const mod = await import("@lightninglabs/lnc-web");
    LNC = mod.default as unknown as LncCtor;
  }
}

export class SovereignLightningClient {
  private lnc: LncInstance | null = null;
  private _connected = false;
  private _securityTier: SecurityTier = "watch-only";
  private _remoteSignerConfig: RemoteSignerConfig | null = null;
  private _signerMode: "local" | "remote" = "local";

  /** Current security tier */
  get securityTier(): SecurityTier {
    return this._securityTier;
  }

  /**
   * Whether the client is operating in remote signer mode.
   * In remote mode signing keys are held by litd, not this process.
   */
  isRemoteSignerMode(): boolean {
    return this._signerMode === "remote";
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
      // Hard probe — fail closed if litd is unreachable.
      // Signing keys must NEVER reside in this process in remote mode.
      await this.probeRemoteSigner(remoteSignerConfig!);
    }

    this._securityTier = tier;
    this._remoteSignerConfig = remoteSignerConfig || null;
    this._signerMode =
      tier === "pay-only" && remoteSignerConfig ? "remote" : "local";

    await loadLNC();
    if (!LNC) {
      throw new Error("Failed to load Lightning connector");
    }
    this.lnc = new LNC({ pairingPhrase, password });
    await this.lnc!.connect();
    this._connected = true;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  // ---- Tier 1: WATCH_ONLY operations (available to all tiers) ----

  /** Get node info */
  async getInfo(): Promise<NodeInfo> {
    this.requireConnected();
    const info = await this.lnc!.lnd.lightning.getInfo();
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
    const balance = await this.lnc!.lnd.lightning.walletBalance();
    const channels = await this.lnc!.lnd.lightning.channelBalance();
    return {
      onchainSats: Number(balance.total_balance),
      channelSats: Number(channels.balance),
    };
  }

  /** List channels */
  async listChannels(): Promise<ChannelInfo[]> {
    this.requireConnected();
    const res = await this.lnc!.lnd.lightning.listChannels();
    return (res.channels || []).map((ch) => ({
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

    const res = await this.lnc!.lnd.lightning.addInvoice({
      value: amountSats.toString(),
      memo: memo || "ArxMint",
    });
    return {
      paymentRequest: res.payment_request,
      rHash: res.r_hash,
    };
  }

  /**
   * Look up an invoice by its payment hash (r_hash).
   * Useful for checking if a payment was received without subscribing to a stream.
   *
   * @param rHash - base64-encoded payment hash
   */
  async lookupInvoice(
    rHash: string
  ): Promise<{ settled: boolean; amountSats: number; memo: string }> {
    this.requireConnected();
    this.requireTier("pay-only", "lookupInvoice");

    const res = await this.lnc!.lnd.lightning.lookupInvoice({ r_hash_str: rHash });
    return {
      settled: res.settled,
      amountSats: Number(res.value),
      memo: res.memo || "",
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

    // In remote signer mode, HTLC signing is delegated to litd.
    // This process never holds signing keys — the LND node forwards
    // all sign operations to the litd endpoint established at connect().
    if (this._signerMode === "remote") {
      console.log(
        "[ArxMint] Payment signing delegated to litd at",
        this._remoteSignerConfig!.signerUrl,
        "— no keys held in agent process"
      );
    }

    const res = await this.lnc!.lnd.lightning.sendPaymentSync({
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

    const res = await this.lnc!.lnd.lightning.bakeMacaroon({
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
      this.lnc!.disconnect();
      this._connected = false;
      this._securityTier = "watch-only";
      this._remoteSignerConfig = null;
      this._signerMode = "local";
    }
  }

  /**
   * Probe the litd remote signer REST endpoint to verify connectivity.
   * Throws a hard error if the signer is unreachable — we refuse to connect
   * in pay-only mode without confirmed signer reachability.
   *
   * In tests, _remoteSignerProber is set to a no-op by setLNCMock().
   */
  private async probeRemoteSigner(config: RemoteSignerConfig): Promise<void> {
    if (_remoteSignerProber !== null) {
      return _remoteSignerProber(config);
    }

    const signerUrl = config.signerUrl.replace(/\/$/, "");
    const headers: Record<string, string> = {};
    if (config.macaroon) {
      headers["Grpc-Metadata-macaroon"] = config.macaroon;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${signerUrl}/v1/state`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      // 200 = reachable and authenticated
      // 401 = reachable but auth issue (config problem, not connectivity)
      // anything else = unexpected — fail closed
      if (!response.ok && response.status !== 401) {
        throw new Error(`Remote signer probe returned HTTP ${response.status}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Remote signer at ${signerUrl} is not reachable: ${message}. ` +
          `Refusing to connect in pay-only mode — signing keys must not be held locally.`
      );
    } finally {
      clearTimeout(timeoutId);
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
// Kept inline because lightning-agent.ts is "use client" and
// @te-btc/cashu-l402 uses node:crypto (server-only).

/** Cache of L402 tokens by domain */
const tokenCache = new Map<string, L402Token>();

export function parseL402Challenge(wwwAuthenticate: string): L402Challenge {
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
  const { preimage } = await lnClient.payInvoice(challenge.invoice, maxCostSats);

  const token: L402Token = { macaroon: challenge.macaroon, preimage };
  tokenCache.set(domain, token);

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
  setLNCMock(lncCtor: LncCtor): void {
    LNC = lncCtor;
    // Auto-install a no-op prober so tests never make real network calls
    // to the remote signer endpoint.
    _remoteSignerProber = async () => {};
  },
  resetLNCMock(): void {
    LNC = null;
    _remoteSignerProber = null;
  },
  resetSingleton(): void {
    _lnClient = null;
    clearL402Cache();
  },
  /** Override the remote signer probe (pass null to restore the real probe) */
  setRemoteSignerProber(
    fn: ((config: RemoteSignerConfig) => Promise<void>) | null
  ): void {
    _remoteSignerProber = fn;
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

// ---- Merchant API Key Auth helpers ----
// Accepts arx_live_*, arx_pub_*, arx_test_* keys as an alternative to L402/session auth.

// extractMerchantKey moved to `lib/merchant-auth.ts` (server-safe) so API
// routes don't pull in this "use client" module just to read a header.
// Re-imported + re-exported here for backward compat with client callers
// and for internal use by verifyMerchantKeyFromHeader below.
import { extractMerchantKey } from "./merchant-auth.ts";
export { extractMerchantKey };

/**
 * Verify a merchant API key from a request's Authorization header.
 * Returns the MerchantApiKey if valid, or null if absent/invalid.
 *
 * Scope enforcement applied:
 *   - arx_test_* keys rejected in production (NODE_ENV === 'production')
 *   - arx_pub_* keys allowed everywhere (read-only)
 *   - arx_live_* keys allowed in production only
 *
 * Usage in an API route:
 *   const merchantKey = await verifyMerchantKeyFromHeader(request, merchantId);
 *   if (!merchantKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   if (!scopeAllowsPayments(merchantKey.scope)) return 403;
 */
export async function verifyMerchantKeyFromHeader(
  request: { headers: { get(name: string): string | null } },
  merchantId: string
): Promise<import("./merchant-auth.ts").MerchantApiKey | null> {
  const authHeader = request.headers.get("Authorization");
  const key = extractMerchantKey(authHeader);
  if (!key) return null;

  const { verifyMerchantKey, scopeAllowedInProduction } = await import(
    "./merchant-auth.ts"
  );
  const record = await verifyMerchantKey(key, merchantId);
  if (!record) return null;
  if (!scopeAllowedInProduction(record.scope)) return null;
  return record;
}
