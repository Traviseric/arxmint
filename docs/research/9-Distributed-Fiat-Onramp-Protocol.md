# Distributed Fiat On-Ramp Protocol

## Technical Specification for Merchant-as-On-Ramp Architecture

**Version:** 0.1 (Draft)
**Date:** March 2026
**Status:** RFC — requesting feedback before implementation

---

## 1. Problem Statement

Bitcoin payment infrastructure requires users to already have Bitcoin. This creates a chicken-and-egg problem: merchants accept BTC, but customers don't have BTC because they've never needed it. Centralized on-ramps (Stripe, Coinbase) solve this but introduce single points of failure — one account ban kills the entire fiat bridge.

The ArxMint network already contains merchants who:
- Have existing payment processor accounts (Stripe, Square, etc.)
- Run their own Lightning/Cashu infrastructure
- Can mint ecash on their local Cashu mint

**Each merchant is already a potential fiat-to-Bitcoin exchange.** This spec defines the protocol for enabling that.

---

## 2. Architecture Overview

```
                    DISTRIBUTED ON-RAMP NETWORK

  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  │ Merchant A  │   │ Merchant B  │   │ Merchant C  │
  │ (Stripe)    │   │ (Square)    │   │ (PayPal)    │
  │ Coffee Shop │   │ SaaS Co.    │   │ Freelancer  │
  │             │   │             │   │             │
  │ Cashu Mint  │   │ Cashu Mint  │   │ LN Node     │
  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
         │                 │                  │
         └────────┬────────┴──────────┬───────┘
                  │                   │
           ┌──────┴──────┐    ┌──────┴──────┐
           │  On-Ramp    │    │  Reputation  │
           │  Registry   │    │  Layer       │
           └─────────────┘    └─────────────┘
                  │
           ┌──────┴──────┐
           │   Buyer     │
           │ (has CC,    │
           │  wants sats)│
           └─────────────┘
```

**Key insight:** The network doesn't need a central on-ramp. Every node that can accept fiat and mint ecash IS an on-ramp. The protocol coordinates discovery, pricing, and trust.

---

## 3. Protocol Components

### 3.1 On-Ramp Registry

Each ArxMint node that wants to sell sats advertises its on-ramp capability via a standardized manifest.

#### On-Ramp Manifest (`/.well-known/arxmint-onramp.json`)

```json
{
  "version": "0.1",
  "nodeId": "npub1abc...or-node-pubkey",
  "name": "Mountain Coffee Bitcoin",
  "onramp": {
    "enabled": true,
    "fiatMethods": ["stripe", "square"],
    "fiatCurrencies": ["USD"],
    "cryptoRails": ["cashu", "lightning"],
    "mintUrl": "https://mint.mountaincoffee.com",
    "minAmountCents": 100,
    "maxAmountCents": 50000,
    "spreadBps": 150,
    "dailyLimitCents": 500000,
    "dailyRemainingCents": 342500,
    "hoursOfOperation": "09:00-21:00 America/Denver",
    "autoApprove": true,
    "kycRequired": false
  },
  "reputation": {
    "totalSwaps": 847,
    "successRate": 0.994,
    "medianSettleTimeSec": 12,
    "activeSince": "2026-01-15T00:00:00Z"
  },
  "updatedAt": "2026-03-25T14:30:00Z"
}
```

**Field definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `fiatMethods` | string[] | Payment processors the merchant supports |
| `fiatCurrencies` | string[] | Accepted fiat currencies |
| `cryptoRails` | string[] | How sats are delivered (`cashu`, `lightning`, `onchain`) |
| `mintUrl` | string | Cashu mint URL (if delivering ecash) |
| `spreadBps` | int | Merchant's fee in basis points above spot (150 = 1.5%) |
| `minAmountCents` / `maxAmountCents` | int | Transaction size bounds (in minor units of fiat currency) |
| `dailyLimitCents` | int | Total daily volume the merchant will process |
| `dailyRemainingCents` | int | Remaining capacity for today |
| `autoApprove` | bool | Whether swaps are auto-fulfilled or require manual approval |
| `kycRequired` | bool | Whether the merchant requires buyer identity |

