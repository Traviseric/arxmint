# ArxMint Phase 5 Developer Experience Research

## What makes Stripe and Square feel effortless to integrate

A recurring theme across entity["company","Stripe","payments company"]’s client-side approach is that the *integration entrypoint is tiny*, while complexity is pushed into hosted primitives (hosted JS, hosted UI components, hosted logs/debug tools). For example, Stripe’s maintained wrapper package is explicitly designed to do one thing well: load the canonical Stripe.js script and hand you a ready client object via a single async function (`loadStripe`). The library inserts the `<script>` tag for you if needed, resolves to `null` in server environments (to avoid SSR pitfalls), and exposes a “pure” import path to defer side-effects until you actually call `loadStripe`. citeturn5view0

The same wrapper also communicates an important security/product posture: **you don’t bundle or self-host the canonical browser payments runtime** when compliance and rapid security updates matter. Stripe documents this directly: to be PCI compliant, Stripe.js must be loaded from `https://js.stripe.com` and not packaged into your own bundle or served from your own domain. citeturn5view0

Another “it just works” factor is how Stripe reduces the merchant’s risk surface for sensitive inputs. Checkout and Elements isolate card-data collection inside iframes served from Stripe’s domain, keeping card data off the merchant’s servers. citeturn1search2turn1search8 This same structural decision also makes it practical to offer **framework-agnostic UI primitives**: iframes (and closely related patterns like hosted modals) behave consistently across frameworks, while still allowing some level of theming.

With entity["company","Square","block inc payments brand"], the same integration philosophy shows up in a different shape. Square offers distinct SDK “lanes” for online vs in-person:

- For **online web payments**, the Web Payments SDK is a browser-client SDK that generates a secure single-use payment token that your backend then processes using the Payments API. citeturn7view3  
- For **in-person**, Square emphasizes hardware-/device-aware surfaces like the Terminal API and the Mobile Payments SDK to accept in-person payments while handling EMV/PCI requirements through Square’s hardware + certified flows. citeturn3search0turn3search1turn3search2  

This separation is a practical “developer experience” choice: it prevents developers from wading through irrelevant options when their use case is unambiguous (web checkout vs POS), but still keeps the back-office concepts coherent via common resource APIs.

Square’s Web Payments SDK highlights a few patterns worth “stealing” for ArxMint’s SDK goals:

- **Granular configuration**: you only configure the payment methods you accept (each method has its own object). citeturn18view3  
- **Promise-based async ergonomics**: modern async/await instead of callbacks, reducing integration boilerplate. citeturn18view3  
- **Automatic localization** (with override) at the SDK level. citeturn18view3  
- **A clear tokenization boundary**: client generates a one-time token; server finalizes the payment. citeturn7view3turn7view1  

Those patterns matter for ArxMint because you’re explicitly aiming for a “Stripe-level developer experience”: low ceremony, obvious default path, and a stable set of primitives that scale from “toy demo” to production.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["Stripe Payment Element embedded UI component example","Square Web Payments SDK card element example"],"num_per_query":1}

## SDK design implications for ArxMint

### Minimum viable SDK surface

If you want “<15 minutes to first payment,” your minimum viable SDK should bias toward **a hosted checkout session + a single client mount call**, because it collapses decision fatigue. Stripe’s docs and samples repeatedly lead developers to a guided “accept a payment” flow and Stripe-hosted or prebuilt UI forms as the shortest path. citeturn2search2turn2search5

A pragmatic minimum viable ArxMint browser integration can be:

- A **single `<script>` include** (or ESM import) that exposes a `loadArxMint()` function similar in spirit to Stripe’s `loadStripe()` design (async + safe under SSR), because this pattern is already familiar to a huge portion of web developers. citeturn5view0  
- A **single “create checkout session” server call**, returning a short-lived `client_secret` (or session token).
- A **single client call** to render the hosted checkout UI (iframe/modal or redirect).

If you *also* support an “advanced/headless” path (merchant renders their own Lightning UI, LNURL-pay controls, etc.), treat it as a later integration tier—Stripe does this by making it possible, but not the default for most developers. citeturn2search2turn12image5

### Package separation: core loader vs framework bindings

Stripe strongly signals a separation of concerns:

- One package primarily focused on loading and typing the browser runtime (`@stripe/stripe-js`) citeturn5view0  
- Another package that provides React-specific bindings as a thin wrapper (“React Stripe.js is a thin wrapper around Stripe Elements”) citeturn1search7  

This is a good default for ArxMint because it keeps the core runtime stable and framework-agnostic while letting you iterate quickly on React ergonomics without destabilizing the universal API surface.

Concretely: publish a core package (`@arxmint/arxmint-js`) and a React companion (`@arxmint/react`). The React package should depend on the core types/loader in the same way Stripe’s React package pulls types from `@stripe/stripe-js`. citeturn5view1turn1search4

