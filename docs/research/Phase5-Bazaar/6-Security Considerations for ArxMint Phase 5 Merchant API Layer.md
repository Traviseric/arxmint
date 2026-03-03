# Security Considerations for ArxMint Phase 5 Merchant API Layer

## Security goals and threat model

Phase 5 introduces a classic “payments platform” attack surface: long-lived credentials (API keys), inbound event delivery (webhooks), and a browser-facing checkout surface (hosted checkout). Each of these maps to well-established API and web-application failure modes: credential theft and misuse, replay/duplication, and cross-site request attacks. citeturn22view0turn23view0turn18view1

Two contextual details materially change the threat model compared to card networks:

ArxMint’s stack uses HTTP 402 payment flows, including L402 and Cashu NUT-24. In L402, credentials are transmitted as `<macaroon(s)>:<preimage>` pairs and are explicitly not secure unless used with an external secure transport like TLS; if intercepted, the token can be reused by an attacker, and the spec calls out both interception and counterfeit-server spoofing as concrete risks. citeturn3view1turn1search2

Cashu NUT-24 defines an HTTP 402 pattern where a server response includes an `X-Cashu` header containing an encoded NUT-18 “payment request” (with amount/unit, acceptable mint URLs, and a required locking condition), and the client retries the request with a `cashuB` token in `X-Cashu`. This makes “payment as authorization” first-class at the HTTP layer—so anything that can replay or mishandle headers becomes a payment-security issue, not just an auth bug. citeturn6view0

At the API platform layer, two OWASP API Security Top 10 areas are especially relevant:

Unrestricted Resource Consumption: payment platforms are exposed to high-rate abuse (e.g., polling payment status, brute forcing IDs, repeated checkout/session creation), and OWASP explicitly recommends rate limiting and endpoint-specific throttles. citeturn18view0turn17search3

Unrestricted Access to Sensitive Business Flows: “confirm payment,” “withdraw/settle,” “issue refund,” “rotate keys,” and “create webhook endpoint” are sensitive flows where automation abuse can cause direct business harm; OWASP emphasizes identifying these flows and adding protection mechanisms beyond generic rate limiting. citeturn18view1

## API key security

A Stripe-like developer experience is compatible with strong key hygiene if the system cleanly separates “public” client identifiers from “secret” server credentials, aggressively limits what client-side credentials can do, and treats all secrets as breachable by default. citeturn15view2turn15view0turn22view0

### Generating and storing merchant API keys

Key taxonomy should match Stripe’s separation:

Publishable keys: intended for client-side code (web/mobile). Stripe explicitly states publishable keys are safe to include in webpages/apps and that “live mode publishable key” is used in client-side code. citeturn15view2turn15view0

Secret keys: server-side only; Stripe describes secret keys as “account credentials” and warns they must remain in the server environment (not in client-side code or public repos). citeturn15view0turn25view0

For secure generation and storage primitives, OWASP’s key-management guidance emphasizes lifecycle discipline (generation, storage, compromise recovery) and says keys should be generated with compliant cryptographic modules and RNGs, and should never be stored in plaintext; it recommends cryptographic vaults such as HSMs or isolated cryptographic services. citeturn20view0turn20view3

Separately, OWASP’s secrets-management guidance frames API keys as common “secrets,” and stresses centralizing storage, rotation, auditing, and limiting who can read/update secrets—because any human or system that can read a secret becomes a leak vector. citeturn19view1turn13search0

A Stripe-aligned operational pattern that materially reduces blast radius is “show secret once.” Stripe does this: after creating a secret/restricted key in live mode, it is displayed before saving and cannot be copied later; Stripe’s best-practices also say you see a newly created secret key one time and should store it immediately in a secret-management tool. citeturn0search4turn15view0

### Key rotation and what happens to in-flight payments

Credential rotation should be engineered as an auth-only concern: rotating a key must not change payment object state, only the ability to access/modify it. From an operational best-practice perspective, Stripe recommends rotating secret API keys periodically, and when responding to exposure/compromise, it recommends immediate rotation and optionally a delayed expiration on the old key to avoid downtime (but keeping that window short). citeturn15view0

Design implication for ArxMint: ensure that “in-flight payments” (hosted checkout sessions, payment intents, settlement jobs) are identified and progressed by opaque, unguessable object IDs plus server-side state machine transitions—not by continued validity of the exact key that created them. This mirrors how Stripe rotation primarily impacts *new API calls using the rotated key*, not the underlying payment objects. citeturn15view0turn15view2

