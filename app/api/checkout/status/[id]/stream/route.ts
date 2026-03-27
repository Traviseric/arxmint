// ============================================================
// ArxMint — Checkout Status SSE Stream
// GET /api/checkout/status/[id]/stream
// Server-Sent Events for real-time payment updates.
// Polls LNbits server-side every 2s; closes on paid/expired/timeout.
// ============================================================

import { NextRequest } from "next/server";
import type { PaymentStatus } from "@/lib/types";

const SSE_POLL_INTERVAL_MS = 2_000;
const SSE_MAX_DURATION_MS = 10 * 60 * 1_000; // 10 minutes (invoice TTL)
const DEMO_AUTO_PAY_DELAY_MS = 5_000;

interface SessionSnapshot {
  id: string;
  status: PaymentStatus;
  amountSats: number;
  paidAt?: string;
  demoMode: boolean;
}

/**
 * Resolve current session status — mirrors the logic in the parent route.ts
 * Checks expiry, LNbits payment state, and demo auto-pay.
 */
async function resolveSession(
  id: string,
  requestUrl: string
): Promise<SessionSnapshot | null> {
  const { supabase } = await import("@/lib/supabase");
  const { data: session, error } = await supabase
    .from("checkout_sessions")
    .select(
      "id, status, demo_mode, created_at, expires_at, paid_at, amount_sats, merchant_id, r_hash"
    )
    .eq("id", id)
    .single();

  if (error || !session) return null;

  let status: PaymentStatus = session.status as PaymentStatus;

  // --- Expiry check ---
  if (status === "pending" && new Date(session.expires_at) < new Date()) {
    await supabase
      .from("checkout_sessions")
      .update({ status: "expired" })
      .eq("id", id);
    status = "expired";
  }

  // --- LNbits payment check (real payments) ---
  if (status === "pending" && !session.demo_mode && session.r_hash) {
    try {
      const { checkLNbitsPayment } = await import("@/lib/lnbits");
      const lnbitsStatus = await checkLNbitsPayment({
        paymentHash: session.r_hash,
      });
      if (lnbitsStatus.paid) {
        const paidAt = new Date().toISOString();
        await supabase
          .from("checkout_sessions")
          .update({ status: "paid", paid_at: paidAt })
          .eq("id", id);

        // Fire webhook for fulfillment (fire-and-forget)
        fetch(new URL("/api/checkout/webhook", requestUrl).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        }).catch(() => {});

        return {
          id: session.id,
          status: "paid",
          amountSats: session.amount_sats,
          paidAt,
          demoMode: false,
        };
      }
    } catch {
      // LNbits check failed — continue with current status
    }
  }

  // --- Dev-only demo auto-pay ---
  if (
    status === "pending" &&
    session.demo_mode &&
    process.env.NODE_ENV === "development"
  ) {
    const createdAt = new Date(session.created_at).getTime();
    if (Date.now() - createdAt > DEMO_AUTO_PAY_DELAY_MS) {
      const paidAt = new Date().toISOString();
      await supabase
        .from("checkout_sessions")
        .update({ status: "paid", paid_at: paidAt })
        .eq("id", id);

      fetch(new URL("/api/checkout/webhook", requestUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      }).catch(() => {});

      return {
        id: session.id,
        status: "paid",
        amountSats: session.amount_sats,
        paidAt,
        demoMode: true,
      };
    }
  }

  return {
    id: session.id,
    status,
    amountSats: session.amount_sats,
    paidAt: session.paid_at || undefined,
    demoMode: Boolean(session.demo_mode),
  };
}

/** Build the SSE data payload from a session snapshot. */
function buildEvent(snapshot: SessionSnapshot): object {
  return {
    status: snapshot.status,
    amountSats: snapshot.amountSats,
    ...(snapshot.paidAt && { paidAt: snapshot.paidAt }),
    ...(snapshot.demoMode && { demoMode: true }),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 64) {
    return new Response("Invalid session ID", { status: 400 });
  }

  const requestUrl = _request.url;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const startTime = Date.now();

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // --- Send initial status immediately ---
      const initial = await resolveSession(id, requestUrl);
      if (!initial) {
        send({ error: "Session not found" });
        close();
        return;
      }

      send(buildEvent(initial));

      if (initial.status !== "pending") {
        close();
        return;
      }

      // --- Poll until terminal state or timeout ---
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        if (Date.now() - startTime > SSE_MAX_DURATION_MS) {
          send({ status: "expired" });
          clearInterval(interval);
          close();
          return;
        }

        const result = await resolveSession(id, requestUrl);
        if (!result) {
          clearInterval(interval);
          close();
          return;
        }

        send(buildEvent(result));

        if (result.status !== "pending") {
          clearInterval(interval);
          close();
        }
      }, SSE_POLL_INTERVAL_MS);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
