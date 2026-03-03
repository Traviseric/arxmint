# DNS and Domain Friction for Self-Hosted Merchant Nodes

## Why domains, DNS, and TLS are the steepest cliff

Self-hosting a payment node becomes “real internet infrastructure” the moment a customer must reach it from outside the merchant’s LAN. At that point, three coupled problems show up:

A public hostname must resolve to the merchant’s server IP address (DNS), the server must be reachable on the Internet, and HTTPS must be both enabled and continuously renewed. citeturn4view0turn6view0turn15view0

Projects like BTCPay explicitly surface the dependency chain: their reverse-proxy-to-VPS pattern lists “a domain or subdomain” as a requirement, then instructs the operator to create an A record pointing the domain to the VPS IP as a prerequisite for obtaining certificates and serving traffic. citeturn4view0turn6view0

The TLS automation layer is often misunderstood as “solving SSL,” when in reality most automation depends on DNS already being correct and on inbound reachability. For example, the ACME HTTP-01 challenge is specified to dereference the challenge URL via TCP port 80, and Let’s Encrypt’s documentation reiterates that HTTP-01 can only be done on port 80. citeturn12search2turn15view0

Caddy’s “automatic HTTPS” reduces operator burden but doesn’t remove the prerequisites: when using the TLS-ALPN-01 challenge, the CA performs authoritative A/AAAA lookups and then connects over port 443 to validate. So DNS correctness and external reachability still remain the gating factors. citeturn12search1turn0search1

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["ACME HTTP-01 challenge diagram port 80","TLS-ALPN-01 challenge diagram port 443","dynamic DNS update architecture diagram","reverse tunnel agent architecture diagram"],"num_per_query":1}

## Managed default subdomains under the project’s DNS

### What this solves and what it does not

A default-subdomain approach like `storename.<project-domain>` shifts the highest-friction task (DNS zone access + record edits) from the merchant to you. In BTCPay’s own ecosystem, “Dynamic DNS” exists precisely because DNS ownership and IP changes are common pain points; it describes DDNS providers as offering a domain plus an API to automatically update DNS when a server’s external IP changes. citeturn7view0turn4view0

However, a default subdomain does **not** automatically solve: (a) inbound reachability, (b) certificate issuance at scale, or (c) “who the customer believes they are transacting with.” All three matter if your goal is mainstream merchant onboarding. citeturn15view0turn2search0turn6view0

### Dynamic IP handling patterns that actually work

If “merchant runs on a VPS,” many providers effectively give a stable public IP for long periods, so you can treat “dynamic IP” as an exception-path rather than the default. BTCPay’s DDNS guidance still matters because IP changes happen (VM rebuilds, provider migrations, home-hosting, etc.) and the update loop has to be resilient. citeturn7view0turn7view1

There are two practical implementation routes:

A *DynDNS-style HTTPS API* is the simplest product surface: the merchant node periodically discovers its current public IP, authenticates to your control plane, and updates only its own A/AAAA record(s). This is exactly the operational model described in BTCPay’s Dynamic DNS service description (periodic check + update on change). citeturn7view0

An *RFC 2136-style DNS UPDATE* backend is a standards-based option if you operate your own authoritative DNS and want to support secure dynamic updates at the DNS protocol layer (or via intermediaries). RFC 2136 defines DNS UPDATE as an Internet standards-track protocol for dynamically updating DNS data. citeturn1search0

From a non-technical-merchant UX standpoint, the DynDNS-style HTTPS API is usually the safer default, because it lets you enforce tight scoping (“this token may only update `storename.<project-domain>`”) and provide auditable logs without exposing DNS server internals. (This is an architectural recommendation, not a legal conclusion.)

### The hidden scaling constraint: CA rate limits on a shared base domain

If thousands of merchants each obtain their own cert for `storename.<project-domain>` from a DV CA like Let’s Encrypt, you can hit issuance ceilings that have nothing to do with your infrastructure.

