// ============================================================
// ArxMint — Email Client (Resend)
// Transactional emails for merchant onboarding and notifications.
// Free tier: 3,000 emails/month.
// ============================================================

import { Resend } from "resend";
import { logger } from "./logger";

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
