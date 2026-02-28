// ============================================================
// ArxMint — Middleware
// Runs on Edge Runtime for all matched routes.
// Handles: CORS (API routes) + session gate (protected pages)
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

const SESSION_COOKIE = "arxmint_session";

// Protected page routes — redirect to /login if no valid session
const PROTECTED_PREFIXES = ["/dashboard", "/wallet", "/merchant", "/admin"];

// ---- Edge-compatible session validation ----
// Mirrors the HMAC-signed token format in lib/auth-middleware.ts.
// Uses Web Crypto API (crypto.subtle) which runs on Edge Runtime.

function getSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-secret-change-in-production"
  );
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedPage = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // ---- Session gate for protected page routes ----
  if (isProtectedPage) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    const isValid = sessionToken ? await validateToken(sessionToken) : false;

    if (!isValid) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ---- CORS for API routes ----
  if (!isApiRoute) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin") ?? "";

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }

  const response = NextResponse.next();

  // Agent/public API endpoints — allow broader CORS access
  const isAgentRoute =
    pathname.startsWith("/api/agent") ||
    pathname.startsWith("/api/l402") ||
    pathname.startsWith("/api/cycle");

  if (isAgentRoute) {
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
