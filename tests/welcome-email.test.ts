import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Register @/ path alias so lib/email.ts can resolve @/lib/logger
register(new URL("./helpers/at-resolver.mjs", import.meta.url));

// @ts-ignore -- dynamic import required so the hook above takes effect first
const {
  sendMerchantWelcomeEmail,
  sendInvoiceEmail,
  _setResendForTesting,
} = await import("../lib/email.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockResend() {
  const sendFn = mock.fn(async (_opts: unknown) => ({ id: "test-email-id-001" }));
  const instance = { emails: { send: sendFn } };
  return { instance, sendFn };
}

function merchantData(overrides: Partial<{
  businessName: string;
  email: string;
  merchantId: string;
  merchantNumber: number;
}> = {}) {
  return {
    businessName: overrides.businessName ?? "Test Shop",
    email: overrides.email ?? "owner@testshop.com",
    merchantId: overrides.merchantId ?? "test-merchant-001",
    merchantNumber: overrides.merchantNumber ?? 1,
    payLink: `https://www.arxmint.com/pay/${overrides.merchantId ?? "test-merchant-001"}`,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test("sendMerchantWelcomeEmail returns false when RESEND_API_KEY is not set", async () => {
  // No injected instance and no env var → getResend() returns null
  _setResendForTesting(null);
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  try {
    const result = await sendMerchantWelcomeEmail(merchantData());
    assert.equal(result, false, "should return false when unconfigured");
  } finally {
    if (saved !== undefined) process.env.RESEND_API_KEY = saved;
    else delete process.env.RESEND_API_KEY;
  }
});

test("sendMerchantWelcomeEmail sends email with correct recipient and subject", async () => {
  const { instance, sendFn } = makeMockResend();
  _setResendForTesting(instance as never);

  const result = await sendMerchantWelcomeEmail({
    businessName: "Black Bear Window Cleaning",
    email: "evan@blackbearwindowcleaning.com",
    merchantId: "seed-black-bear",
    merchantNumber: 2,
    payLink: "https://www.arxmint.com/pay/seed-black-bear",
    location: "Boulder, CO",
  });

  assert.equal(result, true, "should return true on success");
  assert.equal(sendFn.mock.calls.length, 1, "Resend.emails.send called once");

  const callArgs = sendFn.mock.calls[0].arguments[0] as {
    to: string;
    subject: string;
    from: string;
    html: string;
  };
  assert.equal(callArgs.to, "evan@blackbearwindowcleaning.com", "correct recipient");
  assert.match(callArgs.subject, /welcome|arxmint|founding/i, "subject mentions ArxMint or welcome");
  assert.match(callArgs.from, /arxmint/i, "sent from ArxMint address");
  assert.ok(
    callArgs.html.includes("Black Bear Window Cleaning"),
    "HTML should include the business name"
  );
  assert.ok(
    callArgs.html.includes("https://www.arxmint.com/pay/seed-black-bear"),
    "HTML should include the pay link"
  );
});

test("sendMerchantWelcomeEmail includes merchant number in subject", async () => {
  const { instance, sendFn } = makeMockResend();
  _setResendForTesting(instance as never);

  await sendMerchantWelcomeEmail(merchantData({ merchantNumber: 7 }));

  const subject = (sendFn.mock.calls[0].arguments[0] as { subject: string }).subject;
  assert.ok(subject.includes("7"), "subject should include merchant number");
});

test("sendMerchantWelcomeEmail returns false without throwing when Resend rejects", async () => {
  // Simulate Resend being down — merchant creation must still succeed
  const failSend = mock.fn(async () => {
    throw new Error("Resend service unavailable");
  });
  _setResendForTesting({ emails: { send: failSend } } as never);

  // Must NOT throw — the pledge route calls this fire-and-forget
  const result = await sendMerchantWelcomeEmail(merchantData());
  assert.equal(result, false, "should return false on error, never throw");
  assert.equal(failSend.mock.calls.length, 1, "attempted the send");
});

test("sendInvoiceEmail sends to correct recipient with amount in subject", async () => {
  const { instance, sendFn } = makeMockResend();
  _setResendForTesting(instance as never);

  const result = await sendInvoiceEmail({
    to: "customer@example.com",
    merchantName: "Glacier Ice Cream",
    amountSats: 500,
    amountUsd: "0.50",
    paymentUrl: "https://www.arxmint.com/pay/seed-glacier?session=abc123",
    sessionId: "abc123",
    memo: "One scoop, chocolate",
  });

  assert.equal(result, true);
  assert.equal(sendFn.mock.calls.length, 1);

  const callArgs = sendFn.mock.calls[0].arguments[0] as {
    to: string;
    subject: string;
    html: string;
  };
  assert.equal(callArgs.to, "customer@example.com");
  assert.match(callArgs.subject, /500|glacier|payment/i);
  assert.ok(callArgs.html.includes("Glacier Ice Cream"), "HTML includes merchant name");
});

test("sendInvoiceEmail returns false without throwing when Resend rejects", async () => {
  const failSend = mock.fn(async () => {
    throw new Error("Network error");
  });
  _setResendForTesting({ emails: { send: failSend } } as never);

  const result = await sendInvoiceEmail({
    to: "customer@example.com",
    merchantName: "Test Merchant",
    amountSats: 1000,
    amountUsd: null,
    paymentUrl: "https://www.arxmint.com/pay/test",
    sessionId: "sess-001",
  });

  assert.equal(result, false, "should return false when Resend throws, never throw");
});
