// ============================================================
// ArxMint — Auth Logout: POST /api/auth/logout
// Clears the session cookie and removes the server-side session
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, deleteSession } from "@/lib/auth-middleware";

const SESSION_COOKIE = "arxmint_session";

export async function POST(request: NextRequest) {
  const token = getSessionFromRequest(request);
  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
