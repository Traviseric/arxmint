// POST /api/cron/data-retention — Vercel cron job for GDPR/privacy PII purge
//
// Vercel cron config in vercel.json:
//   { "crons": [{ "path": "/api/cron/data-retention", "schedule": "0 3 * * *" }] }
//
// Auth: CRON_SECRET env var (set in Vercel dashboard).
// Vercel automatically sends Authorization: Bearer <CRON_SECRET> for cron invocations.
//
// What is purged (30 days after settlement):
//   checkout_sessions — shipping_data (name/email/address JSONB) and memo nullified
//   invoices          — notes field nullified (may contain free-text PII)
//
// What is retained:
//   id, merchant_id, amount_sats, r_hash, status, paid_at, created_at, invoice (BOLT11)
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const RETENTION_DAYS = 30;

export async function POST(request: NextRequest) {
  // Verify cron secret — only enforced when CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffIso = cutoff.toISOString();

  logger.info("cron_data_retention_start", {
    action: "cron_data_retention_start",
    cutoff: cutoffIso,
    retention_days: RETENTION_DAYS,
  });

  const { supabase } = await import("@/lib/supabase");

  // --- 1. Purge PII from checkout_sessions ---
  // Nullify shipping_data (customer name/email/address) and memo on settled sessions
  // older than RETENTION_DAYS. Keep: id, merchant_id, amount_sats, r_hash, status,
  // paid_at, created_at, invoice (BOLT11 — cryptographic, not PII).
  const { data: purgedSessions, error: sessionsError } = await supabase
    .from("checkout_sessions")
    .update({
      shipping_data: null,
      memo: null,
    })
    .eq("status", "paid")
    .lt("paid_at", cutoffIso)
    .not("shipping_data", "is", null)
    .select("id");

  if (sessionsError) {
    logger.error("cron_data_retention_sessions_error", {
      action: "cron_data_retention_sessions_error",
      error: sessionsError.message,
    });
  }

  const sessionsPurged = purgedSessions?.length ?? 0;

  // --- 2. Purge PII from invoices ---
  // Nullify notes (free-text field that may contain customer details) on paid invoices
  // older than RETENTION_DAYS. Keep all financial fields, IDs, and timestamps.
  const { data: purgedInvoices, error: invoicesError } = await supabase
    .from("invoices")
    .update({
      notes: null,
    })
    .eq("status", "paid")
    .lt("paid_at", cutoffIso)
    .not("notes", "is", null)
    .select("id");

  if (invoicesError) {
    logger.error("cron_data_retention_invoices_error", {
      action: "cron_data_retention_invoices_error",
      error: invoicesError.message,
    });
  }

  const invoicesPurged = purgedInvoices?.length ?? 0;
  const totalPurged = sessionsPurged + invoicesPurged;

  logger.info("cron_data_retention_complete", {
    action: "cron_data_retention_complete",
    sessions_purged: sessionsPurged,
    invoices_purged: invoicesPurged,
    total_purged: totalPurged,
    cutoff: cutoffIso,
  });

  return NextResponse.json({
    ok: true,
    cutoff: cutoffIso,
    sessions_purged: sessionsPurged,
    invoices_purged: invoicesPurged,
    total_purged: totalPurged,
  });
}

// Also accept GET so Vercel can verify the endpoint is reachable
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "cron/data-retention" });
}
