# CDK vs Nutshell as a production Cashu mint for ArxMint

## Executive summary and decision framing

Running any Cashu mint with real money is inherently higher-risk than typical “web app” infrastructure because (a) the ecosystem is explicitly described as early-stage, (b) wallet funds can be lost due to software/protocol bugs, and (c) the mint is the Lightning custodian for users’ sats. citeturn21view2

Given your pilot’s modest scale (≈30 merchants / 300 MAU / small balances) and the fact that your current stack is already based on Nutshell, the “best” choice hinges on minimizing the probability of a correctness/funds bug versus minimizing operational risk (monitoring, upgrades, scaling) during live operation.

- Nutshell is positioned as the reference mint implementation in the Cashu ecosystem documentation. citeturn19search19turn4search13  
- CDK is explicitly labeled “ALPHA” and tells operators to only use amounts they do not mind losing, even though it “does however work with real sats.” citeturn9search1turn1search7  
- CDK’s mint daemon (cdk-mintd) ships with stronger “operator ergonomics” (config file + env vars, multiple DB engines including Postgres, structured logging, and explicit Prometheus/Grafana monitoring hooks). citeturn14search10turn14search3turn13view0  

Concrete bottom line:

- **Pilot recommendation:** Run **Nutshell** (Postgres-backed) with strict safety guardrails (caps, rate limiting, backups, upgrade discipline) because it is the reference mint implementation and appears more widely deployed for real mints today (e.g., Minibits’ public mint is reported as Nutshell). citeturn19search19turn5search1turn21view2  
- **Production-scale recommendation:** Plan to move to **cdk-mintd** once you can accept CDK’s stated maturity posture (or that posture changes), because CDK is being explicitly funded/positioned for cloud operability and built-in observability (Postgres + Prometheus + Docker images + operator roadmap). citeturn17search2turn14search10turn14search3  

## Protocol support and interoperability

### Baseline protocol coverage

The Cashu NUTs “support matrix” lists both Nutshell and cdk-mintd as mint implementations and shows them implementing a broad set of optional mint-side NUTs (e.g., NUT-07 state check, NUT-19 cached responses, NUT-20 signature on quote, NUT-21/22 auth, NUT-23 BOLT11). citeturn19search11

This matters for interoperability with multi-mint wallets, because the **multi-mint story is mostly wallet-driven**: a wallet can move value between mints by swapping out via Lightning (melt) and swapping in at another mint (mint). Cashu’s own FAQ describes this as “Multimint Swap” via Lightning because each mint’s tokens are distinct. citeturn21view2

### Your requested NUTs: NUT-24, NUT-26, NUT-13, NUT-28

**NUT-24 (HTTP payment / “HTTP 402 Payment Required”)**  
NUT-24 specifies how an HTTP server can return `402 Payment Required` with an `X-Cashu` header containing an encoded NUT-18 payment request, and how clients can retry with Cashu tokens in-band. citeturn23view0  
However, the NUTs support matrix currently lists **no implementations** (wallet or mint) for NUT-24. citeturn19search11  
Implication: NUT-24 is not a deciding factor for “production mint choice” today; it is a roadmap consideration.

**NUT-26 (payment request Bech32m encoding)**  
NUT-26 specifies a Bech32m/TLV encoding for payment requests to reduce size and improve QR compatibility versus NUT-18’s CBOR+base64 format. citeturn23view2  
The support matrix lists NUT-26 as implemented by CDK (wallet side), and not implemented by other wallets/mints in that table. citeturn19search11  
CDK release notes also explicitly call out NUT-26 support. citeturn1search19turn18search14  
Implication: NUT-26 is primarily a **wallet UX** improvement (shorter QR), not a mint-server differentiator for your pilot.

**NUT-13 (deterministic secrets / seed-based recovery)**  
NUT-13 is wallet-oriented (seed phrase recovery). The NUTs matrix lists Nutshell and CDK among wallets supporting NUT-13, and does not list it as a mint-side feature. citeturn19search11turn1search1  
Implication: Your mint choice is not the main determinant of NUT-13 support; the primary driver is which wallets your users choose.

