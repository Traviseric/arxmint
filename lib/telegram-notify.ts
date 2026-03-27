// ============================================================
// ArxMint — Telegram Payment Notifications
// Sends instant payment alerts to a merchant's Telegram chat
// via a bot. Silently skips if TELEGRAM_BOT_TOKEN is not set.
// ============================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Send a Telegram message to a chat ID via the ArxMint bot.
 * No-ops silently when TELEGRAM_BOT_TOKEN or chatId is absent.
 */
export async function sendTelegramNotification(
  chatId: string,
  message: string
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      // Log but never throw — notifications must not break the payment flow
      console.warn("[telegram-notify] sendMessage failed:", res.status, body.slice(0, 200));
    }
  } catch (err) {
    console.warn("[telegram-notify] fetch error:", err instanceof Error ? err.message : String(err));
  }
}

/**
 * Fetch live BTC/USD price from mempool.space.
 * Returns 0 on any error — USD display is best-effort.
 */
async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch("https://mempool.space/api/v1/prices", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return 0;
    const data = await res.json() as { USD?: number };
    return typeof data.USD === "number" ? data.USD : 0;
  } catch {
    return 0;
  }
}

/**
 * Format a payment received message for the merchant.
 * Fetches live BTC price for USD equivalent.
 */
export async function formatPaymentMessage(
  amountSats: number,
  merchantName: string,
  memo?: string | null
): Promise<string> {
  const btcPrice = await fetchBtcPrice();
  const usdLine =
    btcPrice > 0
      ? `~$${((amountSats / 100_000_000) * btcPrice).toFixed(2)} USD`
      : "";

  const lines = [
    `⚡ <b>Payment received!</b>`,
    `<b>${merchantName}</b>`,
    `${amountSats.toLocaleString()} sats${usdLine ? ` (${usdLine})` : ""}`,
  ];

  if (memo) {
    lines.push(`📝 ${memo}`);
  }

  return lines.join("\n");
}
