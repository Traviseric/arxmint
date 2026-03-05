// ============================================================
// ArxMint — Telegram Webhook for Merchant Approval
// Handles inline keyboard callbacks from the Teneo bot.
// POST /api/telegram-webhook
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

async function tgApi(method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function POST(request: NextRequest) {
  // Optional secret token verification (set via Telegram setWebhook secret_token)
  if (WEBHOOK_SECRET) {
    const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  try {
    const update = await request.json();
    const callback = update.callback_query;
    if (!callback) return NextResponse.json({ ok: true });

    // Only allow admin to approve/reject
    const chatId = String(callback.from?.id || "");
    if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
      await tgApi("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "Not authorized.",
        show_alert: true,
      });
      return NextResponse.json({ ok: true });
    }

    const data = callback.data || "";
    const [action, pledgeId] = data.split(":");
    if (!pledgeId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ ok: true });
    }

    const { supabase } = await import("@/lib/supabase");

    if (action === "approve") {
      // Fetch the pledge to check if it needs a description
      const { data: pledge } = await supabase
        .from("merchant_pledges")
        .select("businessName, location, category, website, reason")
        .eq("id", pledgeId)
        .single();

      if (!pledge) {
        await tgApi("answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "Merchant not found.",
          show_alert: true,
        });
        return NextResponse.json({ ok: true });
      }

      // Auto-generate description if missing or too short
      let reason = pledge.reason;
      if (!reason || reason.length < 30) {
        reason = generateDescription(pledge);
      }

      await supabase
        .from("merchant_pledges")
        .update({ approved: true, reason })
        .eq("id", pledgeId);

      // Update the Telegram message to show approved
      await tgApi("editMessageReplyMarkup", {
        chat_id: callback.message?.chat?.id,
        message_id: callback.message?.message_id,
        reply_markup: { inline_keyboard: [] },
      });
      await tgApi("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: `✅ ${pledge.businessName} approved and live on /merchants`,
        show_alert: true,
      });
      // Send confirmation with the description that was set
      await tgApi("sendMessage", {
        chat_id: callback.message?.chat?.id,
        text: `✅ *Approved:* ${pledge.businessName}\n\n📝 _${reason?.replace(/[_*`[\]]/g, "") || "No description"}_`,
        parse_mode: "Markdown",
      });

    } else if (action === "reject") {
      await supabase
        .from("merchant_pledges")
        .delete()
        .eq("id", pledgeId);

      await tgApi("editMessageReplyMarkup", {
        chat_id: callback.message?.chat?.id,
        message_id: callback.message?.message_id,
        reply_markup: { inline_keyboard: [] },
      });
      await tgApi("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "❌ Rejected and removed.",
        show_alert: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: true }); // Always 200 to Telegram
  }
}

function generateDescription(pledge: {
  businessName: string;
  location?: string | null;
  category?: string | null;
  website?: string | null;
}): string {
  const name = pledge.businessName;
  const loc = pledge.location ? ` in ${pledge.location}` : "";
  const categoryMap: Record<string, string> = {
    "food-drink": "food and beverage",
    "retail": "retail",
    "services": "professional services",
    "health": "health and wellness",
    "entertainment": "entertainment",
    "technology": "technology",
    "other": "business",
  };
  const cat = pledge.category ? categoryMap[pledge.category] || pledge.category : "business";

  return `${name} is a ${cat} ${cat === "technology" ? "company" : "business"}${loc}, joining the ArxMint network to accept Bitcoin payments. Zero processing fees, instant settlement, full sovereignty over every transaction.`;
}
