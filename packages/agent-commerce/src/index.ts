// ─── Public API — @arxmint/agent-commerce ───────────────────────────────────

// Main client
export { AgentCommerceClient } from './client.js';

// Types
export type {
  AgentCommerceConfig,
  CheckoutSession,
  L402ChallengeInfo,
  PaymentEvent,
  PaymentResult,
} from './types.js';

// L402 primitives (for advanced use)
export { buildL402AuthHeader, l402AgentFetch, parseL402Challenge } from './l402.js';

// Merchant helpers (for advanced use)
export {
  createCheckoutSession,
  payCheckoutInvoice,
  pollCheckoutStatus,
} from './merchant.js';
