// ============================================================
// ArxMint — Merchant Invoice PDF
// GET /api/invoice/[id]/pdf
// Generates a branded PDF invoice for a checkout session.
// [id] = checkout session ID (from Supabase checkout_sessions).
// Uses pdf-lib (already in deps) + qrcode for BIP21 QR.
// ============================================================

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

type Params = {
  params: Promise<{ id: string }>;
};

// Seed merchant display data (fallback when Supabase unavailable)
const SEED_MERCHANTS: Record<string, { name: string; location: string | null }> = {
  "seed-black-bear": { name: "Black Bear Window Cleaning", location: "Boulder, CO" },
  "seed-glacier": { name: "The Ice Cream Parlor by Glacier", location: "Fort Collins, CO" },
  "seed-teneo": { name: "Teneo", location: "Boulder, CO" },
  "arxmint-store": { name: "ArxMint Store", location: null },
};

interface CheckoutSession {
  id: string;
  merchant_id: string | null;
  amount_sats: number | null;
  memo: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface MerchantInfo {
  name: string;
  location: string | null;
  website: string | null;
}

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("https://mempool.space/api/v1/prices", {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return 0;
    const data = await res.json() as { USD?: number };
    return typeof data.USD === "number" ? data.USD : 0;
  } catch {
    return 0;
  }
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  // 1. Load checkout session from Supabase
  let session: CheckoutSession | null = null;
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data, error } = await supabase
      .from("checkout_sessions")
      .select("id, merchant_id, amount_sats, memo, status, created_at, paid_at")
      .eq("id", id)
      .single();
    if (!error && data) session = data as CheckoutSession;
  } catch {
    // DB unavailable
  }

  if (!session) {
    return new Response("Invoice not found", { status: 404 });
  }

  const merchantId = session.merchant_id ?? "unknown";
  const amountSats = session.amount_sats ?? 0;

  // 2. Load merchant info
  let merchant: MerchantInfo = {
    name: SEED_MERCHANTS[merchantId]?.name ?? merchantId,
    location: SEED_MERCHANTS[merchantId]?.location ?? null,
    website: null,
  };
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("merchant_pledges")
      .select("businessName, location, website")
      .eq("id", merchantId)
      .single();
    if (data) {
      merchant = {
        name: (data as { businessName?: string }).businessName ?? merchant.name,
        location: (data as { location?: string }).location ?? merchant.location,
        website: (data as { website?: string }).website ?? null,
      };
    }
  } catch {
    // use seed fallback
  }

  // 3. Fetch BTC price for USD conversion
  const btcPrice = await fetchBtcPrice();
  const amountUsd =
    btcPrice > 0
      ? ((amountSats / 100_000_000) * btcPrice).toFixed(2)
      : null;

  // 4. Generate BIP21 QR code as PNG buffer
  const origin = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://arxmint.com";
  const payUrl = `${origin}/pay/${merchantId}`;
  // BIP21 URI — wallets will show the Lightning option
  const bip21Uri = `bitcoin:?message=${encodeURIComponent(session.memo ?? "ArxMint Payment")}`;
  const qrTarget = bip21Uri.length < 200 ? bip21Uri : payUrl;

  let qrPngBuffer: Buffer | null = null;
  try {
    qrPngBuffer = await QRCode.toBuffer(qrTarget, {
      type: "png",
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    // QR optional — continue without it
  }

  // 5. Build PDF with pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const orange = rgb(0.969, 0.576, 0.102); // #F7931A
  const black = rgb(0, 0, 0);
  const gray = rgb(0.45, 0.45, 0.45);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const green = rgb(0.13, 0.7, 0.37);

  const W = 595;
  const MARGIN = 50;
  const RIGHT = W - MARGIN;

  // ---- Header bar ----
  page.drawRectangle({ x: 0, y: 792, width: W, height: 50, color: orange });
  page.drawText("PAYMENT RECEIPT", {
    x: MARGIN,
    y: 808,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("arxmint.com", {
    x: RIGHT - 80,
    y: 808,
    size: 10,
    font,
    color: rgb(1, 1, 1),
  });

  // ---- Merchant name ----
  page.drawText(merchant.name, {
    x: MARGIN,
    y: 760,
    size: 18,
    font: fontBold,
    color: black,
  });
  if (merchant.location) {
    page.drawText(merchant.location, {
      x: MARGIN,
      y: 742,
      size: 10,
      font,
      color: gray,
    });
  }
  if (merchant.website) {
    page.drawText(merchant.website, {
      x: MARGIN,
      y: merchant.location ? 728 : 742,
      size: 10,
      font,
      color: gray,
    });
  }

  // ---- Invoice metadata (right column) ----
  const metaX = 370;
  page.drawText("Session ID", { x: metaX, y: 760, size: 8, font: fontBold, color: gray });
  page.drawText(id.slice(0, 16) + "…", { x: metaX, y: 748, size: 9, font, color: black });

  const dateStr = new Date(session.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  page.drawText("Date", { x: metaX, y: 730, size: 8, font: fontBold, color: gray });
  page.drawText(dateStr, { x: metaX, y: 718, size: 9, font, color: black });

  const statusColor = session.status === "paid" ? green : orange;
  page.drawText("Status", { x: metaX, y: 700, size: 8, font: fontBold, color: gray });
  page.drawText(session.status.toUpperCase(), {
    x: metaX, y: 688, size: 11, font: fontBold, color: statusColor,
  });

  // ---- Divider ----
  page.drawLine({
    start: { x: MARGIN, y: 670 },
    end: { x: RIGHT, y: 670 },
    thickness: 1,
    color: lightGray,
  });

  // ---- Payment detail row ----
  page.drawText("DESCRIPTION", { x: MARGIN, y: 652, size: 8, font: fontBold, color: gray });
  page.drawText("AMOUNT (SATS)", { x: 380, y: 652, size: 8, font: fontBold, color: gray });

  page.drawLine({
    start: { x: MARGIN, y: 644 },
    end: { x: RIGHT, y: 644 },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });

  const memo = session.memo ?? `Payment to ${merchant.name}`;
  const memoDisplay = memo.length > 55 ? memo.slice(0, 52) + "…" : memo;
  page.drawText(memoDisplay, { x: MARGIN, y: 626, size: 11, font, color: black });
  page.drawText(`${amountSats.toLocaleString()} sats`, {
    x: 380, y: 626, size: 11, font, color: black,
  });

  // ---- Total box ----
  page.drawLine({
    start: { x: 320, y: 606 },
    end: { x: RIGHT, y: 606 },
    thickness: 1,
    color: lightGray,
  });

  page.drawText("TOTAL", { x: 320, y: 588, size: 10, font: fontBold, color: black });
  page.drawText(`${amountSats.toLocaleString()} sats`, {
    x: 380, y: 588, size: 14, font: fontBold, color: orange,
  });
  if (amountUsd) {
    page.drawText(`≈ $${amountUsd} USD`, {
      x: 380, y: 570, size: 10, font, color: gray,
    });
  }

  // ---- QR code + payment link ----
  let qrY = 500;
  if (qrPngBuffer) {
    try {
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);
      const qrSize = 160;
      page.drawImage(qrImage, {
        x: MARGIN,
        y: qrY - qrSize,
        width: qrSize,
        height: qrSize,
      });
      qrY = qrY - qrSize - 8;
    } catch {
      qrY = 510;
    }
  }

  page.drawText("Pay with Lightning:", {
    x: MARGIN,
    y: qrY,
    size: 9,
    font: fontBold,
    color: gray,
  });
  page.drawText(payUrl, {
    x: MARGIN,
    y: qrY - 14,
    size: 9,
    font,
    color: orange,
  });

  // ---- Thank you note ----
  page.drawText(`Thank you for choosing ${merchant.name}!`, {
    x: MARGIN,
    y: 120,
    size: 11,
    font,
    color: gray,
  });
  page.drawText("Payments powered by ArxMint — Bitcoin, zero fees.", {
    x: MARGIN,
    y: 104,
    size: 9,
    font,
    color: rgb(0.7, 0.7, 0.7),
  });

  // ---- Footer ----
  page.drawLine({
    start: { x: MARGIN, y: 70 },
    end: { x: RIGHT, y: 70 },
    thickness: 0.5,
    color: lightGray,
  });
  page.drawText("Generated by ArxMint · arxmint.com · Bitcoin circular economy infrastructure", {
    x: MARGIN,
    y: 56,
    size: 7,
    font,
    color: rgb(0.7, 0.7, 0.7),
  });

  const pdfBytes = await pdfDoc.save();
  const shortId = id.slice(0, 8).toUpperCase();

  return new Response(pdfBytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="arxmint-invoice-${shortId}.pdf"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
