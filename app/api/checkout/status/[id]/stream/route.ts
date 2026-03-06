// ============================================================
// ArxMint — Checkout Status SSE Stream
// GET /api/checkout/status/[id]/stream — Server-Sent Events for real-time payment updates
// Sends updates every 3s; closes on paid or expired
// ============================================================

import { NextRequest } from "next/server";
import type { PaymentStatus } from "@/lib/types";

const POLL_INTERVAL_MS = 3_000;
const MAX_STREAM_MS = 15 * 60 * 1_000; // 15 minutes max

async function getStatus(id: string): Promise<{ status: PaymentStatus; paidAt?: string } | null> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: session, error } = await supabase
      .from("checkout_sessions")
      .select("status, expires_at, paid_at")
      .eq("id", id)
      .single();

    if (error || !session) return null;

    let status: PaymentStatus = session.status as PaymentStatus;

    // Compute expiry server-side
    if (status === "pending" && new Date(session.expires_at) < new Date()) {
      await supabase
        .from("checkout_sessions")
        .update({ status: "expired" })
        .eq("id", id);
      status = "expired";
    }

    return { status, paidAt: session.paid_at || undefined };
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string" || id.length > 64) {
    return new Response("Invalid session ID", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const startTime = Date.now();
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
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
          // Already closed
        }
      };

      // Initial status
      const initial = await getStatus(id);
      if (!initial) {
        send({ error: "Session not found" });
        close();
        return;
      }
      send({ status: initial.status, ...(initial.paidAt && { paidAt: initial.paidAt }) });

      if (initial.status !== "pending") {
        close();
        return;
      }

      // Poll loop
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        // Enforce max stream duration
        if (Date.now() - startTime > MAX_STREAM_MS) {
          send({ status: "expired" });
          clearInterval(interval);
          close();
          return;
        }

        const result = await getStatus(id);
        if (!result) {
          clearInterval(interval);
          close();
          return;
        }

        send({ status: result.status, ...(result.paidAt && { paidAt: result.paidAt }) });

        if (result.status !== "pending") {
          clearInterval(interval);
          close();
        }
      }, POLL_INTERVAL_MS);
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
