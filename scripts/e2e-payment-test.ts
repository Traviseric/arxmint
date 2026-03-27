#!/usr/bin/env node
// ============================================================
// ArxMint — E2E Payment Verification Script
// Usage: npx tsx scripts/e2e-payment-test.ts [--base-url <url>] [--merchant <id>]
//
// Tests:
//   1. POST /api/checkout          — create session
//   2. GET  /api/checkout/status   — initial status is "pending"
//   3. SSE  /api/checkout/status   — stream emits events
//   4. GET  /api/checkout/health   — config check
//   5. POST /api/checkout/webhook  — webhook delivery logging (demo only)
//
// In demo/dev mode the session auto-settles after 5 s; pass --wait-paid
// to poll until "paid" is received (works in dev mode without real LNbits).
// ============================================================

const DEFAULT_BASE_URL = process.env.ARXMINT_URL ?? "http://localhost:3000";
const DEFAULT_MERCHANT = "seed-black-bear";
const AMOUNT_SATS = 1;

// ---- CLI args ----
const args = process.argv.slice(2);
const baseUrl = args[args.indexOf("--base-url") + 1] ?? DEFAULT_BASE_URL;
const merchantId = args[args.indexOf("--merchant") + 1] ?? DEFAULT_MERCHANT;
const waitPaid = args.includes("--wait-paid");

// ---- helpers ----
let pass = 0;
let fail = 0;

function ok(label: string) {
  console.log(`  ✓ ${label}`);
  pass++;
}

function ko(label: string, detail?: string) {
  console.error(`  ✗ ${label}${detail ? `\n    ${detail}` : ""}`);
  fail++;
}

async function fetchJson(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, body: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, body: text };
  }
}

// ---- Step 1: Health check ----
async function checkHealth() {
  console.log("\n──── Step 1 — Health check ────");
  try {
    const result = (await fetchJson(`${baseUrl}/api/checkout/health`)) as {
      ok: boolean;
      status: number;
      body: { status: string; demoMode: boolean; lnbits: { urlConfigured: boolean; invoiceKeyConfigured: boolean; reachable: boolean | null } };
    };
    const body = result.body;
    if (body.status === "ok" || body.status === "demo") {
      ok(`/api/checkout/health → ${body.status} (demoMode=${body.demoMode})`);
    } else if (body.status === "degraded") {
      ok(`/api/checkout/health → degraded (LNbits configured but unreachable)`);
    } else {
      ko("/api/checkout/health", `status=${body.status} — LNBITS_URL or LNBITS_INVOICE_KEY not set`);
    }
    console.log(`    lnbitsUrl=${body.lnbits.urlConfigured}  invoiceKey=${body.lnbits.invoiceKeyConfigured}  reachable=${body.lnbits.reachable}`);
  } catch (e) {
    ko("/api/checkout/health", String(e));
  }
}

// ---- Step 2: Create checkout session ----
let sessionId = "";
let invoice = "";
let demoMode = false;

