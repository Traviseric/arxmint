import { test } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// PaymentStateMachine — pure TypeScript mirror of usePayment() hook logic.
//
// usePayment() is a React hook (useState / useCallback / useRef) and cannot
// be called outside a React render tree without a DOM or react-test-renderer.
// This class replicates the identical state-transition logic so we can verify
// it with the standard `node:test` runner (no DOM required).
// ---------------------------------------------------------------------------

type PaymentStatus = "idle" | "pending" | "paid" | "expired" | "failed" | "error";

interface MockClient {
  createCheckout: (opts: { amount: number }) => Promise<{ id: string; invoice: string; expiresAt: number }>;
  getPaymentStatus: (id: string) => Promise<{ status: string }>;
}

class PaymentStateMachine {
  status: PaymentStatus = "idle";
  invoice: string | null = null;
  paymentId: string | null = null;
  expiresAt: number | null = null;
  error: Error | null = null;

  private client: MockClient;
  private pollInterval: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(client: MockClient, pollInterval = 50) {
    this.client = client;
    this.pollInterval = pollInterval;
  }

  async createPayment(amount: number): Promise<void> {
    if (!amount || amount <= 0) {
      this.error = new Error("amount must be a positive integer (sats)");
      return;
    }

    this.error = null;
    this.status = "pending";
    this.stopPolling();

    try {
      const checkout = await this.client.createCheckout({ amount });
      this.invoice = checkout.invoice;
      this.paymentId = checkout.id;
      this.expiresAt = checkout.expiresAt;

      this.pollTimer = setInterval(async () => {
        try {
          const result = await this.client.getPaymentStatus(checkout.id);
          if (result.status === "paid") {
            this.status = "paid";
            this.stopPolling();
          } else if (result.status === "expired" || result.status === "failed") {
            this.status = result.status as PaymentStatus;
            this.stopPolling();
          }
        } catch {
          // ignore transient poll errors (same as hook)
        }
      }, this.pollInterval);
    } catch (err) {
      this.status = "idle";
      this.error = err instanceof Error ? err : new Error(String(err));
      this.stopPolling();
    }
  }

  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  reset(): void {
    this.stopPolling();
    this.status = "idle";
    this.invoice = null;
    this.paymentId = null;
    this.expiresAt = null;
    this.error = null;
  }
}

// Helper: wait for next event-loop tick(s) so interval callbacks can fire
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- 1. Initial state ----

test("initial status is idle", () => {
  const sm = new PaymentStateMachine({
    createCheckout: async () => ({ id: "pay_1", invoice: "lnbc...", expiresAt: 9999 }),
    getPaymentStatus: async () => ({ status: "pending" }),
  });
  assert.equal(sm.status, "idle");
  assert.equal(sm.invoice, null);
  assert.equal(sm.paymentId, null);
  assert.equal(sm.error, null);
});

// ---- 2. start() → pending ----

test("createPayment() with valid amount transitions status to pending immediately", async () => {
  let resolveCheckout!: (v: { id: string; invoice: string; expiresAt: number }) => void;
  const checkoutPromise = new Promise<{ id: string; invoice: string; expiresAt: number }>(
    (res) => { resolveCheckout = res; }
  );

  const sm = new PaymentStateMachine({
    createCheckout: () => checkoutPromise,
    getPaymentStatus: async () => ({ status: "pending" }),
  });

  const pending = sm.createPayment(1000);
  // status flips to pending synchronously before the await resolves
  assert.equal(sm.status, "pending");

  resolveCheckout({ id: "pay_2", invoice: "lnbc_invoice", expiresAt: Date.now() + 3600_000 });
  await pending;

  sm.stopPolling();
});

test("createPayment() with zero amount sets error and does NOT transition to pending", async () => {
  const sm = new PaymentStateMachine({
    createCheckout: async () => { throw new Error("should not be called"); },
    getPaymentStatus: async () => ({ status: "pending" }),
  });
  await sm.createPayment(0);
  assert.equal(sm.status, "idle");
  assert.ok(sm.error instanceof Error);
  assert.match(sm.error.message, /positive integer/);
});

test("createPayment() with negative amount sets error", async () => {
  const sm = new PaymentStateMachine({
    createCheckout: async () => { throw new Error("should not be called"); },
    getPaymentStatus: async () => ({ status: "pending" }),
  });
  await sm.createPayment(-50);
  assert.equal(sm.status, "idle");
  assert.ok(sm.error instanceof Error);
});

// ---- 3. Paid transition ----

test("status transitions to paid when poll returns paid", async () => {
  const sm = new PaymentStateMachine(
    {
      createCheckout: async () => ({ id: "pay_3", invoice: "lnbc_paid", expiresAt: 9999 }),
      getPaymentStatus: async () => ({ status: "paid" }),
    },
    10 // fast poll for test
  );

  await sm.createPayment(500);
  // wait enough time for the first poll interval to fire
  await wait(50);

  assert.equal(sm.status, "paid");
  assert.equal(sm.invoice, "lnbc_paid");
  assert.equal(sm.paymentId, "pay_3");
});

test("status transitions to expired when poll returns expired", async () => {
  const sm = new PaymentStateMachine(
    {
      createCheckout: async () => ({ id: "pay_4", invoice: "lnbc_exp", expiresAt: 1 }),
      getPaymentStatus: async () => ({ status: "expired" }),
    },
    10
  );

  await sm.createPayment(100);
  await wait(50);

  assert.equal(sm.status, "expired");
});

// ---- 4. Error transition ----

test("status returns to idle and error is set when createCheckout throws", async () => {
  const sm = new PaymentStateMachine({
    createCheckout: async () => { throw new Error("network failure"); },
    getPaymentStatus: async () => ({ status: "pending" }),
  });

  await sm.createPayment(1000);

  assert.equal(sm.status, "idle");
  assert.ok(sm.error instanceof Error);
  assert.match(sm.error.message, /network failure/);
});

test("poll errors are swallowed (status stays pending)", async () => {
  let callCount = 0;
  const sm = new PaymentStateMachine(
    {
      createCheckout: async () => ({ id: "pay_5", invoice: "lnbc_err", expiresAt: 9999 }),
      getPaymentStatus: async () => {
        callCount++;
        throw new Error("transient poll error");
      },
    },
    10
  );

  await sm.createPayment(200);
  await wait(50);

  // status should still be pending — poll errors are ignored
  assert.equal(sm.status, "pending");
  assert.ok(callCount >= 1, "poll was called at least once");
  sm.stopPolling();
});

// ---- 5. reset() ----

test("reset() returns status to idle and clears invoice/paymentId", async () => {
  const sm = new PaymentStateMachine(
    {
      createCheckout: async () => ({ id: "pay_6", invoice: "lnbc_reset", expiresAt: 9999 }),
      getPaymentStatus: async () => ({ status: "pending" }),
    },
    10
  );

  await sm.createPayment(300);
  assert.equal(sm.status, "pending");
  assert.notEqual(sm.invoice, null);

  sm.reset();

  assert.equal(sm.status, "idle");
  assert.equal(sm.invoice, null);
  assert.equal(sm.paymentId, null);
  assert.equal(sm.expiresAt, null);
  assert.equal(sm.error, null);
});

test("reset() clears error state", async () => {
  const sm = new PaymentStateMachine({
    createCheckout: async () => { throw new Error("fail"); },
    getPaymentStatus: async () => ({ status: "pending" }),
  });

  await sm.createPayment(100);
  assert.ok(sm.error !== null);

  sm.reset();
  assert.equal(sm.error, null);
  assert.equal(sm.status, "idle");
});
