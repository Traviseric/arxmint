// ============================================================
// ArxMint — LNbits Test Mock
//
// In-memory mock for LNbits API interactions.
// Provides a fetch-compatible handler that simulates the LNbits
// invoice creation and payment status endpoints.
//
// Usage in tests:
//   import { createLNbitsMockFetch, simulatePaymentReceived, resetLNbitsMock } from "./helpers/lnbits-mock.ts";
//   global.fetch = createLNbitsMockFetch();
//   const inv = mockCreateInvoice(100, "test");
//   simulatePaymentReceived(inv.paymentHash); // mark as paid
// ============================================================

export interface MockInvoice {
  paymentHash: string;
  paymentRequest: string;
  checkingId: string;
  paid: boolean;
  preimage: string;
}

const _mockInvoices = new Map<string, MockInvoice>();
let _invoiceCounter = 0;

/**
 * Create a mock invoice and register it in the in-memory store.
 * The invoice is initially unpaid.
 */
export function mockCreateInvoice(amountSats: number, memo = "test"): MockInvoice {
  _invoiceCounter++;
  const n = _invoiceCounter;
  const paymentHash = `mock_hash_${n.toString().padStart(4, "0")}_${memo.slice(0, 8).replace(/\s/g, "_")}`;
  const invoice: MockInvoice = {
    paymentHash,
    paymentRequest: `lnbc${amountSats}n1mocktest${paymentHash.slice(5, 25)}payreq`,
    checkingId: `mock_checking_${n.toString().padStart(4, "0")}`,
    paid: false,
    preimage: `preimage_${n.toString().padStart(4, "0")}_${"a".repeat(32)}`,
  };
  _mockInvoices.set(paymentHash, invoice);
  return invoice;
}

/**
 * Mark an invoice as paid (simulates LNbits receiving a payment).
 * Throws if the payment hash is not known.
 */
export function simulatePaymentReceived(paymentHash: string): MockInvoice {
  const invoice = _mockInvoices.get(paymentHash);
  if (!invoice) {
    throw new Error(
      `simulatePaymentReceived: no mock invoice for hash "${paymentHash}". ` +
      `Did you call mockCreateInvoice() first?`
    );
  }
  invoice.paid = true;
  return invoice;
}

/**
 * Look up a mock invoice by payment hash. Returns undefined if not found.
 */
export function getMockInvoice(paymentHash: string): MockInvoice | undefined {
  return _mockInvoices.get(paymentHash);
}

/**
 * Reset all mock invoices. Call in test teardown to prevent state leaks.
 */
export function resetLNbitsMock(): void {
  _mockInvoices.clear();
  _invoiceCounter = 0;
}

/**
 * Create a fetch handler that intercepts LNbits API calls and serves
 * responses from the in-memory mock store.
 *
 * Handles:
 *   POST <any>/api/v1/payments            — create invoice
 *   GET  <any>/api/v1/payments/<hash>     — check payment status
 *   GET  <any>/api/v1/health              — returns { status: "ok" }
 *   Everything else                       — 404
 *
 * @param fallback  Optional fallback fetch for non-LNbits URLs.
 */
export function createLNbitsMockFetch(
  fallback?: typeof global.fetch
): typeof global.fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);

    // Health check
    if (/\/api\/v1\/health$/.test(url)) {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /api/v1/payments — create invoice
    if (/\/api\/v1\/payments$/.test(url) && (init?.method ?? "GET").toUpperCase() === "POST") {
      const body = JSON.parse((init?.body as string) ?? "{}");
      const inv = mockCreateInvoice(body.amount ?? 0, body.memo ?? "test");
      return new Response(
        JSON.stringify({
          payment_hash: inv.paymentHash,
          payment_request: inv.paymentRequest,
          checking_id: inv.checkingId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // GET /api/v1/payments/<hash> — payment status
    const statusMatch = url.match(/\/api\/v1\/payments\/([^/?]+)(?:\?.*)?$/);
    if (statusMatch && !url.endsWith("/payments")) {
      const hash = statusMatch[1];
      const inv = _mockInvoices.get(hash);
      if (!inv) {
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ paid: inv.paid, preimage: inv.paid ? inv.preimage : null }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (fallback) return fallback(input, init);
    return new Response("Not mocked", { status: 404 });
  };
}