### Framework-agnostic UI components: iframes vs “native DOM” vs web components

Stripe’s iframe approach is closely tied to compliance and risk isolation: sensitive inputs live in Stripe-served iframes so the merchant environment doesn’t touch card data. citeturn1search2turn1search8 Although ArxMint’s “no customer KYC” + “self-hosted sovereignty” goals differ from PCI card flows, the *product reasons* to use iframe-/hosted-UIs still map cleanly:

- You can **isolate wallet/signing logic** (or Cashu token handling) away from merchant JS, which is meaningful if you want to protect users from malicious or compromised merchant frontends.
- You can **ship UX improvements without requiring merchants to redeploy** their code (because the UI runtime is hosted).
- You can offer consistent behavior across frameworks, similar to why Stripe and Square invest in embeddable components.

The sovereignty constraint changes the tradeoff: you likely need **two deployment modes** for the UI runtime:

- **Hosted mode (ArxMint-hosted)**: simplest integration, fastest adoption.
- **Self-hosted mode (merchant or community hosted)**: “sovereign checkout host” that can still be embedded via iframe/modal/redirect, but lives at a merchant-controlled domain.

This mirrors the functional benefits of Stripe’s hosted primitives while respecting your architecture goals.

### Borrow Square’s “granular payment-method objects” pattern for Lightning modalities

Square’s Web Payments SDK is deliberately modular: you instantiate `payments`, then create payment method objects (card, wallets, etc.), attach to DOM, tokenize, and pass to your backend. citeturn7view1turn7view2turn18view3

ArxMint can borrow the same pattern without copying card semantics:

- `payments.lightning()` (or `payments.lnurlPay()`) creates an object that can render a QR, copy invoice, handle polling, and emit lifecycle events.
- `payments.cashu()` creates an object that can handle ecash-based flows (if you expose them client-side).
- A shared “server finalize” boundary remains: client yields a short-lived token or proof; backend settles/records/acknowledges.

This keeps the API coherent (one mental model), while allowing multiple payment modalities to exist cleanly.

## API design choices that tend to win: a Stripe/Square hybrid

### REST vs GraphQL

Stripe states plainly that its API is organized around REST with resource-oriented URLs and JSON responses. citeturn10view0 Square also documents that its APIs follow general REST patterns. citeturn14search14

For ArxMint Phase 5, a REST-first approach is the safest path to a “Stripe-level” DX because:

- It aligns with the expectations that developers already have from major payments providers. citeturn10view0turn14search14  
- It enables copy-paste curl examples and consistent language SDK generation (which matters for your “client SDK + dashboard” roadmap).

If you later add GraphQL, treat it as an *adjacent* surface for dashboard-style data exploration, not as the canonical write API. Square’s own docs ecosystem emphasizes REST conventions and common REST patterns (pagination, idempotency, error handling), which is exactly the territory where payment systems need predictable behavior. citeturn14search14turn17view0turn17view3

### Versioning: date-based versions and pinned webhook versions

Stripe’s “dated versions” are a core reason their API remains evolvable while staying predictable. Their docs emphasize:

- You can override API versions per request using the `Stripe-Version` header. citeturn10view1  
- Webhook events use the API version set when the webhook endpoint is created (or otherwise default to account version), and Stripe provides explicit guidance for webhook versioning upgrades. citeturn15search4turn16view3  

Square uses the same strategy: requests include a `Square-Version` header (visible in pagination examples), which effectively pins behavior. citeturn17view1

Recommendation for ArxMint: implement a **date-based version header** as the primary strategy (e.g., `ArxMint-Version: 2026-03-01`). Then:  
- Allow per-request overrides (useful for SDK testing and early adopters). citeturn10view1turn15search4  
- **Pin webhook endpoints** to an explicit version at creation time, and provide an upgrade path similar to Stripe’s “create a new disabled endpoint” approach so merchants can dual-run during upgrades. citeturn16view3turn15search4  

### Pagination: cursor-based is the default for payment history

Stripe’s list APIs are cursor-paginated via `starting_after` / `ending_before`, with `limit` in the range 1–100 and a list envelope containing `object="list"`, `data`, `has_more`, and `url`. citeturn10view3turn15search12

Square also uses cursor-based pagination and emphasizes that the initial call omits `cursor`, while subsequent calls include the cursor and the *same original query shape*; it even documents cursor lifetime constraints. citeturn17view1turn17view0

For ArxMint: adopt cursor pagination from day one for all “list” endpoints (payments, invoices, customers, webhook deliveries, settlements). This will avoid common foot-guns of offset pagination when new objects are inserted between page fetches—especially relevant for payment/event streams.

