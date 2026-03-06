// ============================================================
// ArxMint — Managed DNS + Cloudflare Tunnel
// Zero-config public reachability for merchant nodes.
//
// Merchants on home internet cannot expose ports publicly.
// This module provisions a Cloudflare Tunnel + DNS CNAME so
// their checkout page is reachable at:
//   https://<merchant-id>.arxmint.com
//
// Env vars:
//   CLOUDFLARE_API_TOKEN  — Cloudflare API token (DNS+Tunnel edit)
//   CLOUDFLARE_ZONE_ID    — arxmint.com zone ID
//   ARXMINT_TUNNEL_BASE   — subdomain base (default: arxmint.com)
//
// Falls back gracefully when CLOUDFLARE_API_TOKEN is not set.
// ============================================================

import { logger } from "@/lib/logger";

// ── Types ────────────────────────────────────────────────────

export type TunnelStatus = "active" | "pending" | "degraded" | "error" | "not_configured";

export interface TunnelConfig {
  tunnelId: string;
  tunnelToken: string;
  subdomain: string;
  publicUrl: string;
  status: TunnelStatus;
  createdAt: number;
}

export interface DNSProvisionResult {
  success: boolean;
  tunnelConfig?: TunnelConfig;
  skipped?: boolean;
  skipReason?: string;
  manualInstructions?: string[];
}

// ── Cloudflare API helpers ────────────────────────────────────

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

interface CFResponse<T> {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: T;
}

async function cfRequest<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown
): Promise<T | null> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) return null;

  try {
    const res = await fetch(`${CF_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json()) as CFResponse<T>;

    if (!data.success) {
      const errMsg = data.errors?.map((e) => e.message).join(", ") ?? "unknown error";
      logger.warn("cloudflare_api_error", {
        path,
        method,
        error: errMsg,
        action: "cloudflare_api_error",
      });
      return null;
    }

    return data.result ?? null;
  } catch (e: unknown) {
    logger.warn("cloudflare_api_request_error", {
      error: e instanceof Error ? e.message : String(e),
      path,
      action: "cloudflare_api_request_error",
    });
    return null;
  }
}

// ── Manual instructions fallback ─────────────────────────────

function manualDNSInstructions(merchantId: string): string[] {
  const base = process.env.ARXMINT_TUNNEL_BASE ?? "arxmint.com";
  return [
    `To make your node publicly reachable at https://${merchantId}.${base}:`,
    "  Option A — Cloudflare Tunnel (recommended, free):",
    "    1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    "    2. Run: cloudflared tunnel login",
    "    3. Run: cloudflared tunnel create " + merchantId,
    "    4. Run: cloudflared tunnel route dns " + merchantId + " " + merchantId + "." + base,
    "    5. Run: cloudflared tunnel run " + merchantId,
    "  Option B — Ngrok (dev/testing only):",
    "    ngrok http 3000",
    "  Option C — Own domain with Caddy:",
    "    Configure Caddyfile with your domain and reverse_proxy localhost:3000",
  ];
}

// ── Cloudflare Tunnel provisioning ───────────────────────────

interface CFTunnelCreateResult {
  id: string;
  name: string;
  token?: string;
  credentials_file?: { AccountTag: string; TunnelSecret: string; TunnelID: string };
}

export async function provisionTunnel(
  merchantId: string
): Promise<{ tunnelId: string; tunnelToken: string } | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    logger.warn("cloudflare_missing_account_id", {
      action: "cloudflare_missing_account_id",
    });
    return null;
  }

  // Check if tunnel already exists with this name
  const existing = await cfRequest<CFTunnelCreateResult[]>(
    `/accounts/${accountId}/cfd_tunnel?name=${encodeURIComponent(merchantId)}&is_deleted=false`
  );

  if (existing && existing.length > 0) {
    const t = existing[0];
    logger.info("cloudflare_tunnel_exists", {
      tunnelId: t.id,
      merchantId,
      action: "cloudflare_tunnel_exists",
    });
    // Fetch token for existing tunnel
    const tokenData = await cfRequest<{ token: string }>(
      `/accounts/${accountId}/cfd_tunnel/${t.id}/token`
    );
    return {
      tunnelId: t.id,
      tunnelToken: tokenData?.token ?? t.token ?? "",
    };
  }

  // Create new tunnel
  const created = await cfRequest<CFTunnelCreateResult>(
    `/accounts/${accountId}/cfd_tunnel`,
    "POST",
    { name: merchantId, config_src: "cloudflare" }
  );

  if (!created) return null;

  logger.info("cloudflare_tunnel_created", {
    tunnelId: created.id,
    merchantId,
    action: "cloudflare_tunnel_created",
  });

  return {
    tunnelId: created.id,
    tunnelToken: created.token ?? "",
  };
}

