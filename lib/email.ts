// ============================================================
// ArxMint — Email Client (Resend)
// Transactional emails for merchant onboarding and notifications.
// Free tier: 3,000 emails/month.
// ============================================================

import { Resend } from "resend";
import { logger } from "@/lib/logger";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("email_not_configured", { reason: "RESEND_API_KEY not set" });
    return null;
  }
  _resend = new Resend(apiKey);
  return _resend;
}

/** Test-only: inject a mock Resend instance to avoid real API calls. */
export function _setResendForTesting(instance: Resend | null): void {
  _resend = instance;
}

const FROM_ADDRESS = "ArxMint <onboarding@arxmint.com>";

export interface MerchantWelcomeEmailData {
  businessName: string;
  email: string;
  merchantId: string;
  merchantNumber: number;
  payLink: string;
  location?: string;
}

/**
 * Send welcome email to newly signed-up merchant.
 * Includes their pay link, QR code, and next steps.
 */
export async function sendMerchantWelcomeEmail(
  data: MerchantWelcomeEmailData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.payLink)}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.email,
      subject: `Welcome to ArxMint — You're Founding Merchant #${data.merchantNumber}!`,
      html: buildWelcomeHtml(data, qrUrl),
    });
    logger.info("email_sent", {
      type: "merchant_welcome",
      merchantId: data.merchantId,
    });
    return true;
  } catch (error) {
    logger.warn("email_send_failed", {
      type: "merchant_welcome",
      merchantId: data.merchantId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export interface InvoiceEmailData {
  to: string;
  merchantName: string;
  amountSats: number;
  amountUsd: string | null;
  paymentUrl: string;
  sessionId: string;
  memo?: string | null;
}

/**
 * Send a payment request / invoice email to a customer on behalf of a merchant.
 * Returns true on success, false on failure (never throws).
 */
export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const subject = `Payment request from ${data.merchantName} — ${data.amountSats.toLocaleString()} sats`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.to,
      subject,
      html: buildInvoiceHtml(data),
    });
    logger.info("email_sent", { type: "invoice", sessionId: data.sessionId });
    return true;
  } catch (error) {
    logger.warn("email_send_failed", {
      type: "invoice",
      sessionId: data.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ---- Payment notification emails ----

export interface PaymentReceivedEmailData {
  to: string;
  merchantName: string;
  amountSats: number;
  amountUsd: string | null;
  sessionId: string;
  paidAt: string;
}

/**
 * Send "payment received" notification to merchant.
 * Returns true on success, false on failure (never throws).
 */
export async function sendPaymentReceivedEmail(
  data: PaymentReceivedEmailData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const shortId = data.sessionId.slice(0, 8).toUpperCase();
  const usdPart = data.amountUsd ? `$${data.amountUsd}` : `${data.amountSats.toLocaleString()} sats`;
  const subject = `Payment received: ${usdPart} — Checkout #${shortId}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.to,
      subject,
      html: buildPaymentReceivedHtml(data, shortId),
    });
    logger.info("email_sent", { type: "payment_received", sessionId: data.sessionId });
    return true;
  } catch (error) {
    logger.warn("email_send_failed", {
      type: "payment_received",
      sessionId: data.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export interface PaymentReceiptEmailData {
  to: string;
  merchantName: string;
  amountSats: number;
  amountUsd: string | null;
  sessionId: string;
  paidAt: string;
}

/**
 * Send payment receipt to customer (only if customer email is available).
 * Returns true on success, false on failure (never throws).
 */
export async function sendPaymentReceiptEmail(
  data: PaymentReceiptEmailData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const usdPart = data.amountUsd ? `$${data.amountUsd}` : `${data.amountSats.toLocaleString()} sats`;
  const subject = `Receipt: Your ${usdPart} payment to ${data.merchantName}`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.to,
      subject,
      html: buildPaymentReceiptHtml(data),
    });
    logger.info("email_sent", { type: "payment_receipt", sessionId: data.sessionId });
    return true;
  } catch (error) {
    logger.warn("email_send_failed", {
      type: "payment_receipt",
      sessionId: data.sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function buildPaymentReceivedHtml(data: PaymentReceivedEmailData, shortId: string): string {
  const timestamp = new Date(data.paidAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="background:#F7931A;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="font-size:22px;color:#fff;margin:0;">Payment Received</h1>
      <p style="font-size:14px;color:rgba(255,255,255,0.85);margin:4px 0 0;">${data.merchantName}</p>
    </div>

    <!-- Main card -->
    <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;padding:32px;margin-bottom:24px;">

      <!-- Amount -->
      <div style="text-align:center;padding:24px 0;border-bottom:1px solid #f0f0f0;margin-bottom:24px;">
        <p style="font-size:13px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Amount Received</p>
        <p style="font-size:32px;font-weight:700;color:#171717;margin:0;">
          ${data.amountSats.toLocaleString()} sats
        </p>
        ${data.amountUsd ? `<p style="font-size:16px;color:#888;margin:4px 0 0;">&#8776; $${data.amountUsd} USD</p>` : ""}
      </div>

      <!-- Details -->
      <table style="width:100%;font-size:14px;color:#333;margin-bottom:24px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#888;">Checkout Reference</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;">#${shortId}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;">Confirmed</td>
          <td style="padding:8px 0;text-align:right;">${timestamp}</td>
        </tr>
      </table>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="https://arxmint.com/merchant-dashboard"
           style="display:inline-block;background:#F7931A;color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">
          View in Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:13px;color:#aaa;margin:0;">
        Powered by <a href="https://arxmint.com" style="color:#F7931A;text-decoration:none;">ArxMint</a>
        — Bitcoin payments, zero fees.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

function buildPaymentReceiptHtml(data: PaymentReceiptEmailData): string {
  const shortId = data.sessionId.slice(0, 8).toUpperCase();
  const timestamp = new Date(data.paidAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="background:#F7931A;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="font-size:22px;color:#fff;margin:0;">Payment Confirmed</h1>
      <p style="font-size:14px;color:rgba(255,255,255,0.85);margin:4px 0 0;">to ${data.merchantName}</p>
    </div>

    <!-- Main card -->
    <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;padding:32px;margin-bottom:24px;">

      <!-- Amount -->
      <div style="text-align:center;padding:24px 0;border-bottom:1px solid #f0f0f0;margin-bottom:24px;">
        <p style="font-size:13px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Amount Paid</p>
        <p style="font-size:32px;font-weight:700;color:#171717;margin:0;">
          ${data.amountSats.toLocaleString()} sats
        </p>
        ${data.amountUsd ? `<p style="font-size:16px;color:#888;margin:4px 0 0;">&#8776; $${data.amountUsd} USD</p>` : ""}
      </div>

      <!-- Details -->
      <table style="width:100%;font-size:14px;color:#333;margin-bottom:24px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#888;">Merchant</td>
          <td style="padding:8px 0;text-align:right;">${data.merchantName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;">Checkout Reference</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;">#${shortId}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;">Confirmed</td>
          <td style="padding:8px 0;text-align:right;">${timestamp}</td>
        </tr>
      </table>

      <!-- Confirmation message -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
        <p style="font-size:15px;color:#166534;margin:0;font-weight:600;">Payment confirmed. No further action needed.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:13px;color:#aaa;margin:0;">
        Powered by <a href="https://arxmint.com" style="color:#F7931A;text-decoration:none;">ArxMint</a>
        — Bitcoin payments, zero fees.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

// ---- Magic link login email ----

export interface MagicLinkEmailData {
  email: string;
  businessName: string;
  loginUrl: string;
}

/**
 * Send a magic link login email to a merchant.
 * Returns true on success, false on failure (never throws).
 */
export async function sendMagicLinkEmail(
  data: MagicLinkEmailData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.email,
      subject: "Log in to your ArxMint merchant dashboard",
      html: buildMagicLinkHtml(data),
    });
    logger.info("email_sent", { type: "magic_link", email: data.email });
    return true;
  } catch (error) {
    logger.warn("email_send_failed", {
      type: "magic_link",
      email: data.email,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function buildMagicLinkHtml(data: MagicLinkEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;color:#171717;margin:0 0 8px;">
        Arx<span style="color:#F7931A;">Mint</span>
      </h1>
      <p style="font-size:14px;color:#888;margin:0;">Merchant Dashboard</p>
    </div>

    <!-- Main card -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e5e5;padding:32px;margin-bottom:24px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 8px;">
        Hey ${data.businessName} team,
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 24px;">
        Click the button below to log in to your ArxMint merchant dashboard.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${data.loginUrl}"
           style="display:inline-block;background:#F7931A;color:#fff;font-size:16px;font-weight:700;padding:14px 40px;border-radius:8px;text-decoration:none;">
          Log In to Dashboard
        </a>
      </div>

      <!-- Expiry notice -->
      <p style="font-size:13px;color:#888;text-align:center;margin:0 0 16px;">
        This link expires in 15 minutes.
      </p>

      <!-- Fallback link -->
      <p style="font-size:13px;color:#888;text-align:center;margin:0 0 4px;">
        If the button doesn't work, copy and paste this link:
      </p>
      <p style="font-size:12px;text-align:center;margin:0;">
        <a href="${data.loginUrl}" style="color:#F7931A;word-break:break-all;">${data.loginUrl}</a>
      </p>
    </div>

    <!-- Security notice -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e5e5;padding:16px 24px;margin-bottom:24px;">
      <p style="font-size:13px;color:#666;margin:0;line-height:1.5;">
        If you didn't request this login link, you can safely ignore this email. No one can access your account without clicking this link.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:13px;color:#aaa;margin:0;">
        Powered by <a href="https://arxmint.com" style="color:#F7931A;text-decoration:none;">ArxMint</a>
        — Bitcoin payments, zero fees.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

function buildInvoiceHtml(data: InvoiceEmailData): string {
  const usdLine = data.amountUsd ? ` (~$${data.amountUsd} USD)` : "";
  const memoSection = data.memo
    ? `<p style="font-size:14px;color:#555;margin:0 0 16px;"><strong>Note:</strong> ${data.memo}</p>`
    : "";
  const shortId = data.sessionId.slice(0, 8).toUpperCase();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="background:#F7931A;border-radius:12px 12px 0 0;padding:24px 32px;">
      <h1 style="font-size:22px;color:#fff;margin:0;">Payment Request ⚡</h1>
      <p style="font-size:14px;color:rgba(255,255,255,0.85);margin:4px 0 0;">from ${data.merchantName}</p>
    </div>

    <!-- Main card -->
    <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;padding:32px;margin-bottom:24px;">

      <!-- Amount -->
      <div style="text-align:center;padding:24px 0;border-bottom:1px solid #f0f0f0;margin-bottom:24px;">
        <p style="font-size:13px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Amount Due</p>
        <p style="font-size:32px;font-weight:700;color:#171717;margin:0;">
          ${data.amountSats.toLocaleString()} sats
        </p>
        ${data.amountUsd ? `<p style="font-size:16px;color:#888;margin:4px 0 0;">≈ $${data.amountUsd} USD</p>` : ""}
      </div>

      ${memoSection}

      <!-- CTA Button -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${data.paymentUrl}"
           style="display:inline-block;background:#F7931A;color:#fff;font-size:16px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">
          Pay Now with Lightning ⚡
        </a>
      </div>

      <!-- Fallback link -->
      <p style="font-size:13px;color:#888;text-align:center;margin:0 0 8px;">
        Or copy this link into your Lightning wallet:
      </p>
      <p style="font-size:13px;text-align:center;margin:0;">
        <a href="${data.paymentUrl}" style="color:#F7931A;word-break:break-all;">${data.paymentUrl}</a>
      </p>
    </div>

    <!-- Invoice ref + download -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e5e5;padding:20px 32px;margin-bottom:24px;">
      <p style="font-size:13px;color:#888;margin:0 0 4px;">Invoice Reference</p>
      <p style="font-size:14px;color:#171717;font-family:monospace;margin:0;">#${shortId}</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:13px;color:#aaa;margin:0;">
        Powered by <a href="https://arxmint.com" style="color:#F7931A;text-decoration:none;">ArxMint</a>
        — Bitcoin payments, zero fees.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

function buildWelcomeHtml(
  data: MerchantWelcomeEmailData,
  qrUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:28px;color:#171717;margin:0 0 8px;">
        Welcome to ArxMint
      </h1>
      <p style="font-size:16px;color:#F7931A;font-weight:600;margin:0;">
        Founding Merchant #${data.merchantNumber}
      </p>
    </div>

    <!-- Main card -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e5e5;padding:32px;margin-bottom:24px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">
        Hey ${data.businessName} team,
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 24px;">
        You're officially on the ArxMint network. Your business can now accept Bitcoin payments — zero fees, instant settlement, no middlemen.
      </p>

      <!-- Pay link -->
      <div style="background:#fafafa;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="font-size:13px;color:#888;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">
          Your Payment Link
        </p>
        <a href="${data.payLink}" style="font-size:18px;color:#F7931A;font-weight:600;text-decoration:none;word-break:break-all;">
          ${data.payLink}
        </a>
      </div>

      <!-- QR Code -->
      <div style="text-align:center;margin-bottom:24px;">
        <p style="font-size:13px;color:#888;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">
          Your QR Code — Print &amp; Display
        </p>
        <img src="${qrUrl}" alt="Payment QR Code" width="200" height="200" style="border:1px solid #e5e5e5;border-radius:8px;" />
        <p style="font-size:13px;color:#888;margin:8px 0 0;">
          Customers scan this with any Lightning wallet to pay you instantly.
        </p>
      </div>

      <!-- Steps -->
      <h3 style="font-size:16px;color:#171717;margin:0 0 12px;">Next Steps</h3>
      <ol style="font-size:15px;color:#333;line-height:1.8;margin:0;padding-left:20px;">
        <li><strong>Print your QR code</strong> and put it in your window, on your counter, or on your business cards.</li>
        <li><strong>Share your payment link</strong> via text, email, or social media when invoicing customers.</li>
        <li><strong>Download your badge</strong> at <a href="https://www.arxmint.com/badge" style="color:#F7931A;">arxmint.com/badge</a> — "Bitcoin Accepted Here" graphics for your website and signage.</li>
        <li><strong>Add to your website</strong> — drop one line of code and customers can pay right on your site:
          <div style="background:#f5f5f5;border-radius:4px;padding:8px 12px;margin:8px 0;font-family:monospace;font-size:12px;color:#333;word-break:break-all;">
            &lt;script src="https://arxmint.com/embed.js" data-merchant="${data.merchantId}"&gt;&lt;/script&gt;
          </div>
        </li>
        <li><strong>Use the POS</strong> on your phone — open <a href="https://www.arxmint.com/pos/${data.merchantId}" style="color:#F7931A;">arxmint.com/pos/${data.merchantId}</a> and add it to your home screen. Keypad, QR, done.</li>
        <li><strong>View your dashboard</strong> at <a href="https://www.arxmint.com/merchant-dashboard?merchant=${data.merchantId}" style="color:#F7931A;">arxmint.com/merchant-dashboard</a> — see payments, export for taxes, manage settings.</li>
      </ol>
    </div>

    <!-- How it works -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e5e5;padding:24px;margin-bottom:24px;">
      <h3 style="font-size:16px;color:#171717;margin:0 0 12px;">How Customers Pay</h3>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0;">
        1. Customer scans your QR or opens your pay link<br>
        2. Enters the amount (or you pre-set it)<br>
        3. Pays with any Lightning wallet (Cash App, Strike, Phoenix, etc.)<br>
        4. Payment confirmed in ~3 seconds<br>
        <br>
        <strong>Zero processing fees. No chargebacks. Instant settlement.</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="font-size:13px;color:#888;margin:0 0 8px;">
        Questions? Reply to this email — we're here to help.
      </p>
      <p style="font-size:12px;color:#aaa;margin:0;">
        ArxMint — Bitcoin payments for Colorado businesses
        <br>
        <a href="https://www.arxmint.com/merchants" style="color:#F7931A;text-decoration:none;">arxmint.com/merchants</a>
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}
