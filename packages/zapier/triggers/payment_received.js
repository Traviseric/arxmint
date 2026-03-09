/**
 * Trigger: Payment Received
 *
 * Fires when an ArxMint Lightning payment is confirmed.
 * Uses REST hooks (webhooks) for real-time delivery, with polling fallback.
 */
"use strict";

const subscribeHook = async (z, bundle) => {
  const data = {
    url: bundle.targetUrl,
    event: "payment.completed",
    merchantId: bundle.authData.merchant_id,
  };

  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/webhooks`,
    method: "POST",
    body: data,
  });

  return response.data;
};

const unsubscribeHook = async (z, bundle) => {
  const webhookId = bundle.subscribeData.id;

  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/webhooks/${webhookId}`,
    method: "DELETE",
  });

  return response.data;
};

const getPayment = async (z, bundle) => {
  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/payments`,
    params: {
      merchantId: bundle.authData.merchant_id,
      limit: 10,
      status: "paid",
    },
  });

  return response.data.payments || [];
};

const getFallbackPayments = async (z, bundle) => {
  // Polling fallback for Zapier's 15-minute polling interval
  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/payments`,
    params: {
      merchantId: bundle.authData.merchant_id,
      limit: 3,
      status: "paid",
    },
  });

  const payments = response.data.payments || [];

  // Return sample data if nothing found (required by Zapier for testing)
  if (payments.length === 0) {
    return [
      {
        id: "sample_session_001",
        sessionId: "sample_session_001",
        merchantId: bundle.authData.merchant_id,
        amountSats: 50000,
        amountUsd: "33.50",
        status: "paid",
        paidAt: new Date().toISOString(),
        invoice: "lnbc500u1p...",
        memo: "Sample order for testing",
      },
    ];
  }

  return payments;
};

module.exports = {
  key: "payment_received",
  noun: "Payment",

  display: {
    label: "Payment Received",
    description:
      "Triggers when a Lightning payment is confirmed for your ArxMint merchant account.",
    important: true,
  },

  operation: {
    type: "hook",
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: getPayment,
    performList: getFallbackPayments,

    sample: {
      id: "session_abc123",
      sessionId: "session_abc123",
      merchantId: "my-store",
      amountSats: 50000,
      amountUsd: "33.50",
      status: "paid",
      paidAt: "2026-03-09T12:00:00Z",
      invoice: "lnbc500u1p3xkrsqpp5...",
      memo: "Order #1042 — My Store",
    },

    outputFields: [
      { key: "id", label: "Session ID" },
      { key: "sessionId", label: "Session ID" },
      { key: "merchantId", label: "Merchant ID" },
      { key: "amountSats", label: "Amount (sats)", type: "integer" },
      { key: "amountUsd", label: "Amount (USD)" },
      { key: "status", label: "Status" },
      { key: "paidAt", label: "Paid At", type: "datetime" },
      { key: "invoice", label: "Lightning Invoice" },
      { key: "memo", label: "Memo / Description" },
    ],
  },
};