**NUT-28 (P2BK / Pay to Blinded Key)**  
The NUTs matrix lists **no implementations** yet for NUT-28. citeturn19search11turn24search1  
There is also an open Nutshell issue explicitly requesting compatibility with P2BK proofs, which reinforces that it is not “done and shipped” in Nutshell today. citeturn16view0  
Implication: If P2BK becomes a “must-have,” it will likely arrive first in wallets/libraries, and only later become a stable mint requirement. It should not drive the pilot decision.

## Stability and fund-safety risk

### The non-negotiable reality: funds-risk is acknowledged by the ecosystem

Cashu documentation explicitly warns: the protocol/tools are early, funds can be lost due to bugs, and the mint is the Lightning custodian that must be trusted for redemption. citeturn21view2  
So “stability” is not just about language/runtime—it’s about **operational controls** (caps, backups, monitoring, upgrade discipline) that reduce blast radius when something goes wrong.

### Nutshell’s stability profile

Nutshell is characterized as the reference mint implementation and “the first Cashu wallet and mint” in official ecosystem docs. citeturn19search19turn19search23  
It is also used against real public mints in the wild; for example, a long-standing issue report references using the “default mint” `https://8333.space` and encountering real payment flow anomalies (“Invoice paid; Mint did not provide a preimage”). citeturn19search2  

At the same time, Nutshell has had concrete, tracked security/robustness problems:

- **CVE-2025-65548** (as described in entity["organization","NIST","us standards org"]’s NVD) reports that Nutshell versions before 0.18.0 did not validate HTLC preimage size when spending, allowing an attacker to fill the mint’s DB/disk with arbitrary data (a denial-of-service vector). citeturn18search2turn17search0  
- Nutshell also has active open issues that touch production safety and reliability: Postgres connection pool consumption, SQLite concurrency tuning (WAL/busy_timeout), and a management-RPC keyset rotation timestamp bug. citeturn16view0  

Operationally, Nutshell releases frequently include database migrations and explicitly warn operators to back up the mint DB before upgrading to avoid data loss. citeturn22search9turn3search1  

Interpretation: Nutshell looks “more battle-lived,” but it is not “boring infrastructure.” It demands careful operational controls and conservative upgrade practices.

### CDK’s stability profile

CDK’s own documentation explicitly labels the project as early-stage/alfa and tells operators to use it with caution and only with amounts they do not mind losing. citeturn9search1turn20search12  
The same alfa maturity warning appears in LND backend docs (cdk-lnd). citeturn13view0  

Like Nutshell, CDK releases can include mint database migrations and warn operators to back up before upgrading. citeturn22search1turn22search4  

However, CDK also shows explicit engineering focus on crash resilience and state correctness in wallet/melt flows (e.g., “Wallet Sagas,” “robust error recovery,” “crash resilience,” redesigning melt to a two-phase prepare/confirm pattern, and “Keyset V2 is now the default for new keysets”). citeturn1search19turn18search14  
While that is not purely mint-server code, it is a signal about the project’s direction: correctness around partial failures and recoverability.

### A critical stability footnote: NUT-13-related wallet attack surface

A January 2026 disclosure describes a vulnerability class rooted in NUT-13 deterministic secrets/counter tracking and keyset-ID-collision tricks, outlining an attack where a malicious mint can “poison” a victim and later cause loss at a target mint (the user later sees “proof already spent” and wonders where money went). citeturn15view0  
This is not “a Nutshell bug” or “a CDK bug” per se; it’s an ecosystem safety issue that affects wallets and keyset handling. For your pilot, it means you should design user education and wallet defaults to avoid auto-trusting unknown mints and to encourage holding small balances. citeturn15view0turn21view2  

## Performance and scalability expectations

### What matters for your pilot workload

