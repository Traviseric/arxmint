# Building AI Agent Commerce with L402 and Ecash Paywalls

**Target publish date:** March 18, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** l402 api, ai agent bitcoin, ecash paywall, agent commerce, ai micropayments

---

AI agents need to pay for things. APIs, compute, data, other agents' services. But agents don't have bank accounts, credit cards, or KYC documents. They need bearer payment instruments — tokens they can present without identity.

This is exactly what ecash and L402 provide.

## The L402 Protocol

L402 (formerly LSAT) is HTTP 402 "Payment Required" done right:

1. Agent calls an API endpoint
2. Server returns HTTP 402 with a `WWW-Authenticate` header containing a macaroon and a Lightning invoice
3. Agent pays the invoice, gets a preimage
4. Agent retries the request with `Authorization: L402 <macaroon>:<preimage>`
5. Server verifies and serves the response

No API keys. No OAuth flows. No rate limit negotiations. Just pay-per-call with Lightning.

## The NUT-24 Alternative

Cashu's NUT-24 spec adds native ecash paywalls — same 402 pattern, but payment is in ecash tokens instead of Lightning invoices. This is useful when:

- The agent already holds Cashu tokens (no need to route through Lightning)
- You want sub-satoshi payments (ecash can denominate arbitrarily)
- The agent-to-agent payment should be instant and private

ArxMint implements both. The `cashu-paywall.ts` middleware checks for L402 macaroons first, then NUT-24 ecash tokens. Agents can pay with whichever rail they have loaded.

## Agent Wallets in ArxMint

ArxMint provides ephemeral agent wallets designed for exactly this use case:

```
Agent spawns → gets a Cashu wallet with:
  - Balance limit (e.g., 10,000 sats)
  - TTL (e.g., 1 hour)
  - In-memory only (no persistent state)
  - Audit log with hash-chained integrity
```

When the agent's task completes or TTL expires, the wallet is destroyed. No leftover funds sitting in an unmonitored wallet.

For agents that need to earn and spend, the wallet supports both receiving ecash tokens (from other agents or users) and spending them (on L402 APIs or direct ecash transfers).

## The Agent Marketplace

ArxMint includes an agent marketplace where:

1. Agent developers register their agent's capabilities and pricing
2. Each agent gets an L402-protected API endpoint
3. Users or other agents browse the marketplace and pay-per-use
4. Payment flows through the spend router (ecash preferred, Lightning fallback)

The marketplace uses macaroon-based access control with three tiers:
- **read-only**: Browse agent listings
- **invoice-only**: Generate invoices for agent services
- **agent-commerce**: Full pay-and-use access

## Practical Example

An AI research agent needs to:
1. Query a proprietary data API (L402 paywall, 100 sats/call)
2. Run inference on a hosted model (NUT-24 paywall, 500 sats/call)
3. Report results back to the user

With ArxMint, the agent's wallet is pre-funded with ecash. It automatically handles L402 challenges (pay Lightning invoice, cache macaroon) and NUT-24 challenges (present ecash token). The user sees the total cost in the BCE metrics dashboard.

## Why This Matters for Bitcoin

Agent commerce is the first real use case for programmatic micropayments at scale. Humans rarely pay 100 sats for an API call. Agents do it thousands of times per day. This creates genuine Lightning and ecash volume — which is exactly what Bitcoin circular economies need to be sustainable.

---

*Next week: From Prompt to Production — How ArxMint Deploys Bitcoin Infrastructure*
