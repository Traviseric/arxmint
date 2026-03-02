"use client";

// ============================================================
// ArxMint — Ark SDK Wrapper
// Ark provides off-chain VTXOs for high-privacy Bitcoin spends.
// Bridges ecash ↔ on-chain via Ark Server (arkd).
//
// Source: Doc 4 — Ark protocol, privacy-aware spend routing
// SDK: @arkade-os/sdk (when available — stub until then)
//
// VTXO lifecycle:
//   1. Board: lock sats on-chain into an Ark round
//   2. Spend: off-chain VTXO transfers (instant, private)
//   3. Unilateral exit: on-chain sweep if Ark Server goes offline
// ============================================================

/** Ark VTXO (Virtual Transaction Output) */
export interface VTXO {
  id: string;
  amountSats: number;
  /** Round ID this VTXO belongs to */
  roundId: string;
  /** Expiry block height (must refresh before expiry) */
  expiryBlock: number;
  /** Whether this VTXO has been spent */
  spent: boolean;
  createdAt: number;
}

/** Ark server connection config */
export interface ArkServerConfig {
  /** Ark server (arkd) URL */
  serverUrl: string;
  /** Bitcoin network */
  network: "bitcoin" | "testnet" | "signet" | "regtest";
}

/** Ark connection status */
export interface ArkStatus {
  connected: boolean;
  serverUrl: string;
  /** Current round info */
  currentRound?: {
    id: string;
    /** Seconds until next round closes */
    secondsUntilClose: number;
  };
  /** Network the server is on */
  network?: string;
}

export class SovereignArkClient {
  private _config: ArkServerConfig | null = null;
  private _connected = false;
  private _vtxos: VTXO[] = [];

  get isConnected(): boolean {
    return this._connected;
  }

  get balance(): number {
    return this._vtxos
      .filter((v) => !v.spent)
      .reduce((sum, v) => sum + v.amountSats, 0);
  }

  get vtxos(): VTXO[] {
    return this._vtxos.filter((v) => !v.spent);
  }

  /**
   * Connect to an Ark server.
   * In production, this would use @arkade-os/sdk.
   * Currently a structured stub that validates the connection.
   *
   * - Network unreachable (TypeError / AbortError): returns { connected: false }, sets _connected = false
   * - HTTP error (4xx / 5xx): throws so callers know the server is unhealthy
   * - Success: returns { connected: true }, sets _connected = true
   */
  async connect(config: ArkServerConfig): Promise<ArkStatus> {
    this._config = config;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${config.serverUrl}/v1/info`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        // Server is reachable but returned an error — not a stub fallback scenario
        throw new Error(
          `Ark server error: HTTP ${response.status} from ${config.serverUrl}`
        );
      }

      const info = await response.json();
      this._connected = true;
      return {
        connected: true,
        serverUrl: config.serverUrl,
        currentRound: info.current_round
          ? {
              id: info.current_round.id,
              secondsUntilClose: info.current_round.seconds_until_close,
            }
          : undefined,
        network: info.network,
      };
    } catch (err) {
      // Only fall back to stub mode for network errors (server unreachable)
      if (
        err instanceof TypeError ||
        (err as Error).name === "AbortError"
      ) {
        console.warn(
          "[ArkSDK] Server unreachable, running in stub mode:",
          config.serverUrl
        );
        this._connected = false;
        return {
          connected: false,
          serverUrl: config.serverUrl,
          network: config.network,
        };
      }
      // HTTP errors or other unexpected errors — re-throw
      throw err;
    }
  }

  /**
   * Board sats into Ark — creates a VTXO by locking on-chain funds.
   * The boarding transaction is confirmed on-chain, then the VTXO
   * can be spent off-chain through Ark rounds.
   */
  async board(amountSats: number): Promise<VTXO> {
    this.requireConnected();

    const vtxo: VTXO = {
      id: `vtxo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      amountSats,
      roundId: `round_${Date.now().toString(36)}`,
      expiryBlock: 0, // Set by server in production
      spent: false,
      createdAt: Date.now(),
    };

    this._vtxos.push(vtxo);
    return vtxo;
  }

  /**
   * Spend a VTXO off-chain to another Ark user.
   * This is instant and private — no on-chain footprint.
   */
  async spend(
    amountSats: number,
    _recipientPubkey: string
  ): Promise<{ vtxoId: string; change?: VTXO }> {
    this.requireConnected();

    // Find a VTXO with enough balance
    const source = this._vtxos.find(
      (v) => !v.spent && v.amountSats >= amountSats
    );
    if (!source) {
      throw new Error(
        `Insufficient Ark balance. Need ${amountSats} sats, have ${this.balance} sats.`
      );
    }

    // Mark source as spent
    source.spent = true;

    // Create change VTXO if needed
    const changeAmount = source.amountSats - amountSats;
    let change: VTXO | undefined;
    if (changeAmount > 0) {
      change = {
        id: `vtxo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        amountSats: changeAmount,
        roundId: source.roundId,
        expiryBlock: source.expiryBlock,
        spent: false,
        createdAt: Date.now(),
      };
      this._vtxos.push(change);
    }

    return { vtxoId: source.id, change };
  }

  /**
   * Bridge from Ark to on-chain (collaborative exit).
   * Faster than unilateral exit — Ark server co-signs.
   */
  async bridge(
    amountSats: number,
    _onchainAddress: string
  ): Promise<{ txid: string }> {
    this.requireConnected();

    const source = this._vtxos.find(
      (v) => !v.spent && v.amountSats >= amountSats
    );
    if (!source) {
      throw new Error(
        `Insufficient Ark balance for bridge. Need ${amountSats} sats.`
      );
    }

    source.spent = true;

    // In production, this would create a collaborative exit transaction
    return {
      txid: `bridge_${Date.now().toString(36)}`,
    };
  }

  /**
   * Refresh VTXOs — extend expiry before they expire on-chain.
   * Must be done periodically to prevent unilateral exit timeout.
   */
  async refresh(): Promise<number> {
    this.requireConnected();

    let refreshed = 0;
    for (const vtxo of this._vtxos) {
      if (!vtxo.spent) {
        vtxo.expiryBlock += 4032; // ~4 weeks of blocks
        refreshed++;
      }
    }
    return refreshed;
  }

  /** Disconnect from the Ark server */
  disconnect(): void {
    this._connected = false;
    this._config = null;
    this._vtxos = [];
  }

  private requireConnected(): void {
    if (!this._connected || !this._config) {
      throw new Error("Not connected to Ark server. Call connect() first.");
    }
  }
}

// ---- Docker Compose Addition ----

/**
 * Generate arkd Docker service configuration.
 * Added to community Docker compose when Ark is enabled.
 */
export function generateArkdDockerService(
  communityId: string,
  network: string
): string {
  return `
  # === Ark Server (VTXO off-chain layer) ===
  arkd:
    image: arkade/arkd:latest
    container_name: arx-arkd-${communityId}
    restart: unless-stopped
    environment:
      - ARK_NETWORK=${network}
      - ARK_ROUND_INTERVAL=10
      - ARK_ROUND_LIFETIME=604800
      - ARK_BITCOIND_RPC_HOST=lnd
      - ARK_LOG_LEVEL=info
    ports:
      - "7070:7070"
    volumes:
      - arkd-data:/data
      - lnd-data:/root/.lnd:ro
    depends_on:
      - lnd
    networks:
      - sovereign`;
}

// ---- Singleton ----

let _arkClient: SovereignArkClient | null = null;

export function getArkClient(): SovereignArkClient {
  if (!_arkClient) {
    _arkClient = new SovereignArkClient();
  }
  return _arkClient;
}
