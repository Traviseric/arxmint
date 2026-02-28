// ============================================================
// ArxMint — Structured Logger
// Writes JSON to process.stdout for Docker log aggregation.
// SECURITY: NEVER log Cashu proof secrets, C values, raw tokens,
// macaroon preimages, or private keys.
// ============================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

type LogMeta = Omit<LogEntry, "timestamp" | "level" | "message">;

function log(level: LogLevel, message: string, meta: LogMeta = {}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  // console.log writes to stdout in Node.js and is safe in Edge Runtime
  console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log("debug", message, meta),
  info:  (message: string, meta?: LogMeta) => log("info",  message, meta),
  warn:  (message: string, meta?: LogMeta) => log("warn",  message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),

  /**
   * Log a payment operation — sanitized, NO secrets.
   * Log amounts + backend + status only. Never log tokens, preimages, or proof secrets.
   */
  payment: (
    action: string,
    meta: {
      amount: number;
      backend: string;
      status: string;
      requestId?: string;
      [key: string]: unknown;
    }
  ) => log("info", `payment.${action}`, { action: `payment.${action}`, ...meta }),

  /**
   * Log an auth event — IP and pubkey prefix only.
   * NEVER log passwords, full private keys, or session tokens.
   */
  auth: (
    action: string,
    meta: {
      ip?: string;
      pubkey?: string;  // first 8 chars only for correlation — never the full key
      success: boolean;
      reason?: string;
      requestId?: string;
    }
  ) => log("info", `auth.${action}`, { action: `auth.${action}`, ...meta }),

  /** Log a rate limit hit */
  rateLimit: (ip: string, endpoint: string, retryAfter: number) =>
    log("warn", "rate_limit_exceeded", {
      action: "rate_limit",
      ip,
      endpoint,
      retryAfter,
    }),
};
