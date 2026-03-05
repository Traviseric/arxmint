# ArxMint Authentication

## Overview

ArxMint uses **Nostr NIP-98** for human authentication and **L402/Cashu** for agent authentication. Sessions are HMAC-signed tokens stored in httpOnly cookies. Cross-project sessions shared with Teneo Marketplace via `AUTH_SHARED_SECRET`.

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
```

## Auth Flow (Agent)

```
Agent
  |
  | GET /api/agent?service=<name>
  | Authorization: Cashu <token>   (NUT-24 ecash)
  | Authorization: L402 <mac>:<pre> (Lightning)
  v
402 Payment Required (if no/invalid payment)
200 + data (if payment verified)
```

## Key Files

| File | Purpose |
|------|---------|
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

## Cross-Project Sessions

Both ArxMint and Teneo Marketplace share `AUTH_SHARED_SECRET`. A user logged in at marketplace can call ArxMint APIs with their marketplace Bearer token and be recognized via `verifySharedSession()`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXTAUTH_SECRET` | Yes (prod) | HMAC signing key for session tokens |
| `AUTH_SHARED_SECRET` | Optional | Cross-project session verification (falls back to NEXTAUTH_SECRET) |
| `MARKETPLACE_SHARED_SECRET` | Optional | Server-to-server auth from Teneo Marketplace |
| `NEXT_PUBLIC_BASE_URL` | Optional | Used to validate NIP-98 URL tag |

## Rate Limits

- Auth endpoint: Configurable via `RATE_LIMITS.auth` in `lib/rate-limit.ts`
- Payment endpoints: Configurable via `RATE_LIMITS.payment`
