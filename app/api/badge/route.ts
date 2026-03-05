// ============================================================
// ArxMint — Badge API
// GET /api/badge — returns "Bitcoin Accepted Here" SVG image
// Query params: variant=dark|light, ref=merchantId
// Used by merchant embed codes: <img src="https://arxmint.com/api/badge" />
// ============================================================

import { NextRequest } from "next/server";

function generateBadgeSVG(variant: "dark" | "light"): string {
  const bg = variant === "dark" ? "#0a0a0a" : "#ffffff";
  const text = variant === "dark" ? "#fafafa" : "#171717";
  const border = variant === "dark" ? "#333333" : "#e5e5e5";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="320" height="60">
  <rect x="1" y="1" width="318" height="58" rx="10" fill="${bg}" stroke="${border}" stroke-width="1.5"/>
  <g transform="translate(20, 12)">
    <path d="M13 2L3 14h6l-2 10 10-12h-6l2-10z" fill="#F7931A" stroke="#F7931A" stroke-width="0.5" stroke-linejoin="round"/>
  </g>
  <text x="52" y="28" font-family="monospace, 'Courier New'" font-size="11" font-weight="700" fill="#F7931A" letter-spacing="1">BITCOIN</text>
  <text x="120" y="28" font-family="monospace, 'Courier New'" font-size="11" font-weight="400" fill="${text}" letter-spacing="1">ACCEPTED HERE</text>
  <line x1="252" y1="10" x2="252" y2="50" stroke="#F7931A" stroke-width="1" opacity="0.4"/>
  <text x="264" y="28" font-family="monospace, 'Courier New'" font-size="9" fill="${text}" opacity="0.6" letter-spacing="0.5">ArxMint</text>
  <text x="52" y="45" font-family="monospace, 'Courier New'" font-size="8" fill="#F7931A" opacity="0.5">arxmint.com/merchants</text>
</svg>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const variant = searchParams.get("variant") === "light" ? "light" : "dark";

  const svg = generateBadgeSVG(variant);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