Let’s Encrypt rate-limits issuance per registered domain: up to 50 certificates per registered domain per 7 days, counting across all ACME accounts. citeturn2search0turn2search28

This matters because a shared merchant subdomain scheme collapses all merchants onto one registered domain, so growth bursts (or retries during outages) can be throttled by CA policy. citeturn2search0turn12search22

Caddy can fall back from Let’s Encrypt to ZeroSSL if issuance fails, but that only helps if the failure is CA-specific and if the alternate CA’s policies permit issuance under your pattern; it doesn’t remove your need to design for CA limits as a first-class scaling dimension. citeturn2search1

## Tor-only mode as a DNS-free access layer

Tor onion services eliminate the DNS problem entirely: operators don’t need to purchase a domain, and onion addresses are automatically generated. citeturn3search6

They also give strong transport properties. Tor’s own documentation explains that traffic between Tor users and onion services is end-to-end encrypted, and a Tor Project post notes that v3 onion addresses are 56 characters because they encode an ed25519 public key (a key contributor to self-authentication). citeturn3search6turn1search2turn3search14

Where Tor typically fails a “mainstream merchant” bar is client compatibility and latency expectations. Even BTCPay’s Cloudflare tunnel documentation frames Tor access as requiring a Tor-enabled browser (and characterizes Tor latency as high). citeturn7view1

A realistic positioning is therefore: Tor-only is an excellent *privacy and setup-simplicity fallback*, but not a default for most customer checkout flows unless your target segment already lives in Tor-compatible clients. citeturn7view1turn3search6

## Tunnel-based exposure: Cloudflare Tunnel and ngrok-style designs

### What tunnels change in the setup equation

A tunnel swaps “inbound reachability + DNS + certificates on the merchant box” for “an outbound agent connection to an edge network that exposes a stable URL.” This is why BTCPay describes Cloudflare tunnel as a low-cost and easy alternative when port forwarding and dynamic IPs are problematic, while also explicitly noting the downside that the tunnel operator can see or modify traffic because it is a middleman. citeturn7view1

Cloudflare’s own documentation explains that its tunnel uses an outbound-only connection model initiated by `cloudflared` from the origin to Cloudflare’s global network, and that the daemon creates outbound connections over port 7844 using HTTP/2 or QUIC. citeturn0search2turn0search35

ngrok documents the same core model: an agent creates secure tunnels from ngrok’s network to local services, specifically to expose services behind NATs/firewalls without complex network configuration. citeturn1search3

### The trust boundary is the product

There is an unavoidable trust choice in a tunnel design:

If the tunnel edge terminates TLS (typical), the tunnel operator can technically inspect and modify plaintext at the edge, even if it re-encrypts to the origin. Cloudflare’s SSL/TLS docs explicitly frame two separate connections—visitor-to-Cloudflare and Cloudflare-to-origin—showing where termination and re-encryption can occur. citeturn3search7turn7view1

If you try to avoid edge plaintext by doing TLS passthrough, you push certificate management back to the merchant origin, and you reintroduce exactly the “ACME + DNS + inbound reachability” bundle you were trying to avoid. The tunnel is then mostly solving NAT traversal, not domain/cert friction. citeturn15view0turn12search1

BTCPay’s documentation is unusually direct about this trade: the tunnel wins on ease and latency, but the middleman property is the cost. citeturn7view1

So if you run the tunnel infrastructure yourself, the core question is not only “is it legal,” but “is this an acceptable trust model for merchants and customers,” and “how do we narrow the blast radius if compromised.” (Again: architectural framing rather than a legal opinion.)

## IP-only and LAN-first modes for physical point-of-sale

### LAN-only checkout can remove internet-facing setup for in-person retail

If the purchase experience can be completed in person, you can route around DNS and even internet exposure. BTCPay’s Dynamic DNS doc explicitly says DDNS is not needed if the server is only accessed on the local network (or if using Tor). citeturn7view0

