# ArxMint Authentication

## Overview

ArxMint uses **Nostr NIP-98** for human authentication. After a valid NIP-98 login, the server issues an HMAC-signed session token in an httpOnly cookie.

For agent-facing endpoints, ArxMint uses **L402** and **Cashu NUT-24** as payment gates. That is primarily access-by-payment, not a long-lived user identity system.

Cross-project sessions can be shared with Teneo Marketplace via `AUTH_SHARED_SECRET`.

## Relationship To TENEO Auth

ArxMint and TENEO Auth are part of the same platform, but they serve different roles:

- **TENEO Auth** is the identity and control plane for the wider TE ecosystem.
- **ArxMint** is the payment and wallet plane.

In practice:

- ArxMint's Nostr login is for ArxMint's own browser UI and admin/session flows.
- TENEO Auth should remain the canonical issuer of ecosystem JWTs for service and agent traffic.
- Payment proofs such as L402 and Cashu remain separate from identity.

See [teneo-auth-integration.md](teneo-auth-integration.md) for the shared contract.

## Auth Flow (Human)

```
Browser (NIP-07 extension: Alby, nos2x, etc.)
  |
  | 1. Sign NIP-98 event (kind 27235, u=<auth-url>, method=POST)
  v
POST /api/auth  { pubkey, signedEvent }
  |
  | 2. Verify: kind, timestamp (<60s), pubkey match, NIP-98 tags, signature
  v
Set cookie: arxmint_session = {pubkeyHex}.{expUnixSec}.{hmacSig}
  (httpOnly, secure, sameSite=strict, 7-day TTL)
  |
  | 3. Subsequent browser requests use the cookie automatically
  v
Protected routes / admin-only views
```

Notes:

- NIP-98 events must be fresh within 60 seconds.
- The `u` tag must match the exact `/api/auth` URL the server expects.
- The browser extension signs the event; ArxMint never receives the private key.

## Auth Flow (Agent)

```
Agent
  |
  | GET /api/agent?service=<name>
  | Authorization: Cashu <token>   (NUT-24 ecash)
  | Authorization: L402 <mac>:<pre> (Lightning)
  v
No payment: 402 Payment Required + WWW-Authenticate challenge
Invalid/spent Cashu token: 401 + error details
Valid payment: 200 + data
```

Notes:

- Cashu is verified directly against the configured mint.
- L402 is trusted only when an upstream Aperture proxy has verified the payment and set `X-Aperture-Verified`.
- In development only, `SKIP_PAYMENT_VERIFY=true` can bypass payment checks. Production ignores that bypass.

## Key Files

| File | Purpose |
|------|---------|
| `lib/nostr-auth.ts` | Browser-side NIP-07 connect + NIP-98 event creation/verification helpers |
| `lib/auth-middleware.ts` | HMAC session creation, validation, cross-project verification |
| `app/api/auth/route.ts` | NIP-98 login endpoint (POST) |
| `app/api/auth/logout/route.ts` | Session cookie clear (POST) |
| `lib/cashu-paywall.ts` | NUT-24 ecash verification for agents |
| `app/api/l402/route.ts` | L402 Lightning paywall for agents |
| `app/api/agent/route.ts` | Agent API with dual paywall (L402 + Cashu) |

## Session Token Format

```
{pubkeyHex}.{expUnixSec}.{hmacSha256Hex}
```

- `pubkeyHex`: 64-char hex Nostr public key
- `expUnixSec`: Unix timestamp when token expires
- `hmacSha256Hex`: HMAC-SHA256 of `{pubkey}.{exp}` using `NEXTAUTH_SECRET`

Important:

- Tokens are self-verifying; there is no DB-backed session store in this path.
- Logout clears the cookie, but server-side token revocation is not implemented yet.
- Immediate revocation would require a blocklist or another server-side revocation mechanism.

## Admin System

Admin pubkeys are defined in `app/api/pledge/route.ts` (`ADMIN_PUBKEYS` set). Admins see pipeline merchants on `/merchants` that regular users cannot.

| npub | hex | who |
|------|-----|-----|
| `npub1c44rz8mq52h3yj2eq4lfp3ln98a6d2qn9muu6tqjdlj6uryscn3sk6unjr` | `c56a311f60a2af124959057e90c7f329fba6a8132ef9cd2c126fe5ae0c90c4e3` | Travis |

## Guard Helpers

```typescript
import { requireAuth, getAuthPubkey, getCallerFromRequest } from "@/lib/auth-middleware";

// Reject unauthenticated requests
const authError = requireAuth(request);
if (authError) return authError;

// Get pubkey from authenticated request
const pubkey = getAuthPubkey(request);

// Get caller identity (session cookie, Bearer token, or marketplace secret)
const caller = getCallerFromRequest(request);
```

`getCallerFromRequest()` checks, in order:

1. Native ArxMint session cookie
2. Bearer token from a shared ArxMint/Teneo session
3. `X-Marketplace-Secret` for server-to-server Marketplace calls

## Cross-Project Sessions

Both ArxMint and Teneo Marketplace can share `AUTH_SHARED_SECRET`.

That allows:

- a session created by ArxMint to be recognized by another ArxMint instance
- a session created by Teneo Marketplace to be recognized by ArxMint via `Authorization: Bearer <token>`

This is session verification sharing, not shared browser cookies across domains.

Long term, this should be treated as a compatibility layer. The preferred ecosystem contract is direct verification of TENEO Auth-issued bearer tokens for cross-service calls, while ArxMint keeps local cookie sessions for its own UI.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXTAUTH_SECRET` | Yes (prod) | HMAC signing key for session tokens |
| `AUTH_SECRET` | Optional fallback | Legacy fallback if `NEXTAUTH_SECRET` is unset |
| `AUTH_SHARED_SECRET` | Optional | Cross-project session verification (falls back to NEXTAUTH_SECRET) |
| `MARKETPLACE_SHARED_SECRET` | Optional | Server-to-server auth from Teneo Marketplace |
| `NEXT_PUBLIC_BASE_URL` | Optional | Used to validate NIP-98 URL tag |
| `APERTURE_SHARED_SECRET` | Required for trusted L402 proxy mode | Verifies `X-Aperture-Verified` from Aperture |
| `SKIP_PAYMENT_VERIFY` | Dev only | Explicit payment bypass for local testing |

## Rate Limits

- Auth endpoint: Configurable via `RATE_LIMITS.auth` in `lib/rate-limit.ts`
- Payment endpoints: Configurable via `RATE_LIMITS.payment`
