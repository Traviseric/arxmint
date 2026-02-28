# Pilot VPS & Deployment Architecture for ArxMint

## Executive summary and recommendation

ArxMint’s pilot constraint (“everything on one machine”) is workable for a short-lived community pilot, but it creates a single, shared failure domain for **Lightning**, the **Cashu mint**, and **Fedimint guardians**, and it undermines the federation’s trust model if all guardians are operated on the same host and by the same operator. citeturn23search9turn23search17turn1search43

Within the $20–$80/month pilot budget, the least-risk “typical compliance + US regions + enough RAM” path is:

**Recommendation (pilot, single-host, US region):**
- **Provider/Plan:** **Vultr** “Regular 16GB 6 cores” class VPS (shared CPU) with SSD storage (commonly advertised as 6 vCPU / 16 GB RAM / 320 GB disk / ~5 TB transfer) at **~$80/month**. citeturn12search19turn12search14turn12search22  
- **Why this hits the constraints:** 16 GB RAM is the first “comfortable” tier for running LND + three guardians + a DB + Prometheus/Grafana + a Next.js app in one box without constant swapping; and the plan price lands on the top edge of your budget. citeturn19search1turn19search2turn19search32turn23search12  
- **Caveat on backups:** Provider “automatic backups” add ~20% at Vultr, pushing the instance beyond $80/month. citeturn12search1turn12search8 For the pilot budget, rely on **app-level backups** (especially LND static channel backup + encrypted offsite backups for DB/state), and treat provider snapshots/backups as optional. citeturn23search12turn23search20turn23search8

**Strong second choice (if you can exceed budget slightly, for simplicity/managed UX):**
- **DigitalOcean** Basic Droplet **8 GB / 4 vCPU** is **$48/month** and is very easy to operate, but 8 GB is likely tight for your “everything on one machine” stack once you add Postgres + monitoring + 3 guardians, and scaling to 16 GB meaningfully exceeds $80/month on DO’s published pricing. citeturn9view2turn8view0

**Important red flag on Hetzner (policy risk):**
- Hetzner’s **Cloud and vServer Service Agreement** explicitly prohibits **crypto mining** (not explicitly “node hosting”). citeturn31search0  
- However, multiple public threads report Hetzner support stating they also prohibit **operation of nodes** and even **storage of blockchain data**, and there has been news coverage around “banning nodes.” citeturn29search4turn29search2turn29search8turn28search0  
Given your use case (Bitcoin + LND + ecash), this is a **non-trivial account-termination risk**. If you still want Hetzner for cost/performance, the pragmatic move is to get an explicit, written confirmation from their support for your exact workload before putting real funds at risk. citeturn29search4turn31search0

## Workload characteristics and sizing

The stack’s sizing is dominated by (a) **persistent state that must not be lost**, and (b) **memory pressure** from running many services concurrently.

**State that must not be lost (pilot-ending if corrupted):**
- **LND channel state** and its backup artifacts: LND’s documentation stresses that the **static channel backup** file is the single most important file to back up whenever it changes, and is stored under the network-specific directory (e.g., `.lnd/data/chain/bitcoin/mainnet/channel.backup`). citeturn23search12turn23search8turn23search0  
- LND disaster recovery notes the `channel.backup` file contains information about peers, how to reach them, and channels. citeturn23search20  
- For migrating between testnet and mainnet, LND uses **network-specific directories** explicitly so different networks can be isolated. citeturn23search0turn23search19  
- **Cashu Nutshell mint DB state**: release notes have warned about DB migrations and explicitly recommend backing up your DB before upgrades. citeturn23search22  

**Bandwidth profile (why “even neutrino needs bandwidth” is true):**
- If you use **Neutrino** (BIP157/158 style light client), you still download block headers and compact filters; Lightning Labs’ Neutrino writeup cites ongoing compact-filter bandwidth on the order of **~70 MB/month** plus filter header overhead (on the order of **tens of MB**). Actual usage rises with wallet activity (fetching full blocks relevant to you). citeturn2search0turn2search1  

