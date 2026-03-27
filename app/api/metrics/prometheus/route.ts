import { NextResponse } from "next/server";
import { getMetricsText, setGauge, METRIC_PENDING_SESSIONS } from "@/lib/metrics";

/**
 * GET /api/metrics/prometheus
 *
 * Prometheus scrape endpoint. Returns all registered arxmint metrics in
 * the Prometheus text exposition format (0.0.4).
 *
 * Configure Prometheus to scrape this path:
 *   - job_name: "arxmint-app"
 *     metrics_path: /api/metrics/prometheus
 *     static_configs:
 *       - targets: ["app:3000"]
 *
 * The pending-sessions gauge is refreshed on every scrape so it reflects
 * current DB state without needing a background polling job.
 */
export async function GET(): Promise<NextResponse> {
    // Refresh pending-sessions gauge from Supabase.
    // If DB is unavailable, serve the stale/zero value — don't block the scrape.
    try {
        const { supabase } = await import("@/lib/supabase");
        const { count, error } = await supabase
            .from("checkout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");

        if (!error && count !== null) {
            setGauge(
                METRIC_PENDING_SESSIONS,
                count,
                {},
                "Current number of pending (unpaid) checkout sessions"
            );
        }
    } catch {
        // DB unavailable — serve stale gauge value
    }

    return new NextResponse(getMetricsText(), {
        status: 200,
        headers: {
            "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}
