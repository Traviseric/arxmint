// ============================================================
// ArxMint — Middleware (lightweight)
// Pass-through with request ID + basic CORS for API routes.
// Rate limiting handled per-route (e.g. /api/pledge has its own).
// Session gate for protected pages.
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

const SESSION_COOKIE = "arxmint_session";
const PROTECTED_PREFIXES = ["/dashboard", "/wallet", "/admin"];

function makeRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    makeRequestId();

  const isApiRoute = pathname.startsWith("/api/");

  // ---- Session gate for protected pages ----
  const isProtectedPage = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtectedPage) {
    const hasSession = !!request.cookies.get(SESSION_COOKIE)?.value;
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.headers.set("X-Request-Id", requestId);
      return res;
    }
  }

  // ---- CORS preflight ----
  if (isApiRoute && request.method === "OPTIONS") {
    const origin = request.headers.get("origin") ?? "";
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("X-Request-Id", requestId);
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Credentials", "true");
    } else {
      res.headers.set("Access-Control-Allow-Origin", "*");
    }
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    res.headers.set("Access-Control-Max-Age", "86400");
    return res;
  }

  // ---- Pass through with request ID + CORS headers ----
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-Id", requestId);

  if (isApiRoute) {
    const origin = request.headers.get("origin") ?? "";
    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/wallet/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
