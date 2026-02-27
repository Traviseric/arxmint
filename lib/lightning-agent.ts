"use client";

// ============================================================
// ArxMint — Lightning Agent Integration
// Uses @lightninglabs/lnc-web for direct node access
// + L402 client for agent commerce paywalls
// ============================================================

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

  /** Connect to a Lightning node via LNC pairing phrase */
  async connect(pairingPhrase: string, password: string): Promise<void> {
    await loadLNC();
    this.lnc = new LNC({ pairingPhrase, password });
    await this.lnc.connect();
    this._connected = true;
  }

  get isConnected(): boolean {
    return this._connected;
  }

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

  /** Create a Lightning invoice */
  async createInvoice(
    amountSats: number,
    memo?: string
  ): Promise<{ paymentRequest: string; rHash: string }> {
    this.requireConnected();
    const res = await this.lnc.lnd.lightning.addInvoice({
      value: amountSats.toString(),
      memo: memo || "ArxMint",
    });
    return {
      paymentRequest: res.payment_request,
      rHash: res.r_hash,
    };
  }

  /** Pay a Lightning invoice */
  async payInvoice(
    bolt11: string,
    maxFeeSats?: number
  ): Promise<{ preimage: string; feeSats: number }> {
    this.requireConnected();
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

  /** Disconnect from the node */
  disconnect(): void {
    if (this.lnc) {
      this.lnc.disconnect();
      this._connected = false;
    }
  }

  private requireConnected(): void {
    if (!this._connected || !this.lnc) {
      throw new Error("Not connected. Call connect() first.");
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

// ---- Singletons ----

let _lnClient: SovereignLightningClient | null = null;

export function getLightningClient(): SovereignLightningClient {
  if (!_lnClient) {
    _lnClient = new SovereignLightningClient();
  }
  return _lnClient;
}
