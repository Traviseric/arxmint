import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInvoicePaymentLink,
  buildInvoiceStateChangedPayload,
  calculateInvoiceSummary,
  resolveInvoiceTransition,
  shouldMarkInvoiceOverdue,
} from "../lib/invoices.ts";
import {
  parseTeneoActiveOrg,
  parseTeneoAuthOrgs,
} from "../lib/teneo-jwt.ts";

function buildJwt(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.fakesig`;
}

test("calculateInvoiceSummary totals line items in minor units", () => {
  const summary = calculateInvoiceSummary([
    { description: "Shift coverage", quantity: 2, unitAmountMinor: 15000 },
    { description: "After-hours support", quantity: 1, unitAmountMinor: 5000 },
  ]);

  assert.equal(summary.subtotalMinor, 35000);
  assert.equal(summary.totalMinor, 35000);
  assert.equal(summary.normalizedLineItems[0].totalAmountMinor, 30000);
  assert.equal(summary.normalizedLineItems[1].totalAmountMinor, 5000);
});

test("calculateInvoiceSummary supports window-cleaning service line items", () => {
  const summary = calculateInvoiceSummary([
    { description: "Exterior window cleaning", quantity: 18, unitAmountMinor: 450 },
    { description: "Screen cleaning", quantity: 12, unitAmountMinor: 200 },
  ]);

  assert.equal(summary.subtotalMinor, 10500);
  assert.equal(summary.totalMinor, 10500);
  assert.equal(summary.normalizedLineItems[0].totalAmountMinor, 8100);
  assert.equal(summary.normalizedLineItems[1].totalAmountMinor, 2400);
});

test("resolveInvoiceTransition enforces draft to sent to paid flow", () => {
  const sent = resolveInvoiceTransition("draft", "send");
  assert.equal(sent.status, "sent");
  assert.ok(sent.sentAt instanceof Date);

  const paid = resolveInvoiceTransition("sent", "mark_paid");
  assert.equal(paid.status, "paid");
  assert.ok(paid.paidAt instanceof Date);

  assert.throws(() => resolveInvoiceTransition("draft", "mark_paid"));
});

test("shouldMarkInvoiceOverdue only marks sent invoices past due", () => {
  const now = new Date("2026-03-16T12:00:00.000Z");
  assert.equal(
    shouldMarkInvoiceOverdue("sent", "2026-03-15T12:00:00.000Z", now),
    true
  );
  assert.equal(
    shouldMarkInvoiceOverdue("draft", "2026-03-15T12:00:00.000Z", now),
    false
  );
});

test("buildInvoicePaymentLink prefers merchant pay pages when merchant is linked", () => {
  const url = buildInvoicePaymentLink(
    {
      id: "inv_123",
      merchantId: "seed-teneo",
      paymentRail: "lightning",
    },
    "https://arxmint.test"
  );

  assert.equal(
    url,
    "https://arxmint.test/pay/seed-teneo?invoiceId=inv_123"
  );
});

test("buildInvoicePaymentLink keeps window-cleaner invoice ids on the pay page", () => {
  const url = buildInvoicePaymentLink(
    {
      id: "inv_window_001",
      merchantId: "seed-black-bear",
      paymentRail: "lightning",
    },
    "https://arxmint.test/"
  );

  assert.equal(
    url,
    "https://arxmint.test/pay/seed-black-bear?invoiceId=inv_window_001"
  );
});

test("buildInvoiceStateChangedPayload produces invoice event data", () => {
  const payload = buildInvoiceStateChangedPayload(
    {
      id: "inv_123",
      invoiceNumber: "ARX-20260316-ABC123",
      fromOrgId: "org_glacier",
      fromOrgName: "Glacier",
      toOrgId: "org_vendor",
      toOrgName: "Vendor",
      merchantId: "seed-teneo",
      status: "paid",
      currency: "BTC",
      paymentRail: "lightning",
      subtotalMinor: 25000,
      totalMinor: 25000,
      dueDate: "2026-03-20T00:00:00.000Z",
      sentAt: "2026-03-16T00:00:00.000Z",
      paidAt: "2026-03-16T01:00:00.000Z",
      paymentSessionId: "sess_123",
      paymentLink: "https://arxmint.test/pay/seed-teneo?invoiceId=inv_123",
    },
    "sent",
    [
      {
        description: "Payroll coverage",
        quantity: 1,
        unitAmountMinor: 25000,
        totalAmountMinor: 25000,
      },
    ]
  );

  assert.equal(payload.event, "invoice.state_changed");
  assert.equal(payload.data.previousStatus, "sent");
  assert.equal(payload.data.status, "paid");
  assert.equal(payload.data.totalMinor, 25000);
  assert.equal(payload.data.lineItems[0].description, "Payroll coverage");
});

test("parseTeneoAuthOrgs and parseTeneoActiveOrg extract org context", () => {
  const token = buildJwt({
    sites: { arxmint: { orgId: "org_vendor" } },
    orgs: [
      { id: "org_glacier", slug: "glacier", name: "Glacier", role: "owner" },
      { id: "org_vendor", slug: "vendor", name: "Vendor", role: "admin" },
    ],
  });

  const orgs = parseTeneoAuthOrgs(token);
  const activeOrg = parseTeneoActiveOrg(token, "arxmint");

  assert.equal(orgs.length, 2);
  assert.equal(activeOrg?.id, "org_vendor");
  assert.equal(activeOrg?.slug, "vendor");
});
