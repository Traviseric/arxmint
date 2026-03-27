// ============================================================
// ArxMint — BTCMap Integration Utilities
// Geocode merchant locations, check BTCMap listings, and
// queue submissions for the global Bitcoin merchant map.
// ============================================================

import { logger } from "@/lib/logger";

// ---- In-memory geocode cache ----

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Geocode a merchant location string to lat/lng using Nominatim (OSM).
 * Caches results in memory to avoid hitting rate limits.
 */
export async function geocodeMerchantLocation(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = location.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location
    )}&format=json&limit=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "ArxMint/1.0 (https://arxmint.com)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      logger.warn("btcmap_geocode_http_error", {
        status: res.status,
        location,
      });
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      logger.info("btcmap_geocode_no_results", { location });
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    if (isNaN(result.lat) || isNaN(result.lng)) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    geocodeCache.set(cacheKey, result);
    logger.info("btcmap_geocode_success", { location, ...result });
    return result;
  } catch (err: unknown) {
    logger.error("btcmap_geocode_error", {
      location,
      error: err instanceof Error ? err.message : String(err),
    });
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Submit a merchant to BTCMap.
 *
 * BTCMap uses OpenStreetMap data — direct programmatic submission requires
 * OSM editing which needs OAuth + changeset review. Instead we store the
 * submission intent in the Supabase `btcmap_submissions` table so it can
 * be batch-submitted manually or via a future OSM integration.
 */
export async function submitToBtcMap(params: {
  merchantId: string;
  businessName: string;
  location: string;
  lat: number;
  lng: number;
  website?: string;
  paymentUrl: string;
}): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase");

    const { error } = await supabase.from("btcmap_submissions").upsert(
      {
        merchant_id: params.merchantId,
        business_name: params.businessName,
        location: params.location,
        lat: params.lat,
        lng: params.lng,
        website: params.website ?? null,
        payment_url: params.paymentUrl,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "merchant_id" }
    );

    if (error) {
      logger.error("btcmap_submit_db_error", {
        merchantId: params.merchantId,
        error: error.message,
      });
      return false;
    }

    logger.info("btcmap_submission_stored", {
      merchantId: params.merchantId,
      businessName: params.businessName,
      lat: params.lat,
      lng: params.lng,
    });
    return true;
  } catch (err: unknown) {
    logger.error("btcmap_submit_error", {
      merchantId: params.merchantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Check whether a business is already listed on BTCMap by searching
 * the BTCMap elements API within a bounding box around the coordinates.
 */
export async function checkBtcMapListed(
  businessName: string,
  lat: number,
  lng: number
): Promise<boolean> {
  try {
    const delta = 0.01;
    const bounds = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;
    const url = `https://api.btcmap.org/v2/elements?bounds=${bounds}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "ArxMint/1.0 (https://arxmint.com)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      logger.warn("btcmap_check_http_error", { status: res.status });
      return false;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return false;

    const nameLower = businessName.toLowerCase();
    return data.some((element: Record<string, unknown>) => {
      const tags = element.tags as Record<string, string> | undefined;
      if (!tags) return false;
      const name = (tags.name ?? "").toLowerCase();
      return name.includes(nameLower) || nameLower.includes(name);
    });
  } catch (err: unknown) {
    logger.error("btcmap_check_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