Where retries are likely (client SDKs, flaky networks, webhook delivery), adopt idempotency at the write boundary. Stripe’s idempotency model saves the first response for a given idempotency key and returns the same result on subsequent retries with the same key. That is the correct primitive for “create checkout session” and “create payment intent,” because it prevents duplicate creation during retries, and it gives you a stable key to dedupe “in-flight” client actions across rotation windows. citeturn11search3

### IP allowlisting for server-side keys

IP allowlisting is a real defense-in-depth option, but only when the caller truly has stable egress IPs.

Stripe documents IP restriction for secret/restricted keys: if the service sends API requests from stable IP addresses (e.g., via a dedicated NAT gateway or reserved range), you can configure Stripe to block API requests using that key from anywhere else. citeturn15view0

The L402 spec explicitly discusses IP address binding as a possible mitigation for spoofing/interception, while also noting downsides (e.g., a user switching Wi‑Fi networks causes the credential to break). Those tradeoffs map directly to modern cloud/serverless environments where IP stability is not guaranteed. citeturn3view1turn1search2

Practical recommendation for ArxMint: make IP allowlisting available for “server keys” as an opt-in control, and document that it is most appropriate for merchants behind stable NAT egress; warn that serverless or mobile origins can make this brittle. citeturn15view0turn3view1

### Preventing API key leakage in client-side code

If your system supports “pk_” and “sk_” keys, the security story hinges on a strict capability boundary:

Publishable keys can be embedded in webpages/apps; secret keys must never be embedded client-side. Stripe states this distinction plainly and also warns not to share secret keys in publicly accessible areas such as GitHub or client-side code. citeturn15view0turn25view0

Stripe also explicitly advises: never put secret API keys in source code, and never embed secret API keys in applications (because they can be unpacked), using publishable keys instead for client-side SDK/tooling. citeturn15view0

On the auth-model level, OWASP’s API2 (Broken Authentication) guidance is relevant: it warns that API keys are not user authentication and should only be used for API client authentication (and it also cautions against sending sensitive auth material in URLs). This supports a design where browser sessions are authenticated via checkout-session tokens / ephemeral credentials, not long-lived secret keys. citeturn22view0turn23view0

## Payment security for hosted checkout

The hosted checkout flow is where “money finality” and “web finality” meet: you must prevent double-spend at the payment layer, and you must prevent duplicate/forged state transitions at the web/app layer. citeturn18view1turn16view0

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Lightning Network HTLC diagram preimage","Chaumian ecash blind signature diagram","Fedimint transaction flow intramint payments diagram","Cashu HTTP 402 X-Cashu header diagram"],"num_per_query":1}

### Preventing double-spend in the hosted checkout flow

Lightning

For Lightning invoices, a key safety property is that invoices can only be paid once, and the recipient sets the preimage (providing cryptographically verifiable proof of payment). The LND documentation states both points explicitly. citeturn21view0

This implies a concrete hosted-checkout invariant: for Lightning invoice payments, the same invoice hash should never be treated as payable twice, and the “paid” transition should be gated on authenticated settlement signals (e.g., invoice settled / preimage known), not merely “wallet attempted payment.” citeturn21view0

Fedimint eCash

Fedimint documentation highlights a classic bearer-token issue: when Bob receives eCash notes from Alice, “there is a risk that Alice still has the eCash notes copied and could redeem them first,” so the payment is not considered settled until Bob submits the notes to the mint and swaps them for fresh notes. citeturn10view0turn10view2

So, for hosted checkout where a payer is using Fedimint-style eCash, “received tokens” must be treated as provisional until your system has performed the swap/reissue that makes the double-spend attempt fail deterministically and yields fresh notes owned by the payee side. citeturn10view0turn10view2

Cashu eCash and NUT-24 “Cashu-402”

Cashu’s core double-spend prevention mechanism is mint-side spent-secret tracking: the model description says the receiver can present the token `(x, C)` to the mint, which checks validity and (if valid) treats it as a valid spend by adding `x` to the list of spent secrets. citeturn7view0

For the HTTP 402 variant, NUT-24 defines that the server sends a 402 with an `X-Cashu` header containing an encoded payment request, and the client retries with a `cashuB` token in the `X-Cashu` header; the token must come from an accepted mint URL, match the requested unit, and be at least the requested amount. citeturn6view0

Design implication: in hosted checkout, do not mark a Cashu payment “paid” upon receiving an `X-Cashu` header token alone. The “paid” transition must be gated on a mint interaction that consumes the proofs (or swap/reissue) so that reuse fails, consistent with spent-secret tracking. citeturn7view0turn6view0

Cashu also specifies payment execution state machines that directly matter for race conditions: NUT-05 defines quote + melt, and introduces `UNPAID`, `PENDING`, `PAID` states, including an optional asynchronous mode where the request returns immediately with `PENDING` after validation and completion must be tracked via polling or websocket. That model is a solid template for ArxMint hosted checkout: validate first, mark pending, then finalize after definitive payment completion. citeturn8view0