// ── DNS CNAME record ─────────────────────────────────────────

interface CFDNSRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

export async function configureDNS(
  tunnelId: string,
  subdomain: string
): Promise<boolean> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const base = process.env.ARXMINT_TUNNEL_BASE ?? "arxmint.com";

  if (!zoneId) {
    logger.warn("cloudflare_missing_zone_id", {
      action: "cloudflare_missing_zone_id",
    });
    return false;
  }

  const fqdn = `${subdomain}.${base}`;
  const cnameTarget = `${tunnelId}.cfargotunnel.com`;

  // Check for existing record
  const existing = await cfRequest<CFDNSRecord[]>(
    `/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(fqdn)}`
  );

  if (existing && existing.length > 0) {
    logger.info("cloudflare_dns_record_exists", {
      fqdn,
      action: "cloudflare_dns_record_exists",
    });
    return true;
  }

  // Create CNAME
  const result = await cfRequest<CFDNSRecord>(
    `/zones/${zoneId}/dns_records`,
    "POST",
    {
      type: "CNAME",
      name: fqdn,
      content: cnameTarget,
      proxied: true,
      ttl: 1, // Auto
    }
  );

  if (!result) return false;

  logger.info("cloudflare_dns_record_created", {
    fqdn,
    target: cnameTarget,
    action: "cloudflare_dns_record_created",
  });

  return true;
}

// ── Tunnel status ─────────────────────────────────────────────

export async function getTunnelStatus(tunnelId: string): Promise<TunnelStatus> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId || !process.env.CLOUDFLARE_API_TOKEN) {
    return "not_configured";
  }

  const tunnel = await cfRequest<{
    status?: string;
    connections?: unknown[];
  }>(`/accounts/${accountId}/cfd_tunnel/${tunnelId}`);

  if (!tunnel) return "error";

  const status = tunnel.status ?? "";
  if (status === "active" || (tunnel.connections && (tunnel.connections as unknown[]).length > 0)) {
    return "active";
  }
  if (status === "inactive" || status === "degraded") return "degraded";
  return "pending";
}

// ── Main entry point ─────────────────────────────────────────

export async function provisionMerchantDNS(
  merchantId: string
): Promise<DNSProvisionResult> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const base = process.env.ARXMINT_TUNNEL_BASE ?? "arxmint.com";

  if (!apiToken) {
    logger.info("cloudflare_dns_skipped_no_token", {
      merchantId,
      action: "cloudflare_dns_skipped",
    });
    return {
      success: false,
      skipped: true,
      skipReason: "CLOUDFLARE_API_TOKEN not configured",
      manualInstructions: manualDNSInstructions(merchantId),
    };
  }

  const publicUrl = `https://${merchantId}.${base}`;

  try {
    // Step 1: Create tunnel
    const tunnel = await provisionTunnel(merchantId);
    if (!tunnel) {
      return {
        success: false,
        manualInstructions: manualDNSInstructions(merchantId),
      };
    }

    // Step 2: Configure DNS CNAME
    const dnsOk = await configureDNS(tunnel.tunnelId, merchantId);
    if (!dnsOk) {
      logger.warn("cloudflare_dns_failed", { merchantId, action: "cloudflare_dns_failed" });
      // Tunnel created but DNS failed — still return token so merchant can use it
    }

    const tunnelConfig: TunnelConfig = {
      tunnelId: tunnel.tunnelId,
      tunnelToken: tunnel.tunnelToken,
      subdomain: merchantId,
      publicUrl,
      status: dnsOk ? "pending" : "degraded",
      createdAt: Date.now(),
    };

    logger.info("cloudflare_dns_provisioned", {
      merchantId,
      publicUrl,
      tunnelId: tunnel.tunnelId,
      dnsOk,
      action: "cloudflare_dns_provisioned",
    });

    return { success: true, tunnelConfig };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("cloudflare_dns_provision_error", {
      error: message,
      merchantId,
      action: "cloudflare_dns_provision_error",
    });
    return {
      success: false,
      manualInstructions: manualDNSInstructions(merchantId),
    };
  }
}
