"use client";

import { bech32m } from "@scure/base";

// ============================================================
// ArxMint — Silent Payments Infrastructure
// BIP-352 Silent Payments for non-interactive address reuse
// prevention on on-chain transactions.
//
// Source: Doc 5 — SP infrastructure, scan key delegation
//
// Architecture:
//   - silent-pay-indexer: Docker service that scans the chain
//   - Scan key delegation: scan key on hot device, spend key cold
//   - Feature flags: ARXMINT_SP_ENABLED, ARXMINT_SP_SCAN_MODE
//
// SP address format: sp1q... (mainnet), tsp1q... (testnet/signet)
// ============================================================

/** Silent Payment address (sp1q / tsp1q) */
export interface SPAddress {
  /** Full SP address string */
  address: string;
  /** Network this address belongs to */
  network: "bitcoin" | "testnet" | "signet" | "regtest";
  /** Scan public key (hex) */
  scanPubKey: string;
  /** Spend public key (hex) */
  spendPubKey: string;
}

/** SP indexer configuration */
export interface SPIndexerConfig {
  /** URL of the silent-pay-indexer service */
  indexerUrl: string;
  /** Bitcoin network */
  network: "bitcoin" | "testnet" | "signet" | "regtest";
  /** Scan mode: full (own node) or light (via indexer) */
  scanMode: "full" | "light";
}

/** SP scan state — persisted between scans */
export interface SPScanState {
  /** Last block height that was scanned */
  lastScannedHeight: number;
  /** Timestamp of last scan */
  lastScanTimestamp: number;
  /** Number of outputs found */
  outputsFound: number;
  /** Whether a scan is currently in progress */
  scanning: boolean;
}

/** Detected SP output (incoming payment) */
export interface SPOutput {
  /** Transaction ID */
  txid: string;
  /** Output index */
  vout: number;
  /** Amount in sats */
  amountSats: number;
  /** Block height where this was confirmed */
  blockHeight: number;
  /** Whether this output has been spent */
  spent: boolean;
  /** Timestamp */
  timestamp: number;
}

/** SP key pair for delegation */
export interface SPKeyPair {
  /** Scan key — can be on a hot device for detecting payments */
  scanKey: {
    public: string;
    /** Private scan key — hot, used for scanning */
    private?: string;
  };
  /** Spend key — should be kept cold/offline */
  spendKey: {
    public: string;
    /** Private spend key — COLD, only needed to spend */
    private?: string;
  };
}

// ---- SP Address Parsing ----

/** SP address HRP (human-readable part) by network, used for Bech32m decode/encode */
const SP_PREFIX: Record<string, string> = {
  bitcoin: "sp",
  testnet: "tsp",
  signet: "tsp",
  regtest: "tsp",
};

/**
 * Validate and parse a Silent Payment address.
 * SP addresses encode both the scan and spend public keys.
 */
export function parseSPAddress(address: string): SPAddress {
  const lower = address.toLowerCase();

  let network: SPAddress["network"];
  if (lower.startsWith("sp1q")) {
    network = "bitcoin";
  } else if (lower.startsWith("tsp1q")) {
    network = "testnet"; // Could also be signet/regtest
  } else {
    throw new Error(
      `Invalid Silent Payment address: must start with "sp1q" (mainnet) or "tsp1q" (testnet). Got: "${address.slice(0, 10)}..."`
    );
  }

  // BIP-352 Bech32m decoding (BIP-350/352)
  const hrp = SP_PREFIX[network];
  let decoded: { prefix: string; words: Uint8Array };
  try {
    decoded = bech32m.decode(address, 128); // 128-char limit covers SP address max length
  } catch (err) {
    throw new Error(`Invalid Silent Payment address — Bech32m decode failed: ${err}`);
  }
  if (decoded.prefix !== hrp) {
    throw new Error(`Address prefix mismatch: expected '${hrp}', got '${decoded.prefix}'`);
  }

  const data = bech32m.fromWords(decoded.words);
  // BIP-352: version (1 byte) + scan key (33 bytes) + spend key (33 bytes) = 67 bytes minimum
  if (data.length < 67) {
    throw new Error(`Silent Payment address data too short: ${data.length} bytes (expected ≥67)`);
  }
  const version = data[0];
  if (version !== 0) {
    throw new Error(`Unsupported Silent Payment address version: ${version}`);
  }
  const scanPubKey = Array.from(data.slice(1, 34)).map(b => b.toString(16).padStart(2, "0")).join("");
  const spendPubKey = Array.from(data.slice(34, 67)).map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    address,
    network,
    scanPubKey,
    spendPubKey,
  };
}

/**
 * Check if a string is a valid Silent Payment address.
 */
export function isSPAddress(address: string): boolean {
  try {
    parseSPAddress(address);
    return true;
  } catch {
    return false;
  }
}