That aligns with a “customer joins Wi‑Fi → scans QR → pays” modality, where the local experience is optimized for speed and simplicity while the merchant avoids public DNS, firewall, and inbound reachability configuration. citeturn7view0turn7view1

The major limitation is scope: LAN-first works well for cafés, market stalls, and physical retail, but not for online stores where the customer is remote by definition. (This is a direct implication of the access constraint, referenced above.) citeturn7view0turn4view0

### A new ingredient in 2026: publicly trusted HTTPS on raw IPs

Historically, “IP-only” web access typically implied no publicly trusted certificate, which triggers browser warnings and user distrust. In January 2026, Let’s Encrypt announced that short-lived and IP address certificates are generally available; these are valid for 160 hours (just over six days) and require selecting a “shortlived” certificate profile in the ACME client. citeturn16view0

Let’s Encrypt also documents that HTTP-01 can validate IP addresses, and that HTTP-01 and TLS-ALPN-01 can validate IP addresses but cannot be used for wildcard issuance. citeturn15view0

This changes the IP-only option from “usually insecure-looking” to “potentially acceptable,” but two constraints remain fundamental:

The cert is short-lived, so renewal must be fully automated and operationally robust. citeturn16view0

Validation still depends on inbound reachability (HTTP-01 via port 80, or TLS-ALPN-01 via port 443). citeturn15view0turn12search1turn12search2

Practically: IP certs are an interesting tool for constrained environments or transitional setups, but they don’t eliminate the need for a reachable public endpoint.

## UK regulatory perimeter considerations for providing DNS or tunnels

This section is not legal advice; it is a perimeter-oriented risk analysis using currently published UK sources.

### Providing DNS for merchant nodes is generally closer to “infrastructure” than “cryptoasset business”

The UK AML/CTF registration regime for “cryptoasset businesses” is scoped around two activity types: (a) cryptoasset exchange and (b) custody of cryptoassets/keys. The FCA’s own “who needs to register” page defines “custodian wallet provider” as safeguarding/administering cryptoassets or private cryptographic keys on behalf of customers, and describes “cryptoasset exchange provider” activities as exchanging or arranging exchanges between crypto and money or between cryptoassets. citeturn0search3turn2search10

Providing DNS records that point a hostname to a merchant’s own node does not look like exchange or custody on its face. More importantly, industry guidance written for the UK AML regime draws a line between “arranging exchange” and purely technical services: the August 2023 entity["organization","Joint Money Laundering Steering Group","uk aml guidance body"] guidance says the definition is not intended to capture a firm that merely provides a forum (like a bulletin board) where buyers and sellers post bids/offers and then trade elsewhere, and it notes that software developers and other providers connected to decentralized exchange/payment systems may fall outside scope—especially if they derive no income or benefit from the consequent transactions. citeturn14view2turn13view0

That guidance is not a binding legal ruling, but it’s relevant because it indicates how “mere technology services” are generally expected to be treated under the AML perimeter in practice. citeturn14view2

### Tunnels raise the “middleman” question, but “arranging” has a specific meaning in the AML regime

Your posed question—whether running a tunnel is “arranging” under UK FCA concepts—needs careful separation between:

“Arranging” in the AML definition of a cryptoasset exchange provider (arranging exchange between crypto and money or crypto and crypto). citeturn2search10turn14view2

“Arranging deals” concepts used in broader FSMA regulated-activities language (and, prospectively, in a future cryptoasset regime). citeturn14view1turn8view3

For the current AML perimeter, the “arranging” language is anchored to arranging *exchange*. A web/tunnel transport layer that does not execute exchange and does not custody keys is less naturally characterized as “arranging exchange,” particularly if it is analogous to a communications or hosting provider. citeturn2search10turn14view2

The fact that BTCPay warns “Cloudflare can see or modify all of your traffic, as it acts as a middleman” is operationally important, but that statement itself is about visibility/control of traffic—not about arranging exchange or custody. citeturn7view1turn3search7