**Memory profile (why 16 GB is the practical floor for “everything on one host”):**
- Grafana’s own installation docs list minimal resources (512 MB, 1 core), which is small by itself. citeturn19search1  
- Prometheus memory use scales with time-series cardinality and ingest; sizing guidance emphasizes that it’s hard to predict precisely and recommends headroom over heap, while independent Prometheus sizing analysis suggests **millions of series can consume multiple GB of RAM**. citeturn19search4turn19search32  
- PostgreSQL tuning guidance in the official docs assumes meaningful RAM availability (e.g., `shared_buffers` commonly ~25% of RAM as a starting point on a dedicated DB host), and Postgres will compete for memory with everything else on a single VM. citeturn19search2  
- LND’s safety and operations docs emphasize risk reduction via correct security posture and backups; practically, you want to avoid swap-heavy operation on a node that is also holding real funds and signing state. citeturn23search12turn22search11  

**Sizing recommendation for a single-machine pilot (testnet → mainnet):**
- **CPU:** 4–6 shared vCPU is usually enough for a pilot with modest traffic; 6 vCPU gives headroom for DB + monitoring + multiple Rust/Python services. (This is a practical recommendation; the exact need depends on wallet activity, Prometheus scrape volume, and federation throughput.) citeturn19search32turn19search2  
- **RAM:** **16 GB** recommended; 8 GB is a “boots, but fragile” tier when you add Postgres + Prometheus + 3 guardians + LND + web app. citeturn19search2turn19search32turn23search12  
- **Disk:** Prefer **local SSD/NVMe**; keep at least **200–320 GB** to avoid tight margins for logs, databases, Docker images, and future growth. Hetzner and others emphasize NVMe-backed performance; you want that class of storage for stateful services. citeturn14view0turn8view0turn12search19  
- **Transfer:** target ≥ **3–5 TB/month** to comfortably cover pilot activity and any “surprise bandwidth” (initial sync behaviors, OS updates, dashboards, testnet experimentation). citeturn2search0turn12search19turn9view2  

## Provider comparison with concrete specs and pilot fit

The table below focuses on plans that are “within striking distance” of your budget while meeting the single-host constraint.

| Provider | Example plan (closest fit) | vCPU / RAM / Disk | Included transfer | Base price (published) | Backup/snapshot support (published) | Pilot fit notes |
|---|---|---:|---:|---:|---|---|
| Hetzner | CPX42 (US-capable line) | 8 vCPU / 16 GB / 320 GB | shown on pricing table; Hetzner also states included traffic differs by location (EU vs US vs SG) | Pricing table shows ranges up to ~48.59 (multiple columns by location/IPv4) | Snapshots priced per GB-month; backups are 20% of instance price | Best price/perf *if allowed*, plus US locations (Ashburn, VA; Hillsboro, OR). But **policy enforcement risk for crypto/node workloads** is widely reported. citeturn24view0turn14view0turn31search0turn29search4turn29search8turn28search0 |
| DigitalOcean | Basic Droplet 8GB/4vCPU | 4 vCPU / 8 GB / 160 GB SSD | 5,000 GiB | $48/mo | Snapshots $0.06/GB-month; backups priced as 20% (weekly) or 30% (daily) of droplet cost (or usage-based backup plans) | Easiest operational UX. Main downside: 8 GB may be tight for your full stack; moving to 16 GB+ significantly exceeds $80/mo on DO’s published tiers. citeturn9view2turn8view0turn8view0turn9view2 |
| Vultr | “Regular 16GB 6 cores” (shared CPU) | 6 vCPU / 16 GB / 320 GB SSD | 5,000 GB | $80/mo | Automatic backups +20% (≈$96/mo); (site access to Vultr pricing pages was unreliable during research, so plan specs are corroborated via multiple sources including VPSBenchmarks + Vultr docs) | Best “budget ceiling” match for 16 GB in US regions; hourly billing supports experimentation. citeturn12search19turn12search1turn12search22turn12search14 |
| Linode/Akamai | Linode 16 GB | 6 CPU / 16 GB / 320 GB | 8 TB | $96/mo | Backups add-on is listed separately; backup pricing for “Linode 16 GB” appears as $20/mo (aligning with ~20% of the $96 plan) | Solid, but the 16 GB compute tier is above your $80/mo pilot budget before backups. citeturn26view1turn27view2turn25view0 |
| Home server / mini-PC | NUC-like mini PC + residential ISP | depends on hardware | depends on ISP | no monthly compute fee, but upfront hardware + power | you own backups; no provider snapshots | Maximum control, but **residential ISP risks** (dynamic IP, no SLA, power outages). Onion services help with dynamic IP issues. citeturn20search9turn20search17turn20search11turn20search20turn20search6 |

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["mini pc home server intel nuc setup","data center server rack vps hosting","grafana dashboard screenshot","bitcoin lightning node server rack"],"num_per_query":1}

