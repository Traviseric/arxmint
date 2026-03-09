/**
 * Action: Create Lightning Invoice
 *
 * Creates an ArxMint checkout session / Lightning invoice.
 * Use in Zaps to generate payment requests from any trigger (e.g., new Shopify order).
 */
"use strict";

const createInvoice = async (z, bundle) => {
  const amountSats = parseInt(bundle.inputData.amountSats, 10);
  if (!amountSats || amountSats <= 0) {
    throw new z.errors.HaltedError("amountSats must be a positive integer.");
  }

  const response = await z.request({
    url: `${bundle.authData.base_url || "https://arxmint.com"}/api/checkout`,
    method: "POST",
    body: {
      merchantId: bundle.authData.merchant_id,
      amountSats,
      memo: bundle.inputData.memo || "",
      returnUrl: bundle.inputData.returnUrl || "",
    },
  });

  const data = response.data;

  return {
    id: data.sessionId,
    sessionId: data.sessionId,
    invoice: data.invoice,
    checkoutUrl: `${bundle.authData.base_url || "https://arxmint.com"}/pay/${bundle.authData.merchant_id}?session=${data.sessionId}`,
    amountSats,
    memo: bundle.inputData.memo || "",
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: data.expiresAt || null,
  };
};

module.exports = {
  key: "create_invoice",
  noun: "Invoice",

  display: {
    label: "Create Lightning Invoice",
    description:
      "Creates an ArxMint Lightning invoice (checkout session). Returns the BOLT11 invoice string and a hosted payment link.",
    important: true,
  },

  operation: {
    perform: createInvoice,

    inputFields: [
      {
        key: "amountSats",
        label: "Amount (satoshis)",
        type: "integer",
        required: true,
        helpText:
          "Payment amount in satoshis (1 BTC = 100,000,000 sats). For USD amounts, convert first using a rate lookup step.",
      },
      {
        key: "memo",
        label: "Memo / Description",
        type: "string",
        required: false,
        helpText:
          "Shown to the payer on their Lightning wallet (e.g., 'Order #1042 — My Store').",
      },
      {
        key: "returnUrl",
        label: "Return URL",
        type: "string",
        required: false,
        helpText:
          "Where to redirect the customer after payment. Defaults to your ArxMint dashboard.",
      },
    ],

    sample: {
      id: "session_abc123",
      sessionId: "session_abc123",
      invoice: "lnbc500u1p3xkrsqpp5...",
      checkoutUrl: "https://arxmint.com/pay/my-store?session=session_abc123",
      amountSats: 50000,
      memo: "Order #1042 — My Store",
      status: "pending",
      createdAt: "2026-03-09T12:00:00Z",
      expiresAt: "2026-03-09T12:30:00Z",
    },

    outputFields: [
      { key: "id", label: "Session ID" },
      { key: "sessionId", label: "Session ID" },
      { key: "invoice", label: "Lightning Invoice (BOLT11)" },
      { key: "checkoutUrl", label: "Hosted Payment URL" },
      { key: "amountSats", label: "Amount (sats)", type: "integer" },
      { key: "memo", label: "Memo" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created At", type: "datetime" },
      { key: "expiresAt", label: "Expires At", type: "datetime" },
    ],
  },
};