// ---- SP Scan Scheduling ----

/**
 * Silent Payments scanner.
 * Coordinates with the silent-pay-indexer Docker service
 * to detect incoming SP payments.
 */
export class SPScanner {
  private _config: SPIndexerConfig;
  private _scanState: SPScanState;
  private _outputs: SPOutput[] = [];
  private _scanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: SPIndexerConfig) {
    this._config = config;
    this._scanState = {
      lastScannedHeight: 0,
      lastScanTimestamp: 0,
      outputsFound: 0,
      scanning: false,
    };
  }

  get scanState(): SPScanState {
    return { ...this._scanState };
  }

  get outputs(): SPOutput[] {
    return [...this._outputs];
  }

  get balance(): number {
    return this._outputs
      .filter((o) => !o.spent)
      .reduce((sum, o) => sum + o.amountSats, 0);
  }

  /** Restore scan state from persistent storage */
  restoreState(): void {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("arxmint_sp_scan_state");
    if (stored) {
      try {
        this._scanState = JSON.parse(stored);
      } catch {
        // Ignore corrupt state
      }
    }
    const outputs = localStorage.getItem("arxmint_sp_outputs");
    if (outputs) {
      try {
        this._outputs = JSON.parse(outputs);
      } catch {
        // Ignore corrupt outputs
      }
    }
  }

  /** Persist scan state */
  private persistState(): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "arxmint_sp_scan_state",
      JSON.stringify(this._scanState)
    );
    localStorage.setItem(
      "arxmint_sp_outputs",
      JSON.stringify(this._outputs)
    );
  }

  /**
   * Perform a single scan cycle.
   * Queries the indexer for new SP outputs since lastScannedHeight.
   */
  async scan(scanKey: string): Promise<SPOutput[]> {
    if (this._scanState.scanning) return [];

    this._scanState.scanning = true;
    const newOutputs: SPOutput[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${this._config.indexerUrl}/api/v1/scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scan_key: scanKey,
            from_height: this._scanState.lastScannedHeight,
            network: this._config.network,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        for (const output of data.outputs || []) {
          const spOutput: SPOutput = {
            txid: output.txid,
            vout: output.vout,
            amountSats: output.amount_sats,
            blockHeight: output.block_height,
            spent: false,
            timestamp: output.timestamp || Date.now(),
          };
          newOutputs.push(spOutput);
          this._outputs.push(spOutput);
        }
        this._scanState.lastScannedHeight = data.tip_height || this._scanState.lastScannedHeight;
      }
    } catch {
      // Indexer not reachable — silent fail for development
      console.warn("[ArxMint] SP indexer not reachable at", this._config.indexerUrl);
    }

    this._scanState.scanning = false;
    this._scanState.lastScanTimestamp = Date.now();
    this._scanState.outputsFound += newOutputs.length;
    this.persistState();

    return newOutputs;
  }

  /**
   * Start periodic scanning.
   * Scans every `intervalMs` milliseconds.
   */
  startPeriodicScan(scanKey: string, intervalMs: number = 60_000): void {
    this.stopPeriodicScan();
    // Initial scan
    this.scan(scanKey);
    // Periodic
    this._scanTimer = setInterval(() => {
      this.scan(scanKey);
    }, intervalMs);
  }

  /** Stop periodic scanning */
  stopPeriodicScan(): void {
    if (this._scanTimer) {
      clearInterval(this._scanTimer);
      this._scanTimer = null;
    }
  }
}

// ---- Scan Key Delegation ----

/**
 * Generate a delegated scan key configuration.
 * The scan key can live on a hot device (mobile/desktop) to detect
 * incoming payments, while the spend key stays cold (hardware wallet).
 *
 * This is the key insight from Doc 5: you can delegate the scanning
 * responsibility without exposing spending authority.
 */
export function createScanKeyDelegation(keyPair: SPKeyPair): {
  hotConfig: { scanPrivateKey: string; scanPublicKey: string; spendPublicKey: string };
  coldConfig: { spendPublicKey: string; warning: string };
} {
  if (!keyPair.scanKey.private) {
    throw new Error("Scan private key required for delegation");
  }

  return {
    hotConfig: {
      scanPrivateKey: keyPair.scanKey.private,
      scanPublicKey: keyPair.scanKey.public,
      spendPublicKey: keyPair.spendKey.public,
    },
    coldConfig: {
      spendPublicKey: keyPair.spendKey.public,
      warning:
        "Spend key is NOT included in the hot config. " +
        "Keep it on your hardware wallet or cold storage.",
    },
  };
}

// ---- Docker Service Generation ----

/**
 * Generate the silent-pay-indexer Docker service for community Docker compose.
 */
