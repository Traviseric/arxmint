// ============================================================
// ArxMint — BTCMap Submission API
// POST /api/btcmap/submit
// Geocodes a merchant's location and queues a BTCMap submission.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  geocodeMerchantLocation,
  checkBtcMapListed,
  submitToBtcMap,
} from "@/lib/btcmap";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const rl = checkRateLimit(`rl:btcmap:ip:${ip}`, {
      windowMs: 3_600_000,
      maxRequests: 5,
    });
    if (!rl.allowed) {
      logger.rateLimit(ip, "/api/btcmap/submit", rl.retryAfter ?? 0);
      return apiError(429, "RATE_LIMITED", "Too many requests. Try again later.");
    }

    const body = await request.json();
    const { merchantId } = body;

    if (!merchantId || typeof merchantId !== "string") {
      return apiError(400, "INVALID_INPUT", "merchantId is required.");
    }

    const { supabase } = await import("@/lib/supabase");

    // Look up merchant from merchant_pledges
    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_pledges")
      .select("id, businessName, location, website")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      return apiError(404, "MERCHANT_NOT_FOUND", "Merchant not found.");
    }

    if (!merchant.location) {
      return apiError(
        422,
        "NO_LOCATION",
        "Merchant has no location set. Cannot geocode."
      );
    }

    // Geocode the location
    const coordinates = await geocodeMerchantLocation(merchant.location);
    if (!coordinates) {
      logger.warn("btcmap_submit_geocode_failed", {
        merchantId,
        location: merchant.location,
      });
      return NextResponse.json({
        submitted: false,
        alreadyListed: false,
        coordinates: null,
        reason: "Could not geocode merchant location.",
      });
    }

    // Check if already listed on BTCMap
    const alreadyListed = await checkBtcMapListed(
      merchant.businessName,
      coordinates.lat,
      coordinates.lng
    );

    if (alreadyListed) {
      logger.info("btcmap_already_listed", {
        merchantId,
        businessName: merchant.businessName,
      });
      return NextResponse.json({
        submitted: false,
        alreadyListed: true,
        coordinates,
      });
    }

    // Store submission in Supabase
    const paymentUrl = `https://arxmint.com/pay/${merchantId}`;
    const submitted = await submitToBtcMap({
      merchantId,
      businessName: merchant.businessName,
      location: merchant.location,
      lat: coordinates.lat,
      lng: coordinates.lng,
      website: merchant.website ?? undefined,
      paymentUrl,
    });

    return NextResponse.json({
      submitted,
      alreadyListed: false,
      coordinates,
    });
  } catch (err: unknown) {
    logger.error("btcmap_submit_route_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return apiError(500, "INTERNAL_ERROR", "Internal server error.");
  }
}
