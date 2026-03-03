// ============================================================
// ArxMint — Prisma Client Singleton
// ============================================================
// Use only in server-side code (API routes, Server Components).
// Never import in 'use client' components.

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

const DEFAULT_POOL_MAX = 10;
const DEFAULT_POOL_TIMEOUT_SECONDS = 10;
const DEFAULT_CONNECT_TIMEOUT_SECONDS = 10;
const DEFAULT_STATEMENT_TIMEOUT_MS = 15000;
const DEFAULT_LOCK_TIMEOUT_MS = 5000;

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureDatabaseUrlGuards(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  if (!rawUrl.startsWith("postgres://") && !rawUrl.startsWith("postgresql://")) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set(
        "connection_limit",
        String(toPositiveInt(process.env.DB_POOL_MAX, DEFAULT_POOL_MAX))
      );
    }

    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set(
        "pool_timeout",
        String(toPositiveInt(process.env.DB_POOL_TIMEOUT_SECONDS, DEFAULT_POOL_TIMEOUT_SECONDS))
      );
    }

    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set(
        "connect_timeout",
        String(toPositiveInt(process.env.DB_CONNECT_TIMEOUT_SECONDS, DEFAULT_CONNECT_TIMEOUT_SECONDS))
      );
    }

    const statementTimeoutMs = toPositiveInt(
      process.env.DB_STATEMENT_TIMEOUT_MS,
      DEFAULT_STATEMENT_TIMEOUT_MS
    );
    const lockTimeoutMs = toPositiveInt(process.env.DB_LOCK_TIMEOUT_MS, DEFAULT_LOCK_TIMEOUT_MS);
    const requiredOptions = [
      `-c statement_timeout=${statementTimeoutMs}`,
      `-c lock_timeout=${lockTimeoutMs}`,
    ];
    const existingOptions = url.searchParams.get("options");

    if (!existingOptions) {
      url.searchParams.set("options", requiredOptions.join(" "));
    } else {
      let mergedOptions = existingOptions;
      for (const option of requiredOptions) {
        if (!mergedOptions.includes(option)) {
          mergedOptions = `${mergedOptions} ${option}`.trim();
        }
      }
      url.searchParams.set("options", mergedOptions);
    }

    return url.toString();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("db_guardrail_database_url_parse_failed", { error: message });
    return rawUrl;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = ensureDatabaseUrlGuards(process.env.DATABASE_URL);
const db =
  globalForPrisma.prisma ??
  new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export { db };
