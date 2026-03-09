// ============================================================
// ArxMint — Lightweight Analytics Helpers
// Wraps window.gtag with no-op fallback when GA is not configured.
// Set NEXT_PUBLIC_GA_ID env var to enable Google Analytics 4.
// ============================================================

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track a named analytics event.
 * No-op when window.gtag is not available (GA4 not configured).
 */
export function trackCheckoutEvent(
  event: string,
  data?: Record<string, unknown>
): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, data);
  }
}