export function generateSPIndexerDockerService(
  communityId: string,
  network: string
): string {
  return `
  # === Silent Payments Indexer ===
  sp-indexer:
    image: silentpayments/indexer:latest
    container_name: arx-sp-indexer-${communityId}
    restart: unless-stopped
    environment:
      - SP_NETWORK=${network}
      - SP_BITCOIN_RPC_HOST=lnd
      - SP_BITCOIN_RPC_PORT=8080
      - SP_INDEX_FROM_HEIGHT=0
      - SP_LOG_LEVEL=info
      - SP_API_HOST=0.0.0.0
      - SP_API_PORT=8100
    ports:
      - "8100:8100"
    volumes:
      - sp-indexer-data:/data
      - lnd-data:/root/.lnd:ro
    depends_on:
      - lnd
    networks:
      - sovereign`;
}

// ---- Feature Flag Helpers ----

/** Check if Silent Payments are enabled via env/config */
export function isSPEnabled(): boolean {
  if (typeof process !== "undefined" && process.env) {
    return process.env.ARXMINT_SP_ENABLED === "true";
  }
  if (typeof window !== "undefined") {
    return localStorage.getItem("arxmint_sp_enabled") === "true";
  }
  return false;
}

/** Get SP scan mode from env/config */
export function getSPScanMode(): "full" | "light" {
  if (typeof process !== "undefined" && process.env?.ARXMINT_SP_SCAN_MODE) {
    return process.env.ARXMINT_SP_SCAN_MODE as "full" | "light";
  }
  return "light";
}

/** Get SP indexer URL from env/config */
export function getSPIndexerUrl(): string {
  if (typeof process !== "undefined" && process.env?.ARXMINT_SP_INDEXER_URL) {
    return process.env.ARXMINT_SP_INDEXER_URL;
  }
  return "http://localhost:8100";
}

/** Create a configured SP scanner from environment */
export function createSPScanner(
  network: "bitcoin" | "testnet" | "signet" | "regtest" = "testnet"
): SPScanner {
  return new SPScanner({
    indexerUrl: getSPIndexerUrl(),
    network,
    scanMode: getSPScanMode(),
  });
}

// ============================================================
// Hardware Wallet Support — BIP392/BIP376 (Phase 3.4)
//
// SP output descriptors (BIP392) and PSBT extensions (BIP376)
// for hardware signing devices.
//
// Source: Doc 5 — hardware wallet support for Silent Payments
// ============================================================

/** BIP392 SP output descriptor */
export interface SPDescriptor {
  /** Descriptor string (e.g., "sp(KEY_SCAN,KEY_SPEND)") */
  descriptor: string;
  /** Network */
  network: "bitcoin" | "testnet" | "signet" | "regtest";
  /** Scan key origin (derivation path) */
  scanKeyOrigin: string;
  /** Spend key origin (derivation path) */
  spendKeyOrigin: string;
  /** Checksum */
  checksum: string;
}

/** PSBT field for SP (BIP376) */
export interface SPPSBTField {
  /** PSBT global field: SP scan data */
  scanData: {
    /** Outpoints being spent (for tweak computation) */
    outpoints: Array<{ txid: string; vout: number }>;
    /** Scan public key */
    scanPubKey: string;
  };
  /** PSBT per-output field: SP output info */
  outputInfo: {
    /** Recipient SP address */
    recipientAddress: string;
    /** Computed output public key (after ECDH) */
    outputPubKey: string;
    /** Tweak value used */
    tweak: string;
  };
}

/** Hardware wallet device type */
export type HWWalletType = "coldcard" | "bitbox02" | "ledger" | "trezor" | "seedsigner" | "jade" | "generic";

/** Hardware wallet capability for SP */
export interface HWWalletSPCapability {
  device: HWWalletType;
  /** Whether the device supports BIP352 Silent Payments */
  supportsSP: boolean;
  /** Whether the device supports BIP392 descriptors */
  supportsBIP392: boolean;
  /** Whether the device supports BIP376 PSBT extension */
  supportsBIP376: boolean;
  /** Whether the device can perform scan key delegation */
  supportsScanDelegation: boolean;
  /** Notes on support status */
  notes: string;
}

