// ============================================================
// ArxMint — POS Web App Manifest
// GET /pos/[merchant-id]/manifest.json
// Enables "Add to Home Screen" PWA behavior for merchants.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ "merchant-id": string }> }
) {
  const { "merchant-id": merchantId } = await params;

  const manifest = {
    name: "ArxMint POS",
    short_name: "POS",
    description: "Accept Bitcoin Lightning payments in person",
    start_url: `/pos/${merchantId}`,
    display: "standalone",
    orientation: "portrait",
    theme_color: "#F7931A",
    background_color: "#fafafa",
    icons: [
      {
        src: "/images/nav-logo-transparent.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
