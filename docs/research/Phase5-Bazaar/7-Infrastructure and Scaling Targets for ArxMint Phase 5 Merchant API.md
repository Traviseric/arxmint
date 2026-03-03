# Infrastructure and Scaling Targets for ArxMint Phase 5 Merchant API

## System constraints and what must be fast

Phase 5 adds a merchant-facing “control plane” (API keys, checkout sessions, webhooks, SDKs) on top of an existing “money plane” (L402 + Cashu NUT-24 + Lightning + Fedimint). The key scaling implication is that **most user-facing operations must be fast even when settlement is inherently asynchronous**—Lightning routing can take seconds and can fail/retry, while ecash/federated systems can have their own consensus or quote lifecycles. Published Lightning-payment load tests regularly report multi-second average settlement latency at high load, so treating settlement as potentially “seconds+” rather than “sub-200ms” is realistic. citeturn17view0turn18view0

Both L402 and Cashu NUT-24 intentionally map payments onto standard HTTP semantics via **HTTP 402** challenges. L402 describes returning `HTTP 402 Payment Required` with a token and a Lightning invoice (via `WWW-Authenticate`), then later accepting the token plus the Lightning preimage for stateless verification (no invoice DB lookup required). citeturn13view1turn13view0 Cashu NUT-24 similarly specifies a 402 response with an `X-Cashu` header that contains an encoded payment request, and then the client retries the same request “in-band” with a Cashu token in `X-Cashu`. citeturn8view0

Those design choices strongly suggest an architecture where Phase 5 aims for **fast “payment session creation”** (control plane) and **event-driven state transitions** (money plane → control plane → merchant), rather than making merchants poll or wait on synchronous settlement. LND explicitly supports streaming invoice-settlement updates (server→client stream), and Fedimint documents client interactions as asynchronous with status queries and outputs that may require further actions. citeturn22view0turn12view0

## Latency and throughput targets

### Target latency for payment creation

Stripe-like UX usually implies that a “create payment” call returns quickly and deterministically, even if final confirmation arrives later. **Stripe does not promise webhook latency**, and even documents polling as a complement for interactive confirmation pages when webhooks are delayed—this is an important precedent for Phase 5 UX expectations. citeturn19view0

A practical target format is percentile-based SLOs (p50/p95/p99). Industry guidance commonly uses an example SLI of **p95 API response time under ~200ms** for critical endpoints (as a *pattern*, not a guarantee). citeturn21view0turn21view1

Recommended **ArxMint Phase 5 payment-creation SLOs** (for the API call that returns a payment object + payment request like BOLT11 or LNURL-pay):

- **p50**: 50–100ms  
- **p95**: ≤200ms (Stripe-like “feels instant”) citeturn21view0turn21view1  
- **p99**: ≤500ms (tail control matters more than averages) citeturn21view1  

How this aligns with the underlying rails:

- If “payment creation” requires an LND invoice, the call can be structured as: auth + idempotency + DB insert + `AddInvoice` + return. LND documents that `AddInvoice` returns a payment request, and it also provides indexes/streams to monitor settlement later. citeturn22view0turn5search3  
- If the flow uses LNURL-pay, the LNURL spec (LUD-06) is explicitly designed so a wallet hits a callback to fetch a **fresh invoice per payment**, enabling static identifiers with dynamic invoice creation. citeturn31view0  
- If the flow is Cashu NUT-24 in-band 402 + `X-Cashu`, “creation” may be closer to generating a payment request header and accepted mint list—not waiting on Lightning at all. citeturn8view0  

### Target latency for webhook delivery

For webhook delivery, it’s crucial to distinguish:

- **Time-to-first-attempt**: when ArxMint first POSTs to the merchant endpoint after a state transition.
- **End-to-end confirmation**: includes merchant network + merchant processing + retries.

Stripe provides two important behavioral anchors:

- Stripe explicitly says **webhook delivery latency isn’t guaranteed** (hence polling as a complement in interactive flows). citeturn19view0  
- In hosted Checkout flows, Stripe notes it can **wait up to 10 seconds** for your server to respond to a `checkout.session.completed` webhook before redirecting the customer, and recommends responding “as quickly as possible.” citeturn20view0  

Given those anchors, a realistic Stripe-like goal for ArxMint is:

- **Webhook time-to-first-attempt**: median ≤1s, p95 ≤5s (your stated Stripe-style target), p99 ≤15s  
- **Webhook retry policy**: exponential backoff with long retry horizon for reliability; Stripe retries for **up to three days** with exponential backoff in live mode. citeturn2view0turn1search4  