A Stripe-like envelope is both familiar and well-documented; a Square-like `cursor` field is simpler. Either is fine—what matters is consistency across the API surface. citeturn10view3turn17view1

### Error response format: combine Stripe’s “single rich error object” with Square’s “errors array”

Stripe’s error object is unusually ergonomic because it carries:

- A stable **error `type` enum** (api_error, card_error, idempotency_error, invalid_request_error). citeturn9view1  
- A machine-readable `code`, an optional `param`, a `message` appropriate for user display in some contexts, and a `doc_url` for quick remediation. citeturn9view1turn8search5  
- A `request_log_url` so developers can jump directly to the originating request in the dashboard. citeturn9view1turn13search12  

Square, meanwhile, returns an `errors` array with objects that include a high-level `category`, a specific `code`, plus `detail` and (optionally) `field`. citeturn18view1

For ArxMint, you can get the “best of both” by standardizing on:

- **Top-level `error` object** (Stripe-like) for the common case of one error that blocks the request.
- **Optional `errors[]` array** (Square-like) for cases where you want to return multiple validation issues at once (for example, multiple invalid parameters), without forcing clients to scrape nested structures.

If you pick only one, the Stripe-style single object is often the fastest-to-integrate baseline because it’s predictable and carries debugging affordances (`request_log_url`, `doc_url`). citeturn9view1turn13search9

### Rate limiting: per-key + reason headers + backoff guidance

Stripe documents multiple limiters (rate and concurrency) and standardizes on HTTP 429 for burst/overuse, while returning a reason header (`Stripe-Rate-Limited-Reason`) to indicate what limit was exceeded. citeturn11view0 Stripe explicitly recommends exponential backoff with jitter to avoid thundering herd effects. citeturn11view0

Square’s docs similarly warn about pagination staleness and encourage correct paging patterns; while not “rate limiting” in itself, it reflects the same ethos: the API communicates constraints directly enough that client behavior can be correct by default. citeturn17view0

For ArxMint: implement rate limits at minimum per API key, and consider additional buckets for:
- high-cost endpoints (settlement automation triggers, bulk exports)
- webhook delivery list/replays
- dashboard polling endpoints

Return:
- `429 Too Many Requests`
- `Retry-After` (seconds)
- `ArxMint-Rate-Limited-Reason` with a small enum (global-rate, global-concurrency, endpoint-rate, endpoint-concurrency, resource-specific), mirroring Stripe’s clarity. citeturn11view0

### Idempotency: an operational necessity for settlement-grade APIs

Stripe’s idempotency design is explicit and battle-tested:

- The server stores the first response (status code + body) for an idempotency key and returns the same result for retries—even if the first response was a 500. citeturn6view1turn13search3  
- Keys can be up to 255 characters; Stripe recommends UUIDv4; and keys can be pruned after at least 24 hours. citeturn6view1turn13search10  
- If a key is reused with different parameters/endpoint, Stripe errors to prevent accidental misuse. citeturn6view1turn8search4  

Square frames idempotency in similar “don’t charge twice” terms: retrying the same CreatePayment with the same idempotency key should return the original success response, and reusing the key with different request data should produce an error. citeturn17view2turn17view3

For ArxMint Phase 5, idempotency should be mandatory (or at least *strongly recommended*) on any endpoint that can create:
- a payment / invoice / checkout session
- a payout / settlement instruction
- an API key rotation event (if you allow programmatic key changes)

And it should follow Stripe’s model: request fingerprinting, response replay, and mismatch detection. citeturn6view1turn8search4

## Webhooks, request tracing, and “developer dashboard” primitives

The second major reason payment APIs feel reliable is that they are *debuggable*, not just functional.

Stripe provides:

- **Request IDs** for each API call, returned in response headers (`Request-Id`) and used as a primary support/debug handle. citeturn13search9  
- **Direct links to logs from error objects** via `request_log_url`. citeturn9view1turn13search12  
- Browser-based developer tooling (Workbench Shell + API Explorer) that helps you explore endpoints and even print SDK code. citeturn10view2  

On the webhook side, Stripe strongly recommends signature verification using the `Stripe-Signature` header plus a shared endpoint secret. citeturn4search1turn4search5 Stripe also treats webhook versioning as a first-class lifecycle problem and documents how to upgrade safely. citeturn16view3turn15search4

Implications for ArxMint Phase 5:

- Emit a **request ID** on every response (header `Request-Id`) and ensure it shows up in the merchant dashboard’s request logs. Stripe explicitly positions request IDs as the fastest way to resolve issues. citeturn13search9  
- Include a **log URL** in your error object (dashboard deep link), because that makes errors actionable instead of “opaque JSON.” citeturn9view1turn13search12  
- Sign webhooks with an HMAC header that includes a timestamp (Stripe-style), provide official verification snippets, and treat verification as “day one” documentation. citeturn4search1turn4search5  
- Version webhooks explicitly at endpoint creation and provide “dual-run” upgrade guidance, mirroring Stripe’s lifecycle tooling. citeturn16view3turn15search4  