### The future UK cryptoasset regime explicitly contemplates “arranging” cryptoasset deals

UK policy direction does point toward a broader authorization perimeter for cryptoasset activities under FSMA.

A 2023 HM Treasury consultation document includes “arranging (bringing about) deals in cryptoassets” and “making arrangements with a view to transactions in cryptoassets” in its proposed scope table of cryptoasset activities to be regulated. citeturn14view1turn8view3

The FCA has since published a timeline statement that “the new cryptoasset regime is expected to come into force on 25 October 2027,” and that firms undertaking new regulated cryptoasset activities will need to be authorized under FSMA when it commences. citeturn11search2

What this implies for a tunnel operator is not “you are regulated,” but “you should design with a future perimeter in mind,” especially if your tunnel becomes economically or operationally inseparable from executing cryptoasset transactions (for example, if it is your tunnel that presents offers, controls routing logic, or is marketed as the way customers pay). citeturn14view1turn11search2

### Separately: promotions enforcement creates brand and distribution risk

Even before the new authorization regime commences, the UK has enforced a cryptoasset promotions regime: entity["organization","Reuters","news agency"] reported FCA civil proceedings against a global exchange for unlawfully promoting cryptoasset services in the UK, tied to the financial promotions regime. citeturn11news40

This matters to your “default subdomain” and “tunnel URL” ideas because putting merchant checkout flows under a project-branded domain can blur “merchant promotion” vs “platform promotion” in the eyes of consumers and potentially counterparties. That is not automatically a regulatory trigger, but it is a distribution and reputational risk you should plan for, especially if you operate in or market to the UK. citeturn11news40turn11search6

## A pragmatic architecture strategy that minimizes friction without becoming a payments middleman

A defensible product strategy typically treats “DNS friction” as a segmentation problem: not every merchant needs the same access model, and a single default can force you into unwanted trust and compliance positions.

A workable pattern is to offer multiple “exposure modes” with clear defaults:

A managed subdomain mode for VPS-hosted merchants, where DNS is fully automated on your side and the merchant node runs its own HTTPS endpoint. This preserves the “not custody, not routing funds” property, but you must plan around ACME prerequisites (reachable ports, correct DNS) and CA issuance scalability (registered-domain limits). citeturn4view0turn2search0turn12search1turn15view0

A tunnel mode for home/hardware merchants, where the merchant runs an outbound agent and receives a stable URL, explicitly acknowledging and mitigating the “middleman” property. BTCPay’s own Cloudflare tunnel guidance is candid: the tunnel is the easiest path when NAT/dynamic IP/ISP blocks exist, but the tunnel operator can see/modify traffic. If you replicate this model, narrowing what traffic is tunneled (checkout endpoints only, separate admin paths) becomes a core security control. citeturn7view1turn0search35

A Tor mode as a DNS-free escape hatch for privacy and for environments where public exposure is infeasible, leaning on onion services’ built-in end-to-end encryption and avoidance of DNS, while accepting the UX constraints of Tor-enabled clients. citeturn3search6turn1search2turn7view1

A LAN/POS mode for in-person settings, explicitly supported by the observation that DDNS is not needed when only accessing locally (or via Tor), and optionally augmented by short-lived IP certificates where public-IP access and full automation make sense. citeturn7view0turn16view0turn15view0

The key strategic decision is which of these you make the default for “non-technical users.” Based on the evidence above, the lowest-friction default for mainstream non-technical merchants is usually either:

Managed subdomains **if** you can ensure (or bundle) stable public hosting and avoid CA bottlenecks at your growth targets, or citeturn2search0turn12search1turn4view0

Tunnel URLs **if** you accept being in the traffic path and are prepared to engineer (and communicate) that trust boundary clearly, as BTCPay does when describing Cloudflare tunnel’s middleman downside. citeturn7view1turn0search35