#### Discovery

Nodes discover on-ramp providers through:

1. **Local mesh** — ArxMint nodes in the same community/federation share manifests directly
2. **Nostr relay** — Publish on-ramp manifest as a replaceable Nostr event (NIP-78 application-specific data, kind 30078, `d` tag: `arxmint-onramp`)
3. **Directory API** — Optional centralized directory for convenience (GET `/api/onramp/providers`)

The Nostr relay approach is preferred because it inherits censorship resistance — no single directory can delist a provider.

---

### 3.2 Quote Protocol

Before a swap executes, the buyer requests a rate-locked quote.

#### Request Quote

```
POST /api/onramp/quote
```

```json
{
  "amountCents": 2000,
  "fiatCurrency": "USD",
  "cryptoRail": "cashu",
  "buyerPubkey": "npub1buyer..."
}
```

#### Quote Response

```json
{
  "quoteId": "q_abc123...",
  "provider": "npub1merchant...",
  "amountCents": 2000,
  "fiatCurrency": "USD",
  "cryptoRail": "cashu",
  "btcPriceUsd": 87500.00,
  "spreadBps": 150,
  "effectiveRate": 86187.50,
  "satsToDeliver": 23206,
  "mintUrl": "https://mint.mountaincoffee.com",
  "expiresAt": "2026-03-25T14:31:00Z",
  "ttlSec": 60,
  "fiatPaymentUrl": "https://checkout.stripe.com/c/pay/cs_live_...",
  "status": "pending"
}
```

**Quote mechanics:**

- Quote locks the rate for `ttlSec` seconds (default 60, max 300)
- `effectiveRate` = `btcPriceUsd * (1 - spreadBps/10000)` — the buyer gets slightly fewer sats to cover the merchant's spread
- `satsToDeliver` = `floor((amountCents / 100) / effectiveRate * 100_000_000)`
- Quote is signed by the merchant's key for non-repudiation
- Expired quotes cannot be executed

---

### 3.3 Swap Execution (Atomic Flow)

The swap has three phases: fiat payment, sats delivery, and confirmation.

```
  BUYER                      MERCHANT NODE                  MERCHANT'S
                                                          STRIPE/SQUARE
    │                              │                           │
    │  1. POST /api/onramp/quote   │                           │
    │─────────────────────────────>│                           │
    │  { quoteId, rate, expiry }   │                           │
    │<─────────────────────────────│                           │
    │                              │                           │
    │  2. Buyer pays via CC        │                           │
    │──────────────────────────────────────────────────────────>│
    │                              │    3. Webhook: paid       │
    │                              │<──────────────────────────│
    │                              │                           │
    │  4. Merchant mints ecash     │                           │
    │     (or pays LN invoice)     │                           │
    │                              │                           │
    │  5. Ecash token / preimage   │                           │
    │<─────────────────────────────│                           │
    │                              │                           │
    │  6. POST /api/onramp/confirm │                           │
    │─────────────────────────────>│                           │
    │  { received, rating }        │                           │
    │                              │                           │
```

#### Phase 1: Fiat Payment

The quote response includes a `fiatPaymentUrl` — a standard Stripe/Square checkout URL. The buyer pays there. This is the merchant's own payment processor account processing a normal transaction.

The merchant's webhook handler detects the payment:

```
POST /api/onramp/webhook/stripe
```