Finally, when Cashu tokens include DLEQ proofs, the spec says wallets **MUST** verify the DLEQ proof, and it notes a privacy pitfall: the blinding factor `r` should not be shared with the mint or the mint can associate blinded and unblinded tokens. For hosted checkout, this argues for disciplined proof verification and careful handling of proof metadata so you don’t accidentally create linkability through logging/telemetry. citeturn8view1

### Timing attacks on payment verification

There are two distinct timing risks:

Cryptographic comparison timing (webhooks, key checks): Stripe’s webhook verification guidance explicitly instructs using constant-time string comparison when comparing the expected signature to received signatures to protect against timing attacks. citeturn16view0

Observable response discrepancies in auth flows: OWASP’s API2 discusses common auth weaknesses, including cases where systems leak sensitive details by how they process and validate tokens or credentials; at minimum, unify error handling (e.g., “invalid credentials” regardless of whether a key is deleted vs malformed) and avoid per-branch “fast reject” paths that leak high-signal timing differences. citeturn22view0

For hosted checkout specifically, treat “payment status polling” endpoints as an abuse target: enforce rate limits and per-session quotas (OWASP API4 guidance), and ensure that the “pending vs paid” distinction does not materially change the cost of the response (e.g., a paid response shouldn’t trigger heavy downstream calls inline). citeturn18view0turn16view0

### Race conditions and duplicate trigger handling

Two-webhook-fires-for-one-payment is not an edge case; it is expected behavior in robust webhook systems:

Stripe documents automatic retries for up to three days with exponential backoff in live mode, and it explicitly states it does not guarantee event ordering. That combination implies that duplicates and out-of-order deliveries must be treated as normal. citeturn16view0

Stripe also recommends returning a successful (`2xx`) response quickly before any complex logic that could time out (because timeouts lead to retries). citeturn16view0

Therefore, ArxMint’s hosted checkout and webhook consumers should be built around idempotent state transitions:

At the platform side: enforce a monotonic payment state machine (e.g., `created -> pending -> paid -> settled`, never backwards), and make each transition conditional on “current state == expected previous state” within a DB transaction.

At the merchant side: provide an event ID and require merchants to dedupe on that event ID; document that they must be resilient to retries and out-of-order delivery (mirroring Stripe’s guidance). citeturn16view0turn11search3

## Webhook security

### Signature verification, replay prevention, and secret rotation

Stripe’s webhook signature scheme is an industry template because it covers integrity, authenticity, replay mitigation, and rotation:

Each signed event contains a `Stripe-Signature` header with a timestamp and one or more signatures; verification involves building a `signed_payload` of `timestamp + "." + raw_body`, computing HMAC-SHA256 using the endpoint’s secret, comparing in constant time, and enforcing a timestamp tolerance. citeturn16view0turn12search2

The timestamp window mitigates replay: Stripe includes the timestamp as part of the signed payload so it can’t be altered without invalidating the signature, and Stripe’s libraries default to a 5-minute tolerance; it warns not to use tolerance `0` (disables recency checks) and recommends synchronizing clocks (e.g., NTP). citeturn16view0turn0search1

Retries re-sign: if Stripe retries a delivery (e.g., prior non-2xx), it generates a new signature and timestamp for that attempt. citeturn16view0

Secret rotation without downtime: Stripe supports rolling webhook endpoint secrets and keeping the previous secret active for up to 24 hours; during the overlap, multiple secrets are active and Stripe generates one signature per secret. citeturn16view0

Two further operational details are critical for ArxMint’s webhook design because they cause real-world verification failures if missed:

Signature verification requires the *raw* request body; Stripe warns that framework manipulation of the raw body causes verification to fail. citeturn16view0

Only trust signed events: Stripe recommends verifying webhook signatures (and, optionally, IP allowlisting of sender IPs) to confirm events are from Stripe rather than a third party. citeturn16view0

### If the merchant endpoint is compromised

Webhook signing prevents an external attacker from spoofing events to the merchant **as long as** the merchant verifies signatures correctly and protects its webhook signing secret. Stripe explicitly frames signature verification as the mechanism to confirm events were sent by Stripe, not third parties. citeturn16view0turn12search2

However, if the merchant’s infrastructure is compromised, the attacker can often:

Disable or bypass signature verification in the merchant’s code.

Trigger internal fulfillment systems directly (without needing to forge webhooks).

Steal secrets (webhook signing secret, API keys), after which spoofing becomes trivial.

Because these are “merchant-side compromise” problems, ArxMint can’t fully prevent false fulfillments, but you can reduce merchant blast radius by making “webhook-driven fulfillment” safer by default:

Document and strongly encourage a “webhook as notice, API as source of truth” pattern: on webhook receipt, merchants should fetch the payment object from ArxMint with server-side credentials and check status/amount/metadata before fulfilling. This mirrors the reality that Stripe webhook delivery is retried and unordered; treating the webhook payload as authoritative without reconciliation is fragile even without compromise. citeturn16view0turn11search3

Provide rapid secret rotation and endpoint disable controls (analogous to Stripe’s ability to roll secrets with immediate expiration or delayed expiration for deployment). citeturn16view0turn15view0

Provide high-quality delivery logs (delivery attempts, status codes, timestamps), because operational debugging is part of keeping webhooks secure and reliable; Stripe highlights delivery status visibility and the need to respond quickly to avoid timeouts and retries. citeturn16view0

## Hosted checkout CSRF considerations

Hosted checkout is a browser surface, so CSRF is in scope any time a user’s browser auto-attaches credentials (cookies) to state-changing requests.

OWASP’s CSRF guidance recommends using built-in CSRF protections when available; otherwise, add CSRF tokens to all state-changing requests and validate them server-side, avoid GET for state changes, and consider defense-in-depth mitigations like SameSite cookies and origin verification headers. citeturn23view0

MDN describes CSRF as forcing the victim’s browser to send authenticated requests cross-site, and outlines three primary defenses (CSRF tokens, Fetch Metadata header checks, and ensuring state-changing requests are non-simple so cross-origin requests are blocked by default), with SameSite cookies as defense in depth rather than a complete solution. citeturn23view1

ArxMint design implication: if hosted checkout uses cookies for session continuity, implement CSRF defenses on any endpoint that changes *anything* (creating an order, attaching metadata, initiating settlement, issuing refunds). If hosted checkout avoids cookies entirely and uses an unguessable checkout-session token passed explicitly, CSRF risk drops substantially—but you still must protect any cookie-authenticated endpoints that exist (e.g., logged-in merchant dashboards). citeturn23view0turn23view1

## Implementation checklist

API key generation and storage

Create two credential classes (publishable/client vs secret/server) with hard capability boundaries; publishable keys can be embedded, secret keys must remain server-side. citeturn15view0turn15view2turn25view0  
Treat secret keys as high-value secrets: never commit them to source, never embed in apps, and store immediately in a secrets manager; adopt “show once” behavior. citeturn15view0turn0search4  
Adopt least privilege via scoped/restricted keys for different systems (e.g., “webhook management” vs “payments create” vs “settlement”), so compromise impact is bounded. citeturn15view0turn14search4  
Make IP allowlisting available for server keys when merchants have stable egress IPs; document tradeoffs for dynamic IP/serverless environments. citeturn15view0turn3view1  

Rotation and in-flight safety

Support overlapping validity windows on rotation (grace period) to avoid downtime, but keep the overlap short and auditable. citeturn15view0  
Use idempotency keys for payment/session creation so retries don’t duplicate writes. citeturn11search3  

Hosted checkout payment finality

For Lightning: gate “paid” on invoice settlement/preimage signals; invoices are payable once and provide cryptographically verifiable proof when recipient sets preimage. citeturn21view0  
For eCash (Fedimint/Cashu): treat received notes/proofs as provisional until you have swapped/reissued/redeemed them so double-spends deterministically fail; Fedimint explicitly describes swap-for-fresh-notes as settlement, and Cashu describes adding secrets to a spent list as the mint-side double-spend barrier. citeturn10view0turn7view0  
Model payment states explicitly (`UNPAID/PENDING/PAID`), including asynchronous completion where appropriate (NUT-05), and structure state transitions as monotonic DB-transaction updates. citeturn8view0  

Webhook security

Sign webhook payloads with an HMAC-SHA256 scheme that includes a timestamp in the signed payload; verify using raw body, constant-time compare, and a timestamp tolerance window. citeturn16view0turn12search2  
Implement replay defense: reject signatures outside the allowed timestamp window; avoid disabling recency checks; ensure clock synchronization (NTP). citeturn16view0turn0search1  
Support zero-downtime webhook secret rotation with overlapping active secrets, and document merchant verification logic for multiple signatures/secrets. citeturn16view0  
Document and enforce idempotent webhook handling (retries and out-of-order delivery are normal), and require “fast 2xx then async work” patterns to reduce retries. citeturn16view0  

Hosted checkout CSRF

Use CSRF tokens (or Fetch Metadata + non-simple request strategies) for any cookie-authenticated state-changing endpoint; do not use GET for state-changing operations; use SameSite as defense in depth, not as the only defense. citeturn23view0turn23view1