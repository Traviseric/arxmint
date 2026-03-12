# ArxMint <-> TENEO Auth Integration Contract

## Purpose

ArxMint and TENEO Auth are part of the same platform, but they should not collapse into one undifferentiated auth/payment layer.

The clean split is:

- **TENEO Auth** = identity and control plane
- **ArxMint** = payment and wallet plane

This document defines the contract between them so both repos describe the same system.

## System Roles

### TENEO Auth (identity and control plane)

TENEO Auth owns:

- user and agent identity
- ecosystem JWT issuance and verification
- service-key auth for internal TE services
- Nostr agent identity lifecycle
- agent policy, quotas, and budget rules
- unified credits and higher-level value abstractions

### ArxMint (payment and wallet plane)

ArxMint owns:

- Lightning invoice creation and verification
- Cashu NUT-24 payment verification
- L402 paywall flows
- merchant checkout sessions
- settlement and payment receipts
- payment challenge creation and verification
- wallet-oriented payment execution

## Nostr Is Used in Two Different Ways

These are related, but not the same codepath:

- **Human Nostr login**: ArxMint UI uses NIP-98 to authenticate a browser user, then issues a local httpOnly cookie session.
- **Agent Nostr identity**: TENEO Auth manages agent keypairs, signing, publishing, profiles, and NWC-facing agent operations.

Same protocol family, different role.

## Identity Contract

### Local ArxMint browser session

ArxMint may keep its local browser flow:

- browser signs NIP-98 event
- `POST /api/auth`
- ArxMint sets `arxmint_session` cookie

This is a local UI/session mechanism for ArxMint itself.

### Canonical ecosystem token

For cross-service and agent traffic, the canonical identity token should come from TENEO Auth:

- `Authorization: Bearer <teneo-jwt>`

ArxMint should verify that JWT directly for ecosystem requests.

### Transitional compatibility

ArxMint currently supports shared-session verification and legacy marketplace headers. Those can remain as compatibility layers during migration, but they should not be the long-term primary contract.

## Payment Contract

Identity and payment must stay separate.

A caller may present:

- identity: TENEO JWT or ArxMint local session
- payment: `Authorization: L402 <macaroon>:<preimage>` or `Authorization: Cashu <token>`

That supports three valid cases:

- authenticated but unpaid
- paid but pseudonymous
- authenticated and paid

ArxMint should not force payment proofs to double as identity, and TENEO Auth should not force identity tokens to double as payment receipts.

## Stable ArxMint API Surface For TENEO Auth

### Current endpoints already available

- `POST /api/payment`
  Creates a payment challenge.
- `POST /api/payment/verify`
  Verifies an L402 or Cashu payment proof.
- `GET /api/agent?service=<name>`
  Payment-gated agent access.
- `POST /api/checkout`
  Merchant checkout invoice/session creation.

### Target wallet endpoints for the TENEO Auth bridge

TENEO Auth's NWC bridge should call a narrow wallet API in ArxMint rather than private internals.

Recommended stable endpoints:

- `POST /api/wallet/pay-invoice`
- `POST /api/wallet/create-invoice`
- `GET /api/wallet/balance`

Those endpoints do not all exist in this repo yet. They are the target contract for the bridge.

## Recommended Request Model

### Browser user in ArxMint UI

- NIP-98 signed login to ArxMint
- ArxMint cookie session for subsequent UI requests

### TE service or agent calling ArxMint

- TENEO JWT in `Authorization: Bearer`
- optional payment proof if the endpoint is paywalled

### TENEO Auth calling ArxMint wallet functions

- service-to-service authentication
- explicit agent context from validated TENEO Auth identity
- no dependence on browser cookies

## Design Rules

- TENEO Auth is the source of truth for who the actor is.
- ArxMint is the source of truth for whether sats moved.
- Budget policy belongs in TENEO Auth.
- Payment receipt, invoice state, and proof verification belong in ArxMint.
- Human Nostr login and agent Nostr identity should share concepts, not implementation.

## Migration Direction

From ArxMint's current state to the target integration:

1. Keep ArxMint's local NIP-98 browser login for its own UI.
2. Add direct verification of TENEO JWTs in ArxMint for ecosystem calls.
3. Introduce stable wallet endpoints for invoice creation, payment, and balance.
4. Move cross-service callers off legacy shared-session and secret-header patterns.
5. Let TENEO Auth own agent identity and policy while ArxMint executes payments.

## Current Status

As of this repo state:

- ArxMint human auth is implemented.
- ArxMint paywall and payment challenge flows are implemented.
- shared-session compatibility exists.
- TENEO Auth Nostr agent identity is a proposed design, not a completed integration.

This document is the intended contract the two repos should converge on.