Internally:
1. Verify Stripe signature (merchant's own Stripe webhook secret)
2. Match to pending quote via `metadata.quoteId`
3. Validate amount matches quote
4. Trigger sats delivery

#### Phase 2: Sats Delivery

Based on `cryptoRail` in the quote:

**Cashu delivery:**
1. Merchant's Cashu mint creates tokens for `satsToDeliver`
2. Tokens are sent to buyer's `buyerPubkey` via Nostr DM (NIP-04/NIP-44) or returned in the webhook response
3. Tokens are P2PK-locked to `buyerPubkey` so only the buyer can redeem

**Lightning delivery:**
1. Buyer provides a BOLT11 invoice in the quote request
2. Merchant pays the invoice from their Lightning node
3. Preimage serves as proof of delivery

**On-chain delivery (large amounts):**
1. Buyer provides a Bitcoin address or Silent Payment address
2. Merchant sends on-chain transaction
3. TXID serves as proof of delivery

#### Phase 3: Confirmation

```
POST /api/onramp/confirm
```

```json
{
  "quoteId": "q_abc123...",
  "status": "received",
  "proofOfDelivery": "cashuBtoken123...",
  "rating": 5
}
```

Both parties sign a confirmation event published to Nostr, creating a public audit trail for the reputation system.

---

### 3.4 Reputation System

Trust is earned through successful swaps. No central authority rates providers.

#### Trust Score Calculation

```
trustScore = (
  0.4 * successRate +
  0.2 * volumeScore +
  0.2 * ageScore +
  0.1 * speedScore +
  0.1 * ratingScore
)
```

Where:
- `successRate` = completed_swaps / total_swaps (0-1)
- `volumeScore` = min(1, total_volume_sats / 10_000_000) — caps at 10M sats lifetime
- `ageScore` = min(1, days_active / 180) — caps at 6 months
- `speedScore` = min(1, 30 / median_settle_time_sec) — 30 seconds or faster = 1.0
- `ratingScore` = average_buyer_rating / 5

#### Reputation Events (Nostr)

Swap completions are published as Nostr events (kind 30078, `d` tag: `arxmint-swap-receipt`):

```json
{
  "kind": 30078,
  "tags": [
    ["d", "arxmint-swap-receipt"],
    ["p", "npub1merchant..."],
    ["p", "npub1buyer..."],
    ["quote", "q_abc123"],
    ["amount_cents", "2000"],
    ["sats_delivered", "23206"],
    ["settle_time_sec", "8"],
    ["rating", "5"]
  ],
  "content": "",
  "created_at": 1774567890
}
```

Both buyer and merchant publish their own event. Cross-referencing both provides:
- **Agreement** = legitimate swap
- **Dispute** = one party claims failure (triggers dispute flow)
- **Missing counterpart** = suspicious (possible sybil or abandoned swap)

#### Sybil Resistance

- Providers must have completed N swaps with M unique buyers before their trust score is displayed (suggested: 10 swaps, 5 unique buyers)
- New providers display a "New Provider" badge instead of a score
- Buyer-side rate limiting: max 3 quotes per provider per hour prevents quote spam

---

### 3.5 Dispute Resolution

If sats are not delivered after fiat payment:

1. **Buyer files dispute** — publishes Nostr event with proof of fiat payment (Stripe receipt ID)
2. **Merchant has 24h to respond** with proof of delivery (ecash token, LN preimage, on-chain TXID)
3. **If unresolved** — the swap is marked as failed in both parties' reputation
4. **Fiat refund** — buyer initiates chargeback through their CC issuer (standard CC consumer protection)

This is intentionally simple. Credit card chargebacks already provide buyer protection. The reputation system provides merchant protection (buyers who repeatedly chargeback get flagged).

---

## 4. API Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/.well-known/arxmint-onramp.json` | GET | Public | On-ramp manifest (auto-discovery) |
| `/api/onramp/quote` | POST | Optional (buyer pubkey) | Request a rate-locked quote |
| `/api/onramp/quote/:id` | GET | Quote parties only | Check quote status |
| `/api/onramp/webhook/stripe` | POST | Stripe signature | Fiat payment confirmation |
| `/api/onramp/webhook/square` | POST | Square signature | Fiat payment confirmation |
| `/api/onramp/confirm` | POST | Buyer signature | Confirm sats received |
| `/api/onramp/dispute` | POST | Buyer signature | File a dispute |
| `/api/onramp/providers` | GET | Public | List active on-ramp providers (directory) |
| `/api/onramp/providers/:id/quotes` | GET | Provider only | List pending/active quotes |

---

## 5. Security Considerations

### 5.1 Rate Manipulation

- Quotes lock the rate for a bounded TTL (max 300 seconds)
- Providers set their own spread — the market determines the competitive rate
- Price oracle (CoinGecko) is fetched server-side by each provider; no shared oracle to manipulate

### 5.2 Sybil Attacks

- Reputation requires proof-of-work (real swaps with real fiat)
- Cross-referencing buyer + merchant Nostr events prevents fabricated history
- New providers are flagged until they build history

### 5.3 Front-Running

- Quotes are signed and rate-locked — provider cannot change the rate after issuance
- Expired quotes are rejected at execution time

### 5.4 Regulatory

- Each merchant operates under their own payment processor account — no aggregated money transmission
- Merchants selling sats for fiat may be subject to local money transmission laws depending on jurisdiction and volume (see compliance analysis in internal docs)
- The protocol itself is neutral infrastructure — like email, it doesn't enforce any particular regulatory regime
- Merchants are responsible for their own compliance (just as they are for sales tax today)

---

## 6. Comparison with Existing On-Ramps

| Property | Centralized (Stripe) | P2P (Bisq/RoboSats) | ArxMint Distributed |
|----------|---------------------|---------------------|-------------------|
| **Friction** | Very low (CC) | High (escrow, wait) | Low (CC via merchant) |
| **Single point of failure** | Yes (one account) | No | No (N merchants) |
| **KYC required** | Yes (Stripe KYC) | Usually no | Merchant's choice |
| **Speed** | ~10 sec | 10-60 min | ~10-30 sec |
| **Censorship resistance** | None | High | High (N independent processors) |
| **Spread** | Fixed (service fee) | Market-set | Market-set per merchant |
| **Buyer protection** | CC chargeback | Escrow | CC chargeback |
| **Regulatory burden** | On platform | On each trader | On each merchant (existing) |

---

## 7. Implementation Phases

### Phase 1: Single-Node On-Ramp (built)
- ArxMint node accepts CC via its own Stripe → mints ecash
- `lib/stripe.ts` + `/api/checkout/stripe/*` — already implemented

### Phase 2: On-Ramp Manifest + Quote Protocol
- Implement `/.well-known/arxmint-onramp.json` endpoint
- Implement `/api/onramp/quote` with rate-locking
- Implement webhook handlers for Stripe/Square
- Implement ecash delivery (P2PK-locked Cashu tokens)

### Phase 3: Discovery + Directory
- Publish on-ramp manifest to Nostr relays (kind 30078)
- Implement `/api/onramp/providers` directory endpoint
- Client-side provider discovery and quote comparison

### Phase 4: Reputation Layer
- Implement swap receipt events on Nostr
- Trust score calculation from swap history
- Provider ranking in discovery UI

### Phase 5: Multi-Provider Routing
- Client requests quotes from N providers simultaneously
- Auto-selects best rate + trust score combination
- Split large swaps across multiple providers for liquidity

---

## 8. Open Questions

1. **Should quotes be published to Nostr?** Pro: transparent market. Con: front-running risk.
2. **Minimum trust score for auto-routing?** Need to balance new provider bootstrapping vs. buyer safety.
3. **Should the protocol support fiat-to-fiat via sats as intermediate?** (USD → sats → EUR across two merchants)
4. **Escrow for large swaps?** CC chargeback covers buyers, but merchants have no protection for amounts above Stripe's dispute threshold.
5. **Privacy:** Should swap receipts on Nostr be encrypted or public? Public builds trust but leaks volume data.

---

## 9. References

- ArxMint Merchant Payment Operations Research (docs/research/7)
- ArxMint Legal Position Paper (docs/compliance-kit/legal-position-paper.md)
- Cashu NUT-24 Ecash Paywall Specification
- Nostr NIP-78 (Application-Specific Data)
- BIP-21 (Unified Bitcoin Payment URIs)
- Colorado MTMA (HB 25-1201) Agent of Payee Exemption