A practical “launch set” for the merchant dashboard, if you’re trying to hit Stripe-level confidence early, is:

- API keys (create, restrict/scopes, rotate)
- request logs (search by request ID, filter by status)
- webhook endpoint config + delivery logs + replay button
- payouts/settlements timeline

Those are the primitives that let merchants self-diagnose most integration issues without opening a support ticket.

## Documentation patterns that make Stripe “gold standard” and what to launch with

Stripe invests in documentation infrastructure that directly supports speed-to-success:

- Their docs stack (Markdoc) explicitly enables rich, structured technical writing features like tabs, collapsible sections, and multi-language code samples without heavy custom work. citeturn6view0  
- Their browser-based Workbench tooling pairs with docs to create a “try it here” loop: Shell, API Explorer, and generated SDK code snippets. citeturn10view2turn2search3  
- They maintain a library of sample projects and “accept a payment” flows that serve as canonical references. citeturn2search5turn2search2  

Square also reinforces “DX via docs” with clear SDK guides, embedded code playgrounds in some references, and common API pattern pages for pagination/idempotency/error handling. citeturn18view2turn17view3turn18view1

### Minimum viable documentation for ArxMint launch

To credibly launch Phase 5, you likely need a small but complete doc set that maps to a merchant’s real workflow. A minimum that mirrors the strongest parts of Stripe/Square would include:

- **Quick Start**: “first payment” path that is intentionally the shortest viable integration (hosted checkout + webhook). Stripe’s “Accept a payment” guide strongly demonstrates this style: stepwise, testable, and ending in a dashboard verification loop. citeturn2search2turn13search2  
- **Authentication + API keys**: key types, environment separation (test/live), key rotation story. Stripe’s API keys docs emphasize restricted keys, rotation, and that you only see live keys once. citeturn6view5turn4search7  
- **Errors**: a single page that explains error object fields and remediation mechanics (including log links). Stripe’s error object attributes and status code table are a strong template. citeturn9view1  
- **Idempotency**: required header, retention window, mismatch handling. Stripe’s idempotency semantics are clear enough to port almost directly. citeturn6view1turn8search4  
- **Webhooks**: signature verification, retries, replay tooling, and version pinning. citeturn4search5turn16view3  
- **API reference**: even if incomplete, everything you ship must be documented in a consistent reference format (curl + at least one server SDK language).

If you can add one “Stripe-like” differentiator early, add a browser-based API explorer (even minimal) because Stripe explicitly demonstrates how it accelerates integration and debugging. citeturn10view2turn2search3

## A Quick Start that can realistically hit “first payment in under 15 minutes”

Stripe’s “accept a payment” flow and sample repos show a consistent onboarding pattern: create a server-side object → render a hosted/prebuilt client UI → test → verify in dashboard logs. citeturn2search2turn2search5turn13search2

To match that pace for ArxMint, the Quick Start should be aggressively opinionated:

- **Step one: create an API key** in the merchant dashboard (show it once, force copy/save), exactly like Stripe’s posture for live keys. citeturn6view5turn4search7  
- **Step two: create a checkout session** via a single curl command (or copyable snippet) using an idempotency key by default. Stripe recommends idempotency keys for POSTs, and saving/replaying the first response is the behavior developers come to expect. citeturn13search10turn6view1  
- **Step three: paste a 6–10 line HTML snippet** that loads the SDK and mounts hosted checkout into a div (or triggers a redirect). This should mirror the simplicity of `loadStripe()` as “one async call that yields the client.” citeturn5view0  
- **Step four: set up one webhook** (e.g., `payment.succeeded` / `settlement.completed`) and provide a copy-paste signature verification snippet. Stripe’s docs make signature verification the recommended baseline, not an optional afterthought. citeturn4search5turn4search1  
- **Step five: verify** in a “Logs” view (request logs + webhook delivery logs). Stripe emphasizes request IDs and log visibility as first-class debugging handles. citeturn13search9turn13search2  

If you follow this path, the “15 minutes” claim becomes plausible because the developer doesn’t have to decide between:
- LNURL-pay vs invoice generation vs hosted checkout
- webhooks vs polling
- settlement timing options

Those can be “next step” docs, not step-zero blockers.

The final design pressure test is this: if an engineer can copy the Quick Start into a fresh project and get **a completed payment** plus **a webhook receipt** and **a visible log entry** without reading any other docs, you’re on track to meet the expectations set by Stripe and Square’s best onboarding flows. citeturn10view2turn2search2turn18view1