At ~300 MAU, the main performance constraints are typically:
- Lightning payment settlement behavior (routing, retries, fee reserve) rather than blind-signature math.
- Database contention (especially if operators use SQLite under concurrent writes).
- “Abuse load” (bots hammering endpoints), which is solved by auth/rate limiting more than raw CPU.

### Nutshell performance levers and constraints

Nutshell advertises support for PostgreSQL and SQLite, plus optional Redis caching (NUT-19) and optional authentication (NUT-21) as part of “advanced features.” citeturn19search8turn3search0  
Its `.env` example shows:
- Explicit Postgres connection string support alongside SQLite.
- Redis cache toggles for NUT-19.
- Built-in rate limiting knobs (global and transaction limits per minute per IP).
- Hard caps for mint balance and per-quote mint/melt maxima. citeturn12view0  

It also shows multiple Lightning backends, including LND via gRPC or REST, with TLS cert and macaroon paths. citeturn12view0turn9search2  

Open issues indicate real operator pain points that can show up under load: tuning SQLite for concurrent writes and managing Postgres connection pool behavior. citeturn16view0  

### CDK mintd performance levers and constraints

cdk-mintd documentation shows multiple storage engines (SQLite default, PostgreSQL, and ReDB), and describes Docker deployment options as well as config-file and env-var configuration. citeturn14search10turn13view0  

For Lightning backends, cdk-mintd supports LND configuration via both config file and environment variables (LND gRPC address + TLS cert + macaroon), with fee percent and minimum reserve fee settings. citeturn13view0turn14search10  

For your pilot scale, both stacks should be able to meet latency/concurrency needs if you:
- Use Postgres (not SQLite) for the mint ledger once you have real traffic.
- Rate limit and/or require auth to prevent endpoint abuse.
- Treat LND liquidity management as a first-class operational concern.

## Observability and operational ergonomics

### Monitoring and metrics

CDK is materially stronger out-of-the-box on observability:

- entity["organization","OpenSats","bitcoin grants org"] explicitly describes CDK as supporting Postgres for storage, Prometheus for metrics, and providing Docker images (including ARM64), as part of a grant focused on “operability across cloud environments.” citeturn17search2turn4search23  
- cdk-mintd documentation provides operator-friendly logging configuration (stdout/file/both, different levels, rotating daily log files) and a standardized configuration surface. citeturn14search10  
- cdk-mintd package descriptions indicate Prometheus and Grafana dashboards are included. citeturn14search3turn14search0  

Nutshell, by contrast, emphasizes protocol features (Redis caching, authentication, keyset rotation, Tor) but does not advertise Prometheus metrics exposure in the same “operator stack” way. citeturn19search8turn3search0  
In practice, you can still run Nutshell with good observability via container metrics + structured logs, but you will likely be building more of that integration yourself.

### Docker setup and configuration ergonomics

Nutshell is straightforward to run in Docker and config is largely env-var driven. The repo includes a Docker run example and identifies the required variables to run the mint. citeturn9search2  
The `.env` example is long but very explicit about all operational toggles (DB, Redis cache, rate limits, auth, max balances). citeturn12view0  

cdk-mintd offers a cleaner “operator UX” by standardizing config-file and env-var approaches, giving a default local mode and clear paths to Postgres, and centralizing logging/working directory configuration. citeturn14search10turn13view0  

### Backup/restore and upgrade safety

Both projects repeatedly warn that upgrades can include database migrations and require backups to avoid data loss. citeturn22search9turn22search1  
Nutshell documents a migration tool to move a SQLite mint DB to Postgres, which is useful if you start small but want a safer DB later. citeturn22search2  

### Key rotation operational risk

Nutshell’s `.env` example shows a deterministic derivation path mechanism and explicitly explains incrementing the derivation path to rotate to a new keyset. citeturn12view0  
But there is also an open issue indicating management-RPC keyset rotation can produce malformed keyset timestamps, which is a real operational hazard if you are rotating keys during a live pilot. citeturn16view0  

CDK’s release notes indicate “Keyset V2 is now the default for new keysets,” which is a positive sign given ongoing ecosystem discussions about hardening keyset identifiers. citeturn1search19turn15view0  

