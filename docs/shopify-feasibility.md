# Shopify App Feasibility Analysis

**Status:** Future phase — do not build yet
**Author:** ArxMint Engineering
**Date:** 2026-03-09

---

## Summary

Shopify is the dominant hosted e-commerce platform with 4.6M+ merchants. A Shopify payment
app would give ArxMint access to a massive merchant base. However, the Shopify ecosystem
has significant technical and compliance requirements that make it a Phase 6+ investment,
not a near-term priority.

**Decision: Do not build a Shopify app in the current phase. Re-evaluate when:**
- ArxMint has >50 active WooCommerce merchants
- Nostr-signed onboarding can be adapted to Shopify's OAuth flow
- Engineering capacity allows a 3-4 month Shopify-specific development cycle

---

## Technical Requirements

### 1. Embedded App Framework (Shopify App Bridge)

Shopify requires all payment apps to use the **Shopify App Bridge** — a JavaScript SDK
that embeds the app UI inside the Shopify Admin iframe. This means:

- The ArxMint admin UI must be rebuilt for Shopify's polaris design system
- Authentication uses OAuth 2.0, not Nostr NIP-98
- Apps must be served from HTTPS with proper CSP headers
- Shopify controls the navigation — no standalone pages

**Effort:** ~4-6 weeks for a compliant embedded admin UI.

### 2. Payment Provider API

To integrate with Shopify Checkout (not just redirect to a hosted page), apps must use the
**Payments Apps API**, which requires:

- Registration as a **Payments App** (separate from standard apps)
- Shopify controls checkout rendering — you cannot inject custom HTML
- Payment sessions are managed via GraphQL mutations (`paymentSessionResolve`, `paymentSessionReject`)
- Webhook delivery to app endpoints for session updates

**Alternative:** Use the standard redirect-to-hosted-checkout pattern (similar to our WooCommerce
plugin). This is simpler but results in a worse UX — customers leave the Shopify checkout flow.

**Effort:** 2-3 months for a native Payments App integration.

### 3. Hosting Requirements

- The app backend must be independently hosted (Vercel deployment qualifies)
- Shopify sends webhooks to your registered endpoint — existing `/api/checkout/webhook` needs
  a Shopify-specific adapter to parse Shopify's `payment_session.resolve` GraphQL format
- SSL required (Vercel provides this automatically)

---

## Compliance / Review Requirements

### App Review Process

1. Submit app to the Shopify App Store via the Partner Dashboard
2. Shopify reviews for:
   - UX compliance (must use Polaris components)
   - Security review (OAuth flow, HMAC webhook verification)
   - Payment handling compliance (KYC requirements depend on region)
3. Review takes **4-8 weeks** on average
4. Rejection is common on first submission — plan for 2-3 revision cycles

### Payment App Specific Requirements

Shopify's **Payments Apps certification** (required for native checkout integration) additionally requires:

- **PCI-DSS compliance statement** — ArxMint does not handle card data, but Lightning invoice
  handling must be documented as out of scope
- **Regulatory disclosure** — Bitcoin payment apps must comply with Shopify's restricted
  items policy and local cryptocurrency regulations
- **Geographic restrictions** — Some regions may require money transmitter licenses;
  WooCommerce plugin avoids this by running on the merchant's own server

### Shopify's Cryptocurrency Policy

As of 2026, Shopify permits Bitcoin payment apps but:
- Apps cannot process payments in jurisdictions where crypto is banned
- Merchants must acknowledge regulatory responsibility
- Shopify may add additional requirements at any time

---

## Cost Estimate

| Phase | Effort | Notes |
|-------|--------|-------|
| Embedded Admin UI (App Bridge + Polaris) | 4–6 weeks | Separate from current Next.js UI |
| OAuth / session management | 1–2 weeks | Cannot reuse Nostr auth |
| Payments App API integration | 6–8 weeks | GraphQL mutations, payment session lifecycle |
| Shopify App Review + revisions | 4–12 weeks | External dependency |
| **Total** | **~4–6 months** | With a dedicated developer |

---

## Comparison to WooCommerce

| | WooCommerce Plugin | Shopify App |
|---|---|---|
| Development time | 2–4 weeks | 4–6 months |
| Review required | No | Yes (4–8 weeks) |
| Merchant servers our code | Yes | No (Shopify controls) |
| UX | Redirect to hosted checkout | Native checkout (complex) or redirect (simple) |
| Market size | 6M+ self-hosted stores | 4.6M+ hosted stores |
| Sovereignty | High (plugin on their server) | Low (Shopify controls checkout) |
| Bitcoin-friendly merchants | Higher overlap | Lower overlap (mainstream) |
| KYC/licensing risk | Low | Medium-high |

---

## Recommendation

**Phase 6 (12+ months out):** Build a redirect-style Shopify app (not native Payments App)
as a low-effort entry into the Shopify ecosystem. The redirect approach:

1. Customer clicks "Pay with Bitcoin Lightning" at Shopify checkout
2. Redirects to `arxmint.com/pay/{merchant-id}` hosted checkout page
3. On payment, calls Shopify's `paymentSessionResolve` mutation
4. Shopify marks order as paid

This avoids Polaris UI requirements and the complex Payments App certification while still
enabling Shopify integration. Estimated effort: 3-4 weeks + review time.

**Do not pursue native Shopify Payments App integration until:**
- WooCommerce plugin has shipped and proven the integration model
- ArxMint has cleared regulatory counsel on Bitcoin payment app requirements in Shopify's target markets
- Engineering can dedicate a sustained 3-4 month track to Shopify-specific work

---

## Next Steps (when ready)

1. Create a Shopify Partner account at partners.shopify.com
2. Register a development store for testing (free)
3. Use Shopify's [Payments Apps starter template](https://github.com/Shopify/payment-app-template)
4. Implement redirect-style checkout first; upgrade to native Payments App in a follow-on
5. Contact Shopify Partner support to get on the Payments App waitlist early
