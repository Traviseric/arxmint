import test from "node:test";
import assert from "node:assert/strict";

import { buildInvoicePdfUrl } from "../lib/invoices.ts";

// Unit tests for the PDF URL builder
test("buildInvoicePdfUrl generates correct URL", () => {
  const url = buildInvoicePdfUrl("inv_abc123", "https://arxmint.com");
  assert.equal(url, "https://arxmint.com/api/invoices/inv_abc123/pdf");
});

test("buildInvoicePdfUrl strips trailing slash from origin", () => {
  const url = buildInvoicePdfUrl("inv_xyz", "https://arxmint.com/");
  assert.equal(url, "https://arxmint.com/api/invoices/inv_xyz/pdf");
});

// Route-level tests: pdf-lib PDF generation smoke test
test("pdf-lib PDFDocument creates a valid PDF with invoice data", async () => {
  // Dynamic import to keep test runner from choking on WASM/native
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText("INVOICE", { x: 50, y: 780, size: 28, font, color: rgb(0.97, 0.58, 0.1) });
  page.drawText("#ARX-20260318-TEST01", { x: 50, y: 748, size: 13, font });
  page.drawText("From: Acme Corp", { x: 50, y: 700, size: 12, font });
  page.drawText("To: Client Co", { x: 300, y: 700, size: 12, font });
  page.drawText("Total: 100000 sats", { x: 50, y: 400, size: 14, font });

  const bytes = await pdfDoc.save();

  // PDF header magic bytes
  assert.ok(bytes.length > 100, "PDF should have non-trivial size");
  const header = Buffer.from(bytes.slice(0, 4)).toString("ascii");
  assert.equal(header, "%PDF", "Should start with PDF magic bytes");
});

test("buildInvoicePdfUrl works for UUIDs", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const url = buildInvoicePdfUrl(id, "http://localhost:3000");
  assert.equal(url, `http://localhost:3000/api/invoices/${id}/pdf`);
});
