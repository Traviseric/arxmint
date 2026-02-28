// ============================================================
// ArxMint — CORS Middleware
// Runs on the Edge Runtime for all /api/* routes.
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  if (!isApiRoute) {
    return NextResponse.next();
  }

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

  // Agent/public API endpoints are intended for non-browser clients — allow broader access
  const isAgentRoute =
    request.nextUrl.pathname.startsWith("/api/agent") ||
    request.nextUrl.pathname.startsWith("/api/l402") ||
    request.nextUrl.pathname.startsWith("/api/cycle");

  if (isAgentRoute) {
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else if (ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