**Disk I/O and “state safety” across providers (what to actually care about):**
- For **LND**, “I/O speed” is less about raw throughput and more about **avoiding corruption and avoiding sudden disk-full events** while maintaining reliable persistence for channel state and wallet artifacts. LND documentation emphasizes backups (especially `channel.backup`) as essential mitigation when anything goes wrong. citeturn23search12turn23search20  
- For **Fedimint**, the reference docs explicitly describe ports for public/direct connectivity and imply typical deployments operate over public networks with guardians; in a single-host pilot, your main I/O concern is still persistence and clean shutdown behavior rather than high throughput. citeturn22search2turn23search9  

**IP stability (Lightning realities):**
- LND’s security guidance says **opening port 9735 is not required but recommended** to accept incoming connections/inbound channels; it also says REST and RPC ports (default 8080 and 10009) should only be exposed when required by an external app. citeturn22search11turn22search1  
- If you cannot guarantee a stable public IP (home ISP), Tor onion services are commonly treated as **more stable than dynamic IPs** for reachability. citeturn20search11turn20search9  

**Snapshot/backup support (disaster recovery posture):**
- DigitalOcean publishes snapshot and backup pricing directly on the droplet pricing page. citeturn8view0turn8view0  
- Hetzner publishes snapshot per-GB-month pricing and “backups are 20% of instance price.” citeturn14view0turn14view0  
- Vultr documents that automatic backups add a 20% surcharge. citeturn12search1turn12search8  
- Linode/Akamai publishes separate backup pricing tables, including a line item for “Linode 16 GB” backups pricing. citeturn27view2turn25view0  

**What happens if the VPS provider goes down mid-transaction?**
- **Lightning payments**: In-flight payments will fail/timeout if your node is unreachable. The higher-risk scenario is extended downtime during force-close or dispute windows; LND documentation emphasizes conservative operations and maintaining backups (especially the static channel backup) so you can recover and force-close if needed. citeturn23search12turn23search20  
- **Fedimint**: Fedimints are operated by multiple guardian nodes; availability hinges on sufficient guardian participation. If all guardians are on one host, a single outage halts federation operations entirely. citeturn23search9turn1search43  
- **Cashu mint**: If the mint is down, users cannot mint/redeem via that endpoint until it returns; the practical mitigation is monitoring + backups + a tested restore procedure. citeturn23search22turn19search32  

## Deployment architecture choices that matter

**Fedimint guardians on the same machine**
- Fedimint’s high-level docs describe federations as multiple nodes operated by “guardians,” connected via public networks. citeturn23search9turn22search21  
- Fedi’s docs explicitly provide a “Solo Federation / All-in-One” deployment option and describe it as the simplest way to experiment and learn—i.e., it’s recognized as a valid *learning* configuration. citeturn23search17  
- But Fedi also warns that a solo guardian setup does not distribute trust and recommends (for real federations) multiple guardians, with guidance that “real” federation properties require more independent operators. citeturn1search43  

**Practical pilot stance:** Running all three guardians on one machine is acceptable **only if you treat the federation as an “engineering pilot” rather than a trust-distributed custody product**. The key operational requirement is to **message the trust model clearly** (it is effectively custodial / single-operator), cap values, and plan a path to move guardians onto independent machines/operators before broad mainnet use. citeturn1search43turn23search17  