async function createSession() {
  console.log("\n──── Step 2 — Create checkout session ────");
  try {
    const result = (await fetchJson(`${baseUrl}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, amountSats: AMOUNT_SATS, memo: "e2e-test" }),
    })) as { ok: boolean; status: number; body: { sessionId?: string; invoice?: string; demoMode?: boolean; error?: string } };

    if (!result.ok || !result.body.sessionId) {
      ko("POST /api/checkout", `HTTP ${result.status} — ${JSON.stringify(result.body)}`);
      return false;
    }

    sessionId = result.body.sessionId!;
    invoice = result.body.invoice!;
    demoMode = Boolean(result.body.demoMode);

    ok(`POST /api/checkout → sessionId=${sessionId.slice(0, 12)}...`);
    console.log(`    invoice=${invoice.slice(0, 40)}...`);
    console.log(`    demoMode=${demoMode}`);
    return true;
  } catch (e) {
    ko("POST /api/checkout", String(e));
    return false;
  }
}

// ---- Step 3: Initial status check ----
async function checkInitialStatus() {
  console.log("\n──── Step 3 — Initial status is pending ────");
  try {
    const result = (await fetchJson(`${baseUrl}/api/checkout/status/${sessionId}`)) as {
      ok: boolean;
      status: number;
      body: { status?: string; error?: string };
    };

    if (result.body.status === "pending") {
      ok(`GET /api/checkout/status/${sessionId.slice(0, 12)}... → pending`);
    } else {
      ko(`GET /api/checkout/status`, `Expected 'pending', got '${result.body.status}' — ${JSON.stringify(result.body)}`);
    }
  } catch (e) {
    ko("GET /api/checkout/status", String(e));
  }
}

// ---- Step 4: SSE stream emits at least one event ----
async function checkSSE() {
  console.log("\n──── Step 4 — SSE stream emits events ────");
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      ko("SSE /api/checkout/status (stream)", "No event received within 6s timeout");
      resolve();
    }, 6_000);

    let settled = false;

    async function readStream() {
      try {
        const res = await fetch(`${baseUrl}/api/checkout/status/${sessionId}`, {
          headers: { Accept: "text/event-stream" },
          signal: AbortSignal.timeout(6_000),
        });

        if (!res.ok || !res.body) {
          ko("SSE /api/checkout/status", `HTTP ${res.status}`);
          clearTimeout(timeout);
          resolve();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          if (buffer.includes("data:") && !settled) {
            settled = true;
            clearTimeout(timeout);
            const line = buffer.split("\n").find((l) => l.startsWith("data:")) ?? "";
            ok(`SSE stream emitted event: ${line.slice(0, 80)}`);
            reader.cancel().catch(() => {});
            resolve();
            return;
          }
        }
      } catch (e) {
        if (!settled) {
          ko("SSE /api/checkout/status", String(e));
          clearTimeout(timeout);
          resolve();
        }
      }
    }

    readStream();
  });
}

// ---- Step 5 (optional): Poll until paid ----
async function pollUntilPaid(maxWaitMs = 30_000) {
  console.log("\n──── Step 5 — Poll until paid ────");
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const result = (await fetchJson(`${baseUrl}/api/checkout/status/${sessionId}`)) as {
        ok: boolean;
        body: { status?: string; paidAt?: string };
      };
      if (result.body.status === "paid") {
        ok(`Session settled as 'paid' (paidAt=${result.body.paidAt ?? "?"})`);
        return;
      }
      if (result.body.status === "expired") {
        ko("Poll for paid", "Session expired before payment confirmed");
        return;
      }
    } catch (e) {
      ko("Poll for paid", String(e));
      return;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  ko("Poll for paid", `Timed out after ${maxWaitMs / 1000}s — still pending`);
}

// ---- Step 6: Webhook delivery (demo only) ----
async function testWebhook() {
  console.log("\n──── Step 6 — Webhook delivery (demo) ────");
  if (!demoMode) {
    console.log("    Skipping — not in demo mode (real LNbits handles payment → webhook)");
    return;
  }
  try {
    const result = (await fetchJson(`${baseUrl}/api/checkout/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })) as { ok: boolean; status: number; body: { success?: boolean; error?: string } };

    if (result.body.success) {
      ok(`POST /api/checkout/webhook → success`);
    } else {
      ko("POST /api/checkout/webhook", `HTTP ${result.status} — ${JSON.stringify(result.body)}`);
    }
  } catch (e) {
    ko("POST /api/checkout/webhook", String(e));
  }
}

// ---- Main ----
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  ArxMint E2E Payment Verification Test ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`  base URL : ${baseUrl}`);
  console.log(`  merchant : ${merchantId}`);
  console.log(`  amount   : ${AMOUNT_SATS} sat`);

  await checkHealth();
  const created = await createSession();

  if (created) {
    await checkInitialStatus();
    await checkSSE();
    if (waitPaid || demoMode) {
      await pollUntilPaid();
    }
    await testWebhook();
  }

  console.log("\n════════════════════════════════════════");
  console.log(`  Passed: ${pass}  Failed: ${fail}`);
  console.log(fail === 0 ? "  RESULT: PASS" : "  RESULT: FAIL");
  console.log("════════════════════════════════════════\n");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