The reason to treat “≤5 seconds” as a p95 target (not a hard guarantee) is that even Stripe frames webhooks as reliable-but-not-immediate, and trains integrators to handle delays and duplicates. citeturn19view0turn2view0  

### How many concurrent payments should the system handle

Concurrency targets should be derived from throughput and “time in pending state,” because a payment object can remain pending while the customer decides, while Lightning routes, or while a federation transaction finalizes.

Two published Lightning load-test reference points:

- entity["company","Alby","lightning wallet company"] reported LND + bbolt sustaining roughly **~22 TPS with ~5 seconds average latency** in one setup (tests were under high load and specific infrastructure constraints). citeturn17view0  
- entity["company","Bottlepay","bitcoin payments company"]’s benchmark repo describes a harness with 100 workers continuously requesting invoices and paying them, and reports LND bbolt results on the order of **tens of TPS** on an 8 vCPU/32GB machine (noting it used older versions and regtest-style assumptions). citeturn18view0  

Implications for ArxMint:

- If your Phase 5 “money plane” requires on-demand Lightning receive/send for most payments, then **a single Lightning node is plausibly a tens-of-payments-per-second component under sustained load**, and scaling beyond that typically means **multiple nodes/gateways with liquidity management**. citeturn17view0turn18view0  
- If many Phase 5 interactions are instead “control plane” (creating sessions) while actual settlement is optional/periodic (e.g., internal ecash transfers plus batched settlement), then the concurrency requirements shift primarily to your API + DB + websocket/SSE fanout rather than to Lightning throughput. citeturn8view0turn12view0  

A practical way to specify concurrency in requirements (so it’s testable) is to define tiers:

- **Baseline (single-node self-host target)**: 100–300 concurrent “open” payment sessions; 10–30 payments/minute settlement capacity depending on Lightning liquidity and route conditions. citeturn17view0turn18view0  
- **Mid-scale managed target**: 10,000 concurrent open sessions platform-wide; 100–300 settlement events/sec achieved via a pool of Lightning nodes/gateways rather than one node. (This is a design target that follows from published “tens of TPS per node” observations, not a promise.) citeturn17view0turn18view0  

## Payment-status delivery and database load

Payment status is a classic “rare writes, many reads” problem. Stripe’s own guidance acknowledges that webhooks can be delayed and suggests client-side polling in the confirmation experience as an optimization, while still requiring webhooks for reliability. citeturn19view0turn20view0 That exact trade applies to ArxMint: you want instant UI updates *without* melting your DB.

### Polling vs SSE vs WebSocket

Polling is simplest but has predictable multiplicative load:

- If **N** customers are simultaneously on a checkout page and you poll every **t** seconds, you generate **N/t requests per second**, most of which return “still pending.” This is why “Stripe-like” systems generally push status rather than requiring continuous polling. citeturn19view0  

SSE (Server-Sent Events):

- SSE uses `EventSource` to keep a one-way server→client stream open; **by default it automatically reconnects** if the connection drops. citeturn29view0  
- SSE has browser connection limits (notably when not using HTTP/2, connections-per-origin can be very low), which matters if merchants open many tabs. citeturn29view0  

WebSockets:

- WebSockets provide a persistent **two-way** channel and explicitly avoid polling. citeturn29view1  
- MDN notes the standard `WebSocket` interface does not provide built-in backpressure (risking buffering/memory issues under high message rates), and it highlights backpressure as a design concern. citeturn29view1  
- In practice, WebSockets can also face enterprise firewall/proxy quirks; third-party comparisons frequently call this out as an operational consideration. citeturn16view0  

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["server sent events architecture diagram","websocket architecture diagram","payment webhook delivery architecture diagram","lightning invoice payment flow diagram"],"num_per_query":1}

### Leverage streaming sources to eliminate “poll the money plane”

The simplest way to protect the DB is not merely “use SSE,” but also: **don’t poll LND or mints for every payment**.

LND provides purpose-built streaming primitives:

- `SubscribeInvoices` provides a **stream** of invoice updates and notifies when invoices are settled; it also supports historical streams using add/settle indexes to catch up after restarts. citeturn22view0  
- LND describes `ListInvoices` as a polling alternative, but streaming is the obvious scaling path for your own platform services. citeturn22view0  

Cashu provides a similar concept:

- NUT-17 defines a WebSocket protocol (`/v1/ws`) using JSON-RPC that supports **real-time subscriptions** for quote and state changes, including sending the current state immediately when a subscription is accepted. citeturn11view0  