**Tor vs clearnet for the LND node**
- LND’s Tor documentation frames Lightning-over-Tor as valuable for reducing location exposure and avoiding reliance on an advertised clearnet IP. citeturn20search27  
- LND security guidance also notes port 9735 is not strictly required (you can still operate), but opening it is recommended for inbound connectivity; Tor can reduce the need to expose/maintain stable clearnet addressing, especially for home or NAT’d deployments. citeturn22search11turn20search11  

**Pilot recommendation:**  
- If you’re on a VPS with a stable IPv4: use **hybrid** (clearnet + Tor) or **clearnet** initially for simplicity; keep strict firewalling and never expose admin APIs publicly. citeturn22search11turn22search1  
- If you’re on a home server or any environment with IP uncertainty: prefer **Tor** for node reachability and to avoid “IP churn” operational pain. citeturn20search11turn20search17  

**SSL/domain setup: Caddy vs nginx vs Traefik**
- **Caddy**: its docs state Automatic HTTPS is enabled by default and uses ACME-compatible CAs including Let’s Encrypt and ZeroSSL. (Mentioned here as entity["organization","Let's Encrypt","acme certificate authority"] and entity["company","ZeroSSL","acme certificate authority"] for clarity.) citeturn21search0  
- **Traefik**: its docs show Docker label–based dynamic routing and automatic certificate acquisition via Let’s Encrypt integration. citeturn21search8turn21search5  
- **NGINX**: official docs cover reverse proxying and TLS termination, but certificate issuance/renewal is usually something you bolt on (Certbot, acme.sh, etc.). citeturn21search2turn21search9  

**Pilot recommendation:** choose **Caddy** unless you expect heavy service churn or want Traefik’s Docker-native routing discovery. Caddy is the shortest path to “domain + HTTPS + reverse proxy” with fewer moving parts, which matters for a pilot where debugging time is precious. citeturn21search0turn21search9  

**Where Aperture fits**
- Lightning Labs’ L402 docs describe the **Aperture proxy** as a reverse proxy that forwards requests with valid L402 while issuing macaroons and Lightning invoices (i.e., it’s an auth/payment gateway). (Referenced here as entity["organization","Lightning Labs","bitcoin lightning company"].) citeturn19search3turn19search7  
Operationally, you typically put **TLS termination + routing** at the edge (Caddy/Traefik/nginx), and then decide which routes are gated by Aperture versus served directly (e.g., public Next.js pages vs L402-gated API paths). citeturn19search3turn21search0  

## Network exposure and firewall posture

A safe pilot firewall posture is: **only open what must be public**, and keep admin/metrics endpoints private unless you have a compelling reason.

**Ports that commonly must be public**
- **80/tcp and 443/tcp**: HTTP/HTTPS for the web app and any public APIs, plus ACME challenges for TLS automation (depending on DNS challenge usage). citeturn21search0turn21search9  
- **9735/tcp** (optional but recommended): Lightning p2p listen port. LND guidance says it is not required, but recommended if you want inbound connectivity (incoming peers/inbound channels). citeturn22search11turn22search3  
- **Fedimint ports (only if you truly run a “real” multi-host federation now):** reference docs say p2p consensus bind is typically `0.0.0.0:8173` and API bind is typically `0.0.0.0:8174`, and “the port should be open in the firewall.” citeturn22search2  

**Ports that should not be public in a pilot**
- **LND gRPC (10009) and REST (8080)**: the Lightning Labs API reference assumes local access; the security guide says only expose these when required by an external application. The default safe stance is: **bind to localhost or a private Docker network** and access via SSH tunnel/VPN. citeturn22search1turn22search11  
- **PostgreSQL (5432)**: keep private; expose only inside Docker network. (If you later use a managed DB, it should still be restricted to the VPS IP and strong credentials.) citeturn19search2  
- **Prometheus (9090) and Grafana (3000)**: keep private (SSH tunnel, VPN, or at minimum IP allow-list + auth). Grafana’s own docs highlight how lightweight it can be, but it becomes a sensitive control-plane once it has data sources and alerting credentials. citeturn19search1turn19search13  