/** Known hardware wallet SP support status */
const HW_WALLET_SP_STATUS: HWWalletSPCapability[] = [
  {
    device: "coldcard",
    supportsSP: false,
    supportsBIP392: false,
    supportsBIP376: false,
    supportsScanDelegation: false,
    notes: "SP support pending — track ColdCard firmware updates",
  },
  {
    device: "bitbox02",
    supportsSP: false,
    supportsBIP392: false,
    supportsBIP376: false,
    supportsScanDelegation: false,
    notes: "BitBox team tracking BIP352 — not yet implemented",
  },
  {
    device: "ledger",
    supportsSP: false,
    supportsBIP392: false,
    supportsBIP376: false,
    supportsScanDelegation: false,
    notes: "No SP support announced",
  },
  {
    device: "trezor",
    supportsSP: false,
    supportsBIP392: false,
    supportsBIP376: false,
    supportsScanDelegation: false,
    notes: "No SP support announced",
  },
  {
    device: "seedsigner",
    supportsSP: false,
    supportsBIP392: false,
    supportsBIP376: false,
    supportsScanDelegation: false,
    notes: "Air-gapped — would need PSBT-based SP signing (BIP376)",
  },
  {
    device: "jade",
    supportsSP: false,
    supportsBIP392: false,
    supportsBIP376: false,
    supportsScanDelegation: false,
    notes: "Blockstream Jade — SP support pending upstream",
  },
];

/** Get SP support status for a hardware wallet */
export function getHWWalletSPSupport(device: HWWalletType): HWWalletSPCapability {
  return (
    HW_WALLET_SP_STATUS.find((hw) => hw.device === device) || {
      device,
      supportsSP: false,
      supportsBIP392: false,
      supportsBIP376: false,
      supportsScanDelegation: false,
      notes: "Unknown device — SP support status unknown",
    }
  );
}

/** Get all hardware wallets with their SP support status */
export function getAllHWWalletSPSupport(): HWWalletSPCapability[] {
  return [...HW_WALLET_SP_STATUS];
}

/**
 * Generate a BIP392 SP output descriptor.
 * Used by hardware wallets to derive SP addresses.
 *
 * Format: sp(KEY_SCAN, KEY_SPEND)
 * Where keys are extended public keys with derivation paths.
 */
export function generateSPDescriptor(
  scanXpub: string,
  spendXpub: string,
  scanPath: string = "m/352'/0'/0'/1'/0",
  spendPath: string = "m/352'/0'/0'/0'/0",
  network: "bitcoin" | "testnet" | "signet" | "regtest" = "testnet"
): SPDescriptor {
  const descriptor = `sp([${scanPath}]${scanXpub},[${spendPath}]${spendXpub})`;

  // Simple checksum (in production, use BIP380 descriptor checksum)
  let checksum = 0;
  for (let i = 0; i < descriptor.length; i++) {
    checksum = ((checksum << 5) ^ descriptor.charCodeAt(i)) & 0xffffffff;
  }
  const checksumStr = Math.abs(checksum).toString(16).slice(0, 8);

  return {
    descriptor: `${descriptor}#${checksumStr}`,
    network,
    scanKeyOrigin: scanPath,
    spendKeyOrigin: spendPath,
    checksum: checksumStr,
  };
}

/**
 * Build a PSBT with SP output fields (BIP376).
 * Used when sending to an SP address via hardware wallet.
 *
 * The PSBT includes:
 * - Global: outpoints being spent (needed for ECDH tweak)
 * - Per-output: recipient SP address + computed output key
 */
export function buildSPPSBTFields(
  recipientAddress: string,
  outpoints: Array<{ txid: string; vout: number }>,
  _scanPubKey: string
): SPPSBTField {
  // In production, compute ECDH shared secret and derive output key.
  // parseSPAddress() decodes BIP-352 Bech32m addresses via @scure/base.
  let parsed: SPAddress;
  try {
    parsed = parseSPAddress(recipientAddress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ArxMint] buildSPPSBTFields: cannot parse SP address —', msg);
    throw new Error(`buildSPPSBTFields: SP address parsing failed — ${msg}`);
  }

  return {
    scanData: {
      outpoints,
      scanPubKey: parsed.scanPubKey,
    },
    outputInfo: {
      recipientAddress,
      // Placeholder: in production, this is ECDH(scanKey, sum(inputPrivKeys)) * G + spendKey
      outputPubKey: parsed.spendPubKey,
      tweak: "0".repeat(64), // Placeholder tweak
    },
  };
}

/**
 * Validate that a PSBT contains valid SP fields.
 * Used before signing to ensure the hardware wallet can process it.
 */
export function validateSPPSBT(psbtFields: SPPSBTField): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!psbtFields.scanData.outpoints.length) {
    errors.push("PSBT missing outpoints for SP tweak computation");
  }

  if (!psbtFields.scanData.scanPubKey) {
    errors.push("PSBT missing scan public key");
  }

  if (!psbtFields.outputInfo.recipientAddress) {
    errors.push("PSBT missing recipient SP address");
  }

  if (!isSPAddress(psbtFields.outputInfo.recipientAddress)) {
    errors.push("PSBT recipient is not a valid SP address");
  }

  if (!psbtFields.outputInfo.outputPubKey) {
    errors.push("PSBT missing computed output public key");
  }

  return { valid: errors.length === 0, errors };
}