Fedimint protocol docs emphasize asynchronous status work:

- Fedimint describes clients submitting a transaction, then querying transaction status (“proposed → accepted/error”), while noting accepted may still require follow-up actions depending on module outputs. citeturn12view0  

### A practical “Stripe-like” fanout pattern

A robust pattern for Phase 5 is:

1. **Single internal source of truth**: your payments DB is authoritative for merchant UX and webhooks.  
2. **Event-driven ingestion** from LND (`SubscribeInvoices`) and from mints (e.g., NUT-17) updates the DB when external state changes. citeturn22view0turn11view0  
3. **Push to clients**: hosted checkout uses SSE by default (simpler, one-way), with WebSockets optional for advanced dashboards. citeturn29view0turn29view1  
4. **Webhook worker** reads the same internal event stream and delivers webhooks asynchronously with retry/backoff behavior similar to Stripe’s long retry horizon. citeturn2view0turn1search4  

If you want a minimal-dependency internal event bus, PostgreSQL `LISTEN/NOTIFY` can provide commit-coupled notifications: `NOTIFY` is delivered only on transaction commit, and Postgres warns that “real-time signaling” works best with short transactions (notifications are delivered between transactions). citeturn28view0 This can power SSE/WebSocket fanout without introducing Kafka/NATS on day one, although you still need a durable retry queue for webhooks.

## Multi-tenant managed deployment architecture

A multi-tenant ArxMint (hosted control plane + hosted money plane) needs to scale **stateless API servers** and **stateful payment infrastructure** separately.

### Core infrastructure components

- **Load balancer** in front of the merchant API + hosted checkout (stateless app servers). This is the standard way to scale “Stripe-like API” horizontally while keeping latency predictable. citeturn27view0  
- **Database**: a primary DB for payments, merchants, API keys, webhook endpoints, event logs, settlement schedules. At higher scale, you’ll want read replicas and careful indexing because status endpoints can become read-heavy if you permit polling. citeturn19view0turn27view0  
- **Webhook delivery subsystem**: asynchronous worker(s) with durable retry tracking. Stripe documents both automatic retries (multi-day) and manual resend tooling in Dashboard/CLI—this is a strong reference model for designing your own “event deliveries” log and replay. citeturn2view0  

### Lightning and federation scaling shapes

For a managed service that directly originates Lightning invoices/sends, published benchmarks suggest Lightning node software under stress is a real throughput constraint, often landing in “tens of TPS per node” territory (test-dependent). citeturn17view0turn18view0 That pushes you toward:

- **Multiple Lightning nodes** with capacity planning + liquidity management, rather than a single “big node.”  
- Partitioning strategies such as “tenant→node affinity” (sticky assignment) to simplify accounting and liquidity heuristics.

Fedimint supports a “gateway market” model:

- Gateway docs explain that Lightning gateways run Lightning nodes and can service many Fedimints, and Fedimints can be serviced by many gateways; they also emphasize active management of channels/liquidity. citeturn12view1  
- Fedimint’s own “What is a Fedimint” documentation describes Lightning gateways as a persona that monitors the federation for requests to pay invoices/receive payments, bridging ecash and Lightning. citeturn32view0  

So a scalable managed design is a **gateway pool**: multiple gateways behind internal routing, each with its own Lightning node & liquidity, feeding a common payments DB and event pipeline.

### Bitcoin backend considerations for multiple LND nodes

If you run LND with a Bitcoin backend (rather than Neutrino), entity["organization","Lightning Labs","bitcoin lightning company"]’ gRPC “Get Started” doc explicitly notes:

- LND can run in Neutrino mode without a Bitcoin backend, but for performance it recommends running Bitcoin Core or btcd on the same machine or network. citeturn23view0  
- It also points to an “rpcpolling” option (as a ZMQ alternative) and explicitly mentions architectures like **multiple LND nodes per bitcoind backend** or multiple bitcoind backends behind a load balancer. citeturn23view0  

That maps closely to your question’s “load balancer + multiple LND nodes + database cluster” multi-tenant intuition.

## Self-hosted deployment sizing and $5 VPS feasibility

Self-hosting has two very different interpretations:

1. **Self-host Phase 5 control plane only** (API/UI/webhooks) while connecting to an existing Lightning/Fedimint/Cashu backend elsewhere.
2. **Self-host the entire stack**, including a Lightning node and possibly Bitcoin Core.

### Minimum VPS spec if a Lightning node is included

