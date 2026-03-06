// ============================================================
// ArxMint — Standardized API error helper
// All API routes should use this to ensure a consistent error shape:
//   { error: { code: string, message: string } }
// ============================================================

import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}