## Ecosystem adoption and maintenance signals

### Maintenance and funding signals

- Cashu ecosystem docs list Nutshell as the reference mint implementation and identify “mintd” as the Rust mint implementation. citeturn19search19turn4search13  
- OpenSats’ February 2026 grants explicitly include ongoing support for Nutshell (renewal) and a dedicated operability-focused grant for CDK, naming a maintainer focus (Asmo) around cloud operability, metrics, and operator tooling. citeturn17search2turn5search10  

Interpretation: both projects are “alive,” but CDK is being directly positioned for “operator-grade” deployments, while Nutshell remains the reference implementation and a widely used baseline.

### What other products appear to use in practice

Most Cashu “products” you listed (Minibits, eNuts, Boardwalk Cash, Cashu.me) are primarily wallets or wallet-like services; they typically connect to one or more mints rather than embedding a specific mint implementation in their own app distribution. citeturn19search11turn21view2  

What can be said with evidence:

- Public mint inventories/“auditor” listings report Minibits’ mint (`https://mint.minibits.cash/Bitcoin`) as running Nutshell (v0.18.x in the listing snippet). citeturn5search1turn19search20  
- The NUTs support matrix lists Boardwalk as a wallet supporting “Payment requests” (NUT-18), which is consistent with it being a wallet/service rather than a mint implementation choice. citeturn19search11  
- Cashu.me is listed as a wallet in the NUTs support matrix and is also referenced in ecosystem documentation as supporting payment requests via its UI. citeturn19search11turn21view2  

For eNuts specifically, available sources in this research set did not yield a trustworthy, stable statement of which mint software powers any “default eNuts mint.” What is clear is that eNuts (as a wallet) has focused on multi-mint behaviors such as auto mint swapping in historical release commentary. citeturn20search7turn21view2  

### Multi-mint and the Coco path

Cashu’s own FAQ describes cross-mint transfers as a wallet workflow: you can “swap… over Lightning for tokens from another mint” using multi-mint swap functionality. citeturn21view2  
Coco is documented as a TypeScript library for building Cashu wallets across browser/Node/React Native, so it is best understood as enabling the wallet/application layer of that multi-mint path, not as a feature that depends on a specific mint implementation. citeturn9search27  

Given both Nutshell and cdk-mintd implement the core mint NUTs and many optional mint-side NUTs, neither appears to be a blocking factor for “multi-community commerce.” citeturn19search11turn21view2  

## Recommendations for pilot and production scale

### Recommendation for the circular economy pilot

Run Nutshell in production for the pilot, but treat it as “production with training wheels.”

Rationale:
- It is explicitly positioned as the reference mint implementation, and it has visible real-mint usage footprints (e.g., Minibits’ mint is reported as Nutshell). citeturn19search19turn5search1  
- You already run it locally, reducing integration and operational unknowns versus a last-minute switch. citeturn19search8  
- The CDK project itself still labels the stack as early/alfa and tells operators to only use amounts they can afford to lose. That warning is hard to square with “production pilot with real money,” even if amounts are small. citeturn9search1turn13view0  

Pilot hardening checklist (all supported by existing Nutshell configuration surface):
- Use PostgreSQL (not SQLite) from day one of the pilot; the `.env` example explicitly supports Postgres. citeturn12view0turn19search8  
- Enforce tight caps: set maximum mint balance, and max peg-in/peg-out per quote (Nutshell exposes these). This directly aligns with your “<$50/user” risk budget. citeturn12view0turn21view2  
- Enable rate limiting and ensure your reverse proxy preserves client IPs; Nutshell’s config warns that rate limits require seeing real request IPs in logs (not just 127.0.0.1). citeturn12view0  
- Keep Nutshell updated above known-vulnerable versions; the NVD entry for CVE-2025-65548 is specific to versions “before 0.18.0.” citeturn18search2  
- Establish an “upgrade discipline”: every release may include DB migrations; always back up before upgrading and test upgrades in a staging clone first. citeturn22search9turn3search1  
- If you intend to rotate keysets during the pilot, test the management-RPC rotation path in staging because there is an open issue about malformed keyset timestamps. citeturn16view0  

