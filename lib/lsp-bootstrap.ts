// ============================================================
// ArxMint — LSP Liquidity Bootstrap
// JIT channel opening via LSPS1/LSPS2 for merchant nodes.
//
// New merchants have zero inbound capacity after deploy.
// This module requests a channel from a configured LSP so
// they can receive their first Lightning payment.
//
// Env vars:
//   LSP_URL            — LSP endpoint (default: Voltage testnet)
//   LSP_TOKEN          — Optional bearer token for authenticated LSPs
//   BITCOIN_NETWORK    — testnet | signet | bitcoin
// ============================================================

import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────

export interface LSPConfig {
  url: string;
  token?: string;
  minChannelSats: number;
  maxChannelSats: number;
  feeRatePpm: number;
}

export interface JITChannelRequest {
  nodeId: string;
  host?: string;
  amountSats: number;
  lspConfig?: Partial<LSPConfig>;
}

export type ChannelStatus =
  | "pending"
  | "opening"
  | "active"
  | "failed"
  | "not_started";

export interface ChannelState {
  status: ChannelStatus;
  channelId?: string;
  txid?: string;
  inboundSats?: number;
  lspNodeId?: string;
  message: string;
  updatedAt: number;
}

export interface LSPBootstrapResult {
  success: boolean;
  channelState: ChannelState;
  skipped?: boolean;
  skipReason?: string;
  manualInstructions?: string[];
}

// ── Default config ───────────────────────────────────────────

const DEFAULT_LSP_CONFIG: LSPConfig = {
  url: process.env.LSP_URL ?? "https://lsp.voltage.cloud",
  token: process.env.LSP_TOKEN,
  minChannelSats: 100_000,
  maxChannelSats: 10_000_000,
  feeRatePpm: 1000,
};

// ── Manual instructions fallback ─────────────────────────────

function manualLiquidityInstructions(nodeId?: string): string[] {
  return [
    "To get inbound Lightning liquidity manually:",
    "  1. Find an LSP: https://lsp.dev/ or https://amboss.space/magma",
    "  2. Connect to their node and request a channel open",
    "  3. Alternatively, use Voltage Cloud: https://voltage.cloud",
    ...(nodeId ? [`  4. Your node ID: ${nodeId}`] : []),
    "  5. Or ask a peer to open a channel to you",
    "  6. Once the channel confirms (~10 min), you can receive payments",
  ];
}

// ── LSPS1: Channel request ────────────────────────────────────
// LSPS1 is a JSON-RPC protocol for requesting channel opens.
// POST to {lsp}/v1/channel/open with node_id + amount.

async function requestLSPS1Channel(
  config: LSPConfig,
  nodeId: string,
  host: string | undefined,
  amountSats: number
): Promise<{ channelId: string; txid?: string; lspNodeId?: string } | null> {
  const url = `${config.url}/v1/channel/open`;

  const body = {
    node_id: nodeId,
    ...(host && { host }),
    local_balance: amountSats,
    channel_expiry_blocks: 144 * 30, // ~30 days
    token: config.token ?? "",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.token && { Authorization: `Bearer ${config.token}` }),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("lsp_lsps1_request_failed", {
        status: res.status,
        body: text.slice(0, 200),
        action: "lsp_lsps1_request_failed",
      });
      return null;
    }

    const data = (await res.json()) as {
      channel_id?: string;
      funding_txid?: string;
      lsp_node_id?: string;
    };

    return {
      channelId: data.channel_id ?? `pending-${Date.now()}`,
      txid: data.funding_txid,
      lspNodeId: data.lsp_node_id,
    };
  } catch (e: unknown) {
    logger.warn("lsp_lsps1_request_error", {
      error: e instanceof Error ? e.message : String(e),
      action: "lsp_lsps1_request_error",
    });
    return null;
  }
}

// ── Channel status polling ────────────────────────────────────