**Single-host Fedimint pilot nuance**
If all three guardians are on one box, you can keep guardian-to-guardian traffic on a private Docker network (no public 8173 exposure), and only expose the client-facing edge you actually need. The public “open ports” guidance in the reference docs is written for the intended multi-host federation topology. citeturn22search2turn23search9  

## Hardening and disaster recovery checklist

This checklist is designed around the thing that can actually destroy a pilot: **loss of LND state / keys** or an **unrecoverable configuration** after an outage.

**Host and access hardening**
- SSH keys only; disable password auth; disable root SSH login; set up a non-root sudo user for ops. citeturn22search11turn21search12  
- Apply unattended security updates (or a scheduled patch window) and keep the base OS minimal to reduce attack surface. citeturn31search3turn22search11  
- Use a host firewall (UFW/nftables or provider firewall) with default-deny inbound; explicitly allow only 22, 80, 443, and optionally 9735. citeturn22search11turn21search12  

**LND-specific safety and backup posture (non-negotiable)**
- Back up the **static channel backup** (`channel.backup`) off-host, encrypted, on a recurring basis (or event-driven when it changes). LND documentation calls it the most important file to back up whenever it changes. citeturn23search12turn23search8  
- Document and protect your **seed phrase** and wallet unlock secrets; store offline copies. (This follows from LND recovery posture and the fact that the node is a hot wallet holding real funds.) citeturn23search1turn22search11  
- Treat LND REST/gRPC macaroons and TLS certs as secrets; do not expose admin macaroons to application containers unless strictly required. citeturn22search1turn22search11  
- Operationally separate **testnet and mainnet volumes/directories** so you don’t accidentally mix credentials/state; LND explicitly supports distinct network directories. citeturn23search0turn23search19  

**Fedimint pilot hardening**
- Back up guardian keys/state and configuration off-host, encrypted (this is essential if you later distribute guardians; it is also essential if the single host fails). citeturn23search9turn1search43  
- If guardians are co-located, treat the federation as **single-operator trust** and set strict limits on real value until guardians are split across independent operators/hardware. citeturn1search43turn23search17  

**Cashu Nutshell + Postgres**
- If Nutshell upgrades include DB migrations, back up the database first as recommended by release notes. citeturn23search22  
- For Postgres, keep DB on local SSD and back it up with WAL-friendly tooling or at minimum daily dumps + frequent snapshots of the underlying volume; Postgres performance and safety are tied to storage latency and correct configuration. citeturn19search2turn19search6  

**Monitoring and alerting**
- Keep Prometheus retention conservative for a pilot to reduce disk and memory pressure. Prometheus storage architecture writes time-series blocks to local disk and memory usage is hard to predict precisely, so practical retention limits matter. citeturn19search0turn19search4turn19search32  
- Alert on: disk usage (>70%), memory pressure/swap, container restarts, LND health, federation quorum health, and HTTPS certificate renewal failures. citeturn19search4turn21search0turn22search11  

**Disaster recovery drill (what to actually rehearse once)**
- Practice a “new VPS, restore from backups, resume services” drill on testnet/mutinynet before mainnet:  
  - restore Docker Compose + env + volumes (or DB dumps)  
  - verify LND wallet unlock, channel backup presence, peer connectivity via 9735/Tor  
  - verify Fedimint services start cleanly and clients can transact in your pilot environment citeturn23search12turn23search20turn23search17turn22search2  

**Final decision rule**
- If you want **lowest cost** and can accept/mitigate ToS ambiguity by getting written approval: Hetzner’s US regions + pricing are compelling. citeturn14view0turn24view0turn31search0turn29search4  
- If you want **lowest “policy surprise” risk** and a plan that fits **16 GB at ~$80**: Vultr is the cleanest match for this pilot’s constraints. citeturn12search19turn12search1turn12search22