On monitoring during the pilot: because Prometheus metrics are not “first-class” in Nutshell the same way they are in CDK, instrument via (a) container health/latency dashboards, (b) structured logs, and (c) Lightning node monitoring, and treat error spikes or quote backlog as “stop the line” events. citeturn21view2turn12view0  

### Recommendation for production scale

Plan to converge on cdk-mintd for “real production” once it meets your internal bar for maturity, because it has the stronger operator story.

Rationale:
- OpenSats explicitly frames CDK as operational infrastructure: Postgres storage, Prometheus metrics, Docker images, and work focused on cloud environments and operator tooling. citeturn17search2turn4search23  
- cdk-mintd provides an opinionated operational surface (config/env, structured logging, multiple DB engines, clearer LND configuration), and comes with an “observability stack” story (Prometheus/Grafana). citeturn14search10turn14search3turn14search0  
- CDK appears to be ahead on some forward-looking protocol surface like BOLT12 (NUT-25), where the NUTs matrix lists wallet support for CDK/cashu-ts and mint support for cdk-mintd (and does not list Nutshell). citeturn19search11  

The gating factor is that CDK itself still carries explicit “ALPHA / use with caution” language. For “production scale,” you should either wait until that stance changes or require a long-enough period of stable operation at smaller scale before expanding limits. citeturn9search1turn13view0turn21view2  

### Migration path if you start with Nutshell and want to switch to CDK later

There is no official “drop-in, same-DB, same-keys” migration path surfaced in the sources reviewed here. Given how Cashu tokens depend on mint keys and keyset history, the safest practical migration is an operator-led, two-mint transition rather than a risky in-place swap.

A low-risk operational migration pattern:

- Stand up a new cdk-mintd instance at a new mint URL with fresh keysets and full observability. citeturn14search10turn14search3  
- Freeze the old Nutshell mint’s “new issuance” by disabling minting while keeping redemption paths alive (Nutshell config includes toggles to disable BOLT11 minting/melting). citeturn12view0  
- Move users by instructing wallets to “swap to the new mint” over Lightning (Cashu explicitly describes multi-mint swap as the way to move between mints). citeturn21view2  
- After a defined grace period, wind down the old mint once outstanding balances drop below your acceptable residual risk.

This approach matches the reality that “each mint has their own tokens” and cross-mint movement is fundamentally a Lightning-mediated swap. citeturn21view2  

### Can both run behind Aperture for L402 proxying?

Aperture is described by entity["company","Lightning Labs","lightning dev company"] as an HTTP 402 reverse proxy that supports proxying requests for gRPC and REST backends using the L402 protocol standard. citeturn0search3turn0search22  
Because both Nutshell and cdk-mintd expose HTTP APIs (and Nutshell also has a management gRPC feature per release notes), they should both be viable “REST backends” behind an L402 reverse proxy in principle. citeturn22search9turn14search10  

Two practical caveats to plan for:

- If you rely on IP-based rate limiting in Nutshell, you must ensure Aperture (as the reverse proxy) forwards real client IP information so the mint doesn’t see everything as 127.0.0.1; Nutshell’s config explicitly warns about this. citeturn12view0turn0search3  
- If you intend to gate WebSocket endpoints (NUT-17) behind an L402 proxy, verify proxy support for WebSockets in your chosen deployment path; NUT-17 is part of the broader ecosystem, but Aperture’s top-level description emphasizes REST and gRPC rather than WebSockets. citeturn19search11turn0search3  

Finally, note the strategic overlap: NUT-24 defines a Cashu-native HTTP 402 payment mechanism (`X-Cashu` header) but is not implemented yet per the NUTs matrix. That suggests that, near-term, L402 proxying and Cashu-native 402 are complementary ideas, not competing implementation choices you must decide on today. citeturn23view0turn19search11