Published guidance and “real stacks” suggest that a $5/month VPS is usually too constrained for “all-in-one” reliability, but it may work for development or very small merchants.

Relevant reference points:

- The LND “Get Started” doc lists minimum machine requirements as **2GB RAM**, a “1 GHz quad core,” and at least **5GB storage**, and it recommends SSD-quality storage due to frequent reads/writes. citeturn23view0  
- Bitcoin.org’s “Running a full node” guide lists minimum requirements including **2GB RAM** and **~7GB disk**, and it notes pruning can reduce disk usage from **>350GB to ~7GB**, though initial sync and bandwidth remain heavy. citeturn24view0  
- BTCPay Server’s own documentation ecosystem is a close analog for “self-hosted merchant payments”: BTCPay’s blog states minimal requirements as Docker, **2GB RAM (possible with 1GB)**, and at least **15GB of storage** depending on pruning. citeturn26view0  

**Conclusion on “$5 VPS”**:  
A typical $5 VPS often provides ~1 vCPU and ~1GB RAM, which conflicts with multiple sources’ “2GB RAM” baseline for LND/Bitcoin-style infrastructure. citeturn23view0turn26view0turn24view0 If ArxMint Phase 5 must run Postgres + API + webhook workers + a Lightning node on the same machine, you should treat **2GB RAM as the practical floor**, and **4GB RAM as the “comfortable” floor** once you include observability, TLS termination, and burst traffic.

### Minimum VPS spec if Lightning is externalized

Because LND can operate in Neutrino mode without a Bitcoin backend, one self-host path is “keep the merchant API small, keep the money plane elsewhere.” citeturn23view0 In that model:

- A $5 VPS may be sufficient for **API + minimal DB** for very low traffic, but webhooks and persistent SSE/WebSocket connections can still exhaust file descriptors/memory if you oversubscribe the node.
- You’ll still want durability for payment state and webhook attempts—so a real DB remains important if you want Stripe-like correctness. citeturn2view0turn19view0  

### Interaction with an existing Docker Compose stack

BTCPay’s docs repeatedly emphasize Docker-based deployment as the easiest way to wire multiple moving parts correctly; its “web deployments” and VPS guidance assume containerized stacks. citeturn26view0turn25view0

For ArxMint, the Compose implications are straightforward at the architecture level:

- Keep Phase 5 services **stateless where possible** (API server, hosted checkout frontend) so they can be replicated later.
- Separate “workers” (webhook delivery, settlement automation) from the request path so payment creation latency doesn’t inherit third-party latency.
- Make the Lightning/Fedimint/Cashu connectors explicit services with health checks, because they become the primary source of payment state transitions. citeturn22view0turn11view0turn12view0  

## Managed hosting option and operational playbook

A managed offering is strongly justified if the goal is “Stripe-level developer experience,” because the highest-friction part of self-hosting is not writing API code—it’s operating payment infrastructure (channels, liquidity, backups, monitoring, upgrades).

An established analog is BTCPay Server’s provider integrations:

- BTCPay’s docs describe “web deployments” as third-party hosted environments that provide storage/compute and hosted Bitcoin nodes, explicitly acknowledging the trust trade-off. citeturn25view0  
- BTCPay highlights a LunaNode web wizard as one of the easiest deployment paths and notes it can provide a generic domain to get started. citeturn25view0turn25view1  
- BTCPay’s LunaNode guide also frames a bundled hosted environment that includes a Bitcoin full node and Lightning node (with a published price point at the time of writing, which should be treated as variable over time). citeturn25view1  

A pragmatic product positioning that preserves “sovereignty” while enabling adoption:

- **Self-hosted first**: Docker Compose remains the reference deployment for sovereignty and auditability. citeturn26view0  
- **Managed option as an accelerator**: one-click deployments on a partner host (as BTCPay does) that run the same open stack, with clear escape hatches (export keys/config, migrate DB, swap webhook endpoints). citeturn25view0turn25view1  
- **Operational standards borrowed from Stripe**: event delivery logs, replay tooling, long retry horizon with exponential backoff, and explicit warnings that ordering is not guaranteed (Stripe documents this behavior). citeturn2view0turn19view0  

The strongest “managed hosting” recommendation, based on the evidence above, is to treat it as a **separate product surface**: the managed service’s real value is that it supplies the hard-to-run components (Lightning node(s)/gateway pool, monitoring, backups, upgrades), while keeping the Phase 5 API semantics identical for portability. citeturn12view1turn23view0turn25view0