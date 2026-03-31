// ─── Printful API Types ───
// Copied from @te-code/printful-client (packages/printful-client/src/types.ts)

export type PrintfulRecipient = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  email: string;
  phone?: string;
};

export type PrintfulOrderItem = {
  sync_variant_id: number;
  quantity: number;
};

export type PrintfulOrderPayload = {
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  /** Optional external ID (e.g. Stripe session ID) for cross-referencing */
  external_id?: string;
};

export type PrintfulOrderResult = {
  id: number;
  external_id?: string;
  status: string;
  shipping: string;
  created: number;
  updated: number;
  recipient: PrintfulRecipient;
  items: Array<{
    id: number;
    external_id?: string;
    variant_id: number;
    sync_variant_id: number;
    quantity: number;
    price: string;
    name: string;
  }>;
  costs?: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    tax: string;
    total: string;
  };
};

export type PrintfulShippingRate = {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
};

// ─── Webhook Types ───

export type PrintfulWebhookEvent = {
  type: string;
  data?: {
    order?: { id?: string | number; external_id?: string };
    shipment?: {
      tracking_number?: string;
      tracking_url?: string;
      carrier?: string;
    };
    reason?: string;
  };
};

export type PrintfulShipmentInfo = {
  printfulOrderId: string;
  externalId?: string;
  trackingNumber: string;
  trackingUrl: string;
  carrier: string;
};

// ─── Product Sync Types ───

export type PrintfulSyncProduct = {
  id: number;
  external_id?: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url?: string;
};

export type PrintfulSyncVariant = {
  id: number;
  external_id?: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  sku?: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
};

// ─── Config ───

export type PrintfulConfig = {
  apiKey: string;
  storeId?: string;
  /** Webhook signing secret (hex) for signature verification */
  webhookSecretKey?: string;
};
