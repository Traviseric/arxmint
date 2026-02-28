// ============================================================
// ArxMint — Health Check Endpoint
// GET /api/health
//
// Returns JSON: { status, db, mint, lnd, uptime, timestamp }
// Used by Docker HEALTHCHECK and external monitoring.
// ============================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRequiredEnv } from "@/lib/env-check";

const START_TIME = Date.now();

interface ServiceStatus {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg ?? "database unreachable" };
  }
}

async function checkCashuMint(): Promise<ServiceStatus> {
  const mintUrl = process.env.CASHU_MINT_URL ?? "http://localhost:3338";
  const start = Date.now();
  try {
    const res = await fetch(`${mintUrl}/v1/info`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg ?? "mint unreachable" };
  }
}

async function checkLnd(): Promise<ServiceStatus> {
  const lndUrl = process.env.LND_REST_URL;
  if (!lndUrl) {
    return { ok: false, error: "LND_REST_URL not configured" };
  }
  const macaroon = process.env.LND_MACAROON_HEX;
  if (!macaroon) {
    return { ok: false, error: "LND_MACAROON_HEX not configured" };
  }

  const start = Date.now();
  try {
    const res = await fetch(`${lndUrl}/v1/getinfo`, {
      headers: { "Grpc-Metadata-macaroon": macaroon },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg ?? "LND unreachable" };
  }
}

export async function GET() {
  const { valid: envValid, missing, warnings } = validateRequiredEnv();

  const [dbStatus, mintStatus, lndStatus] = await Promise.all([
    checkDatabase(),
    checkCashuMint(),
    checkLnd(),
  ]);

  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  // Overall status: degraded if any optional service is down, unhealthy if env is invalid
  const allCriticalOk = envValid && dbStatus.ok;
  const status = allCriticalOk
    ? (mintStatus.ok && lndStatus.ok ? "healthy" : "degraded")
    : "unhealthy";

  const body = {
    status,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    env: {
      valid: envValid,
      missing: missing.length > 0 ? missing : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
    services: {
      db: dbStatus,
      mint: mintStatus,
      lnd: lndStatus,
    },
  };

  // 200 for healthy/degraded, 503 for unhealthy
  const httpStatus = status === "unhealthy" ? 503 : 200;
  return NextResponse.json(body, { status: httpStatus });
}
