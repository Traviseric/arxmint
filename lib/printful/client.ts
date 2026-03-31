// Printful dropship client — copied from @te-code/printful-client
import type {
  PrintfulConfig,
  PrintfulOrderPayload,
  PrintfulOrderResult,
  PrintfulShippingRate,
} from "./types";

const PRINTFUL_API = "https://api.printful.com";

function buildHeaders(config: PrintfulConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  if (config.storeId) {
    headers["X-PF-Store-Id"] = config.storeId;
  }
  return headers;
}

export function resolveConfig(config?: Partial<PrintfulConfig>): PrintfulConfig {
  const apiKey = config?.apiKey || process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    throw new Error("Printful API key is required (pass config.apiKey or set PRINTFUL_API_KEY)");
  }
  return {
    apiKey,
    storeId: config?.storeId || process.env.PRINTFUL_STORE_ID,
    webhookSecretKey: config?.webhookSecretKey || process.env.PRINTFUL_WEBHOOK_SECRET_KEY,
  };
}

export async function createDropshipOrder(
  payload: PrintfulOrderPayload,
  options?: { confirm?: boolean; config?: Partial<PrintfulConfig> },
): Promise<{ ok: true; data: PrintfulOrderResult } | { ok: false; error: string }> {
  const confirm = options?.confirm ?? true;
  const config = resolveConfig(options?.config);

  try {
    const response = await fetch(`${PRINTFUL_API}/orders?confirm=${confirm}`, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Printful] Failed to create order:", text);
      return { ok: false, error: text };
    }

    const json = await response.json();
    return { ok: true, data: json.result };
  } catch (err) {
    console.error("[Printful] Network error creating dropship order:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Network Error" };
  }
}

export async function estimateShippingRates(
  payload: PrintfulOrderPayload,
  config?: Partial<PrintfulConfig>,
): Promise<PrintfulShippingRate[] | null> {
  const resolved = resolveConfig(config);

  try {
    const response = await fetch(`${PRINTFUL_API}/shipping/rates`, {
      method: "POST",
      headers: buildHeaders(resolved),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[Printful] Failed to calculate shipping:", text);
      return null;
    }

    const json = await response.json();
    return json.result;
  } catch (err) {
    console.error("[Printful] Network error estimating shipping:", err);
    return null;
  }
}

export async function getOrderStatus(
  orderId: string | number,
  config?: Partial<PrintfulConfig>,
): Promise<PrintfulOrderResult | null> {
  const resolved = resolveConfig(config);

  try {
    const response = await fetch(`${PRINTFUL_API}/orders/${orderId}`, {
      headers: buildHeaders(resolved),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json.result;
  } catch {
    return null;
  }
}

export async function cancelOrder(
  orderId: string | number,
  config?: Partial<PrintfulConfig>,
): Promise<boolean> {
  const resolved = resolveConfig(config);

  try {
    const response = await fetch(`${PRINTFUL_API}/orders/${orderId}`, {
      method: "DELETE",
      headers: buildHeaders(resolved),
      signal: AbortSignal.timeout(15_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}
