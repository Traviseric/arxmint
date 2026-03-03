// ============================================================
// ArxMint — Middleware
// Runs on Edge Runtime for all matched routes.
// Handles: CORS (API routes) + session gate (protected pages)
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkPrincipalAndIpRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

const SESSION_COOKIE = "arxmint_session";

// Protected page routes — redirect to /login if no valid session
const PROTECTED_PREFIXES = ["/dashboard", "/wallet", "/merchant", "/admin"];

// ---- Edge-compatible session validation ----
// Mirrors the HMAC-signed token format in lib/auth-middleware.ts.
// Uses Web Crypto API (crypto.subtle) which runs on Edge Runtime.

// Ephemeral key used only in development when NEXTAUTH_SECRET is absent.
const _DEV_EPHEMERAL_SECRET = `dev-ephemeral-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[ArxMint] FATAL: NEXTAUTH_SECRET is not set. " +
          "Generate one with: openssl rand -hex 32"
      );
    }
    return _DEV_EPHEMERAL_SECRET;
  }
  return secret;
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function validateToken(token: string): Promise<boolean> {
  if (!token) return false;

  const dotCount = (token.match(/\./g) ?? []).length;
  if (dotCount !== 2) return false;

  const lastDot = token.lastIndexOf(".");
  const secondLastDot = token.lastIndexOf(".", lastDot - 1);

  const pubkey = token.substring(0, secondLastDot);
  const expStr = token.substring(secondLastDot + 1, lastDot);
  const sig = token.substring(lastDot + 1);

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${pubkey}.${exp}`)
    );
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison using XOR
    if (sig.length !== expectedHex.length) return false;
    const sigBytes = hexToUint8Array(sig);
    const expectedBytes = hexToUint8Array(expectedHex);
    let diff = 0;
    for (let i = 0; i < sigBytes.length; i++) {
      diff |= sigBytes[i] ^ expectedBytes[i];
    }
    return diff === 0;
  } catch {
    return false;
  }
}

function extractClientIp(request: NextRequest): string {
  const forwarded =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function extractSessionPrincipal(request: NextRequest): string | undefined {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  const lastDot = token.lastIndexOf(".");
  const secondLastDot = token.lastIndexOf(".", lastDot - 1);
  if (secondLastDot <= 0 || lastDot <= secondLastDot) return undefined;
  const pubkey = token.substring(0, secondLastDot).trim();
  return pubkey || undefined;
}

function makeRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreateRequestId(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    makeRequestId()
  );
}

function attachRequestId(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

function nextWithRequestId(
  request: NextRequest,
  requestId: string
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return attachRequestId(response, requestId);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedPage = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const requestId = getOrCreateRequestId(request);

  // ---- Rate limiting (API routes only) ----
  if (isApiRoute) {
    const ip = extractClientIp(request);
    const principal = extractSessionPrincipal(request);

    let rateConfig = RATE_LIMITS.public;
    let rateBucket = "public";

    if (
      pathname.startsWith("/api/l402") ||
      pathname.startsWith("/api/payment") ||
      pathname.startsWith("/api/agent") ||
      pathname.startsWith("/api/settlement")
    ) {
      rateConfig = RATE_LIMITS.payment;
      rateBucket = "payment";
    } else if (pathname.startsWith("/api/auth")) {
      rateConfig = RATE_LIMITS.auth;
      rateBucket = "auth";
    }

    const { allowed, retryAfter } = checkPrincipalAndIpRateLimit(
      rateBucket,
      ip,
      principal,
      rateConfig
    );

    if (!allowed) {
      logger.rateLimit(ip, pathname, retryAfter ?? 60);
      return attachRequestId(new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter ?? 60),
          "Content-Type": "text/plain",
        },
      }), requestId);
    }
  }

  // ---- Session gate for protected page routes ----
  if (isProtectedPage) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const isValid = sessionToken ? await validateToken(sessionToken) : false;

    if (!isValid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return attachRequestId(NextResponse.redirect(loginUrl), requestId);
    }
  }

  // ---- CORS for API routes ----
  if (!isApiRoute) {
    return nextWithRequestId(request, requestId);
  }

  const origin = request.headers.get("origin") ?? "";

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    const response = attachRequestId(new NextResponse(null, { status: 204 }), requestId);
    const marketplaceOriginsOpts = [
      process.env.TENEO_MARKETPLACE_URL,
      "http://localhost:3001",
    ].filter(Boolean) as string[];
    const isPaymentOpts = pathname.startsWith("/api/payment");
    if (ALLOWED_ORIGINS.includes(origin) || (isPaymentOpts && marketplaceOriginsOpts.includes(origin))) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    } else if (isPaymentOpts) {
      response.headers.set("Access-Control-Allow-Origin", "*");
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie"
    );
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  const response = nextWithRequestId(request, requestId);

  // Agent/public API endpoints — allow broader CORS access
  const marketplaceOrigins = [
    process.env.TENEO_MARKETPLACE_URL,
    "http://localhost:3001", // local dev
  ].filter(Boolean) as string[];

  const isAgentRoute =
    pathname.startsWith("/api/agent") ||
    pathname.startsWith("/api/l402") ||
    pathname.startsWith("/api/cycle");

  const isPaymentRoute = pathname.startsWith("/api/payment");

  if (isAgentRoute) {
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else if (isPaymentRoute && marketplaceOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else if (isPaymentRoute && !origin) {
    // Allow server-to-server calls without Origin header
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/wallet/:path*",
    "/merchant/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