export async function pollChannelStatus(
  pendingChannelId: string,
  lspConfig?: Partial<LSPConfig>
): Promise<ChannelState> {
  const config = { ...DEFAULT_LSP_CONFIG, ...lspConfig };
  const url = `${config.url}/v1/channel/${pendingChannelId}`;

  try {
    const res = await fetch(url, {
      headers: {
        ...(config.token && { Authorization: `Bearer ${config.token}` }),
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return {
        status: "pending",
        channelId: pendingChannelId,
        message: `LSP returned ${res.status} — channel may still be pending`,
        updatedAt: Date.now(),
      };
    }

    const data = (await res.json()) as {
      status?: string;
      funding_txid?: string;
      capacity?: number;
      lsp_node_id?: string;
    };

    const rawStatus = data.status ?? "pending";
    const status: ChannelStatus =
      rawStatus === "active" || rawStatus === "open"
        ? "active"
        : rawStatus === "opening" || rawStatus === "pending_open"
        ? "opening"
        : rawStatus === "failed" || rawStatus === "error"
        ? "failed"
        : "pending";

    return {
      status,
      channelId: pendingChannelId,
      txid: data.funding_txid,
      inboundSats: data.capacity,
      lspNodeId: data.lsp_node_id,
      message:
        status === "active"
          ? "Channel is active — you can receive payments"
          : status === "opening"
          ? "Channel is being confirmed on-chain (~10 min)"
          : status === "failed"
          ? "Channel open failed — see LSP dashboard"
          : "Channel pending — waiting for LSP to open",
      updatedAt: Date.now(),
    };
  } catch (e: unknown) {
    logger.warn("lsp_poll_status_error", {
      error: e instanceof Error ? e.message : String(e),
      channelId: pendingChannelId,
      action: "lsp_poll_status_error",
    });
    return {
      status: "pending",
      channelId: pendingChannelId,
      message: "Could not reach LSP — channel may still be pending",
      updatedAt: Date.now(),
    };
  }
}

// ── JIT channel request (main flow) ──────────────────────────

export async function requestJITChannel(
  request: JITChannelRequest
): Promise<ChannelState> {
  const config = { ...DEFAULT_LSP_CONFIG, ...request.lspConfig };

  const clampedSats = Math.min(
    Math.max(request.amountSats, config.minChannelSats),
    config.maxChannelSats
  );

  logger.info("lsp_requesting_jit_channel", {
    nodeId: request.nodeId,
    amountSats: clampedSats,
    lspUrl: config.url,
    action: "lsp_requesting_jit_channel",
  });

  const result = await requestLSPS1Channel(
    config,
    request.nodeId,
    request.host,
    clampedSats
  );

  if (!result) {
    return {
      status: "failed",
      message: "LSP did not accept the channel request",
      updatedAt: Date.now(),
    };
  }

  logger.info("lsp_channel_requested", {
    channelId: result.channelId,
    lspNodeId: result.lspNodeId,
    action: "lsp_channel_requested",
  });

  return {
    status: "opening",
    channelId: result.channelId,
    txid: result.txid,
    lspNodeId: result.lspNodeId,
    inboundSats: clampedSats,
    message: "Channel opening — pending on-chain confirmation (~10 min)",
    updatedAt: Date.now(),
  };
}

// ── Main entry point ─────────────────────────────────────────

export interface MerchantLSPConfig {
  nodeId: string;
  host?: string;
  requestedSats?: number;
  lspUrl?: string;
  lspToken?: string;
}

export async function bootstrapLiquidity(
  merchantConfig: MerchantLSPConfig
): Promise<LSPBootstrapResult> {
  const lspUrl = merchantConfig.lspUrl ?? process.env.LSP_URL;

  // No LSP configured — skip gracefully
  if (!lspUrl) {
    logger.info("lsp_bootstrap_skipped_no_url", {
      action: "lsp_bootstrap_skipped",
    });
    return {
      success: false,
      skipped: true,
      skipReason: "LSP_URL not configured",
      channelState: {
        status: "not_started",
        message: "No LSP configured — set LSP_URL to enable automatic liquidity",
        updatedAt: Date.now(),
      },
      manualInstructions: manualLiquidityInstructions(merchantConfig.nodeId),
    };
  }

  if (!merchantConfig.nodeId) {
    return {
      success: false,
      skipped: true,
      skipReason: "nodeId required",
      channelState: {
        status: "not_started",
        message: "LND node ID required to request inbound channel",
        updatedAt: Date.now(),
      },
      manualInstructions: manualLiquidityInstructions(),
    };
  }

  try {
    const channelState = await requestJITChannel({
      nodeId: merchantConfig.nodeId,
      host: merchantConfig.host,
      amountSats: merchantConfig.requestedSats ?? 500_000,
      lspConfig: {
        url: lspUrl,
        token: merchantConfig.lspToken ?? process.env.LSP_TOKEN,
      },
    });

    if (channelState.status === "failed") {
      return {
        success: false,
        channelState,
        manualInstructions: manualLiquidityInstructions(merchantConfig.nodeId),
      };
    }

    return { success: true, channelState };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("lsp_bootstrap_error", {
      error: message,
      action: "lsp_bootstrap_error",
    });
    return {
      success: false,
      channelState: {
        status: "failed",
        message: `LSP bootstrap error: ${message}`,
        updatedAt: Date.now(),
      },
      manualInstructions: manualLiquidityInstructions(merchantConfig.nodeId),
    };
  }
}
