# Database & Persistence Strategy for ArxMint

## Executive summary

For the pilot scale you described (≈30 merchants, ≈300 MAU) and the fact you’re already running a multi-service stack on a VPS via Docker Compose, the most cost-effective and operationally simple path is:

- Use **self-hosted PostgreSQL in your existing Docker Compose** for *application data* (community configs, merchant listings, transaction history metadata, user/session tables).
- Treat **Cashu proofs as wallet secrets** and **do not store them server-side in the same database by default**. Prefer **client-side, encrypted local persistence** (IndexedDB/WebCrypto) plus an explicit backup/export flow. This aligns with Cashu’s own framing: ecash tokens are *bearer assets* where the wallet’s stored data “represents the actual money,” and if that storage is wiped, funds are lost. citeturn2search18turn2search10
- If you later decide you *must* sync proofs across devices or support account recovery, implement it as a **separate encrypted vault** where the server stores **only ciphertext** (a “zero-knowledge” style design), or accept that you’re operating a **custodial hot wallet** and design accordingly.

Among the managed options, **Supabase** is the strongest “production-ish managed Postgres” fit for your threat model because it supports **IP-based DB connection restrictions** and has an explicit story for **daily backups** and **PITR**, plus optional database-side encrypted storage tooling (Vault). citeturn18view0turn18view1turn12view1  
**Neon** is compelling on dev/staging ergonomics and variable-load pricing, but **IP allowlisting is Scale-plan-only**, which is a meaningful security gap for a bearer-instrument app if you ever place sensitive material server-side. citeturn19view2turn8view1turn19view0  
**Railway** is very easy operationally and has built-in volume backup scheduling, but it’s the least aligned with “run everything on my VPS in Compose” for the pilot, and its strongest security controls (private networking) are primarily *inside Railway*. citeturn16view0turn14search2

## Threat model and whether to store Cashu proofs

The key architectural decision is whether ArxMint is acting like a *wallet* (non-custodial) or like a *custodian* (server custody of spendable bearer data). Cashu wallets are explicitly described as holding bearer tokens where the stored data “represents the actual money itself.” If a wallet’s local storage is wiped, funds are lost—because the wallet no longer has the bearer data. citeturn2search18turn2search10 This maps cleanly onto your concern: **if your server database leaks and it contains spendable proofs, those proofs can be spent by whoever obtains them** (the same “bearer” property). citeturn2search18turn2search10

What other implementations do (evidence):

- The Cashu ecosystem documentation emphasizes the **bearer nature** and that wallet storage contains the money. citeturn2search18turn2search10
- A popular TypeScript wallet library explicitly says wallet classes are mostly stateless and **your app must manage state such as fetching and storing proofs in a database** (i.e., the library doesn’t prescribe where—your app chooses). citeturn3search6
- **Nutshell** (reference Python implementation) supports **PostgreSQL and SQLite** and highlights “deterministic wallet with seed phrase backup (NUT‑13).” citeturn4view1turn7view0
- **Minibits Wallet** (mobile) states that transaction history and ecash notes are stored in **SQLite** on-device. citeturn2search0
- **NIP‑60 (Nostr Cashu Wallets)** describes unspent proofs published as events where **proofs are encrypted** (with the user’s key), showing a pattern of storing proofs in a sync layer *only after encryption*. citeturn2search3

Backup and restore patterns for proofs in the protocol layer:

- **NUT‑13** specifies deterministic secret derivation so wallets can recover an ecash balance using a familiar **12‑word BIP39 mnemonic**, regenerating secrets and (with mint help) restoring proofs; it also describes batch restore strategies and that wallets store counters for keysets in their database. citeturn7view0

Practical implication for ArxMint:

- If ArxMint is a *consumer wallet experience inside a Next.js app*, the safest default is **client-side proofs** with an explicit **backup/export** (and, if you adopt deterministic secrets, mnemonic-based restore per NUT‑13). citeturn7view0turn2search18
- If ArxMint stores spendable proofs server-side, you should assume you are building and securing a **hot wallet** (with hot-wallet-style operational controls, monitoring, and loss expectations).

## Option-by-option hosting analysis with pricing, ops, and security

Below, “can run alongside Docker Compose stack” is interpreted as: *Does it fit naturally with your current local Compose workflow and a pilot deployed on a single VPS running multiple containers?*

**Supabase (free tier → pro)**  
Pricing: Supabase’s docs show a **Pro Plan line item of $25** and that paid plans include **$10 in Compute Credits**; Micro compute is shown as ≈$10/month and covered by credits in the one-project example (total $25). citeturn10view0 Their billing FAQ shows multi-project math and states additional projects start at about **$10/month** (billed hourly), giving an example of 3 micro projects totaling **$45/month**. citeturn10view2turn10view0 Free-tier database size caps of **500MB** have been referenced in Supabase changelog context (cap unchanged for Free Plan). citeturn9search2  
Fit with Docker Compose: You can keep Docker Compose for local dev and your VPS app stack, but Supabase DB is *not* a Compose service on your VPS; it’s a managed external dependency (you connect over the network). citeturn12view2  
Encryption-at-rest for proofs: Supabase states **AES‑256 encryption at rest** and TLS in transit. citeturn8view4 For higher sensitivity, Supabase Vault is a Postgres extension that stores secrets encrypted on disk and exposes decrypted values through a view; the docs claim encryption/authentication is preserved through backups/replication streams. citeturn12view1  
DB outage / money risk: If you keep proofs client-side, a DB outage mainly breaks logins, directory data, and server-backed features—not user funds. If you store proofs in Supabase, a leak or restore mistake can become a direct monetary incident because bearer data is the money. citeturn2search18turn2search10  
Backup/restore story: Supabase documents **daily backups** for Pro/Team/Enterprise and shows retention for Pro (7 days). citeturn18view1 It also supports **PITR** as an add-on with described pricing and operational behavior (restore makes project inaccessible during restore). citeturn18view1  
Migration path: It’s still PostgreSQL—migration to/from self-hosted or another managed provider can use standard Postgres tooling and approaches; Supabase also supports read replicas and other scale features in its platform feature set. citeturn12view2turn18view1  
Tradeoff summary: Best managed “starter production” option here if you want (a) managed backups/PITR and (b) IP restriction on direct Postgres connections from your VPS. citeturn18view0turn18view1

**Railway**  
Pricing: Railway’s docs describe a **subscription + usage** model, with Hobby at **$5/month** and Pro at **$20/month**, plus explicit resource rates (RAM $10/GB-month, CPU $20/vCPU-month, Volume storage $0.15/GB-month, egress $0.05/GB). citeturn8view3turn15view3  
Fit with Docker Compose: If you deploy your whole stack to Railway, it’s straightforward; if your pilot target is “everything on my VPS in Longmont,” Railway introduces an additional platform boundary (DB off-VPS). Railway’s private networking is about service-to-service communication within Railway over WireGuard tunnels and internal DNS, which doesn’t directly apply to a VPS-hosted stack. citeturn14search2turn14search5  
Encryption-at-rest for proofs: Railway staff discussions indicate storage-layer “encrypted at rest” in the sense of underlying disk encryption, with clarification that volumes aren’t additionally encrypted at the software level. citeturn20view0 As with all these options, if spendable proofs are stored in the DB, encryption-at-rest does not remove the “bearer theft” risk from DB credential compromise or SQL injection. citeturn2search18turn2search10  
DB outage / money risk: Same core logic: proofs client-side ⇒ outage is app downtime; proofs server-side ⇒ outage or corruption can strand or destroy bearer assets. citeturn2search18  
Backup/restore story: Railway’s volume backups can be scheduled (daily/weekly/monthly) and explicitly state retention defaults (daily kept 6 days; weekly 1 month; monthly 3 months). These backups cover “all content stored in volumes,” including Railway’s database offerings. citeturn16view0  
Migration path: PostgreSQL is portable, but in practice Railway is “platform-first.” If your long-term plan is VPS-first or multi-service Bitcoin infrastructure on your own hosts, you may end up migrating off Railway later. (This is an inference based on your stated deployment direction, not a Railway limitation.)

**Neon (serverless Postgres, branching)**  
Pricing: Neon’s pricing page specifies Free plan limits including **100 CU-hours per project monthly** and **0.5GB storage per project**; the Launch plan is usage-based with rates like **$0.106 per CU-hour** and **$0.35 per GB-month**, and includes **7-day time travel/restores**; the Scale plan includes **30-day time travel/restores** and lists “Private network, IP rules.” citeturn8view1 Neon’s restore-window documentation details defaults and maximums (Free: 6 hours; Launch: up to 7 days; Scale: up to 30 days) and shows instant restore storage billing for paid plans. citeturn17view3  
Fit with Docker Compose: Like Supabase, Neon is external to your Compose stack; you connect from your VPS / containers over TLS. The developer experience advantage is branching and fast restore/testing, rather than “runs in my Compose file.” citeturn17view1turn17view3  
Encryption-at-rest for proofs: Neon’s security docs describe required **SSL/TLS** connections and **AES‑256 data-at-rest encryption**, plus a proxy that authenticates connections before they reach Postgres. citeturn19view0 The important caveat: Neon’s **IP Allow** (allowlisting) is documented as **Scale-plan-only**, so on Free/Launch your database is reachable from the internet for anyone with credentials. citeturn19view2turn19view0  
DB outage / money risk: Same bearer logic as above. Additionally, if you used Neon’s scale-to-zero style patterns and your app expects “always warm” behavior, you may see cold-start latency. (This is an operational characteristic, not fundamentally unsafe; the money-risk still depends on where proofs live.) citeturn8view1turn2search18  
Backup/restore story: Neon documents **instant restore (PITR)** with a configurable restore window and also supports `pg_dump` / `pg_restore`; it also supports snapshots and scheduled snapshots on paid plans. citeturn17view1turn17view3turn17view0  
Migration path: Strong for “pilot → real prod” if you later deploy your application on major clouds and can use private networking features; Neon’s private networking is via AWS PrivateLink (an AWS deployment assumption). citeturn14search4turn19view0  
Tradeoff summary: Excellent for dev/staging and fast iteration; **weaker security posture for a bearer-instrument workload unless you (a) never store proofs server-side or (b) pay for the plan that enables IP Allow / private networking**. citeturn19view2turn2search18

**Self-hosted PostgreSQL in Docker Compose**  
Pricing: If you already have the VPS, the incremental monthly bill is usually “$0 + disk + your time,” but you must budget engineering time for patching, restarts, and incident response (this is the real cost driver).  
Fit with Docker Compose: This is the only PostgreSQL option in your list that naturally becomes “just another container” alongside your existing services—same local workflow and same VPS deployment model.  
Encryption-at-rest for proofs: Open-source PostgreSQL does not provide built-in transparent full-database encryption in the core distribution; the official docs discuss encryption for specific columns via `pgcrypto`, where the client supplies keys and data is decrypted on the server before being sent to the client. citeturn11search0turn11search2turn11search23 In practice, “encryption at rest” for self-hosted Postgres typically means OS/filesystem/disk encryption plus (optionally) application/column encryption for the most sensitive fields. citeturn11search5turn11search0  
DB outage / money risk: If you do **not** store proofs server-side, a DB outage is service downtime and loss of new writes (merchant check-ins, sessions, tx logs), but it should not destroy user funds. If you do store proofs, an outage or data loss is inherently a monetary risk unless users can fully restore proofs from a separate backup mechanism (e.g., mnemonic-based restore designs). citeturn2search18turn7view0  
Backup/restore story: PostgreSQL’s own docs describe multiple backup approaches (SQL dump, file-system-level, and “online backup” approaches). citeturn1search8 You would be responsible for implementing and regularly testing restore procedures.  
Migration path: Strongest portability. You can migrate to managed Postgres later using standard Postgres tooling (dump/restore, replication, etc.), because you control versions, extensions, and schema changes.

**SQLite**  
Pricing: Effectively free (no separate service).  
Fit with Docker Compose: Ideal for local dev, and it can run on a VPS without adding a service. However, in a multi-container architecture it becomes tricky if multiple processes/replicas need concurrent access to the same DB file.  
Encryption-at-rest for proofs: SQLite does **not** support encrypting database files by default; you need a modified build such as SQLCipher or similar. citeturn11search1 That makes “store bearer proofs in SQLite safely” non-trivial unless you add an encryption layer and key management. citeturn11search1turn2search18  
Concurrency tradeoffs: SQLite supports many readers, but it’s explicit about allowing **only one writer at a time**, including in WAL mode (WAL improves read/write overlap but still has a single writer). citeturn13search2turn13search1turn13search0 SQLite’s own guidance on when to use it acknowledges this write-concurrency ceiling and notes client/server DBs typically handle far more concurrency. citeturn13search2  
DB outage / money risk: If the SQLite file is corrupted, deleted, or stolen and it contains proofs, that is a direct bearer-loss incident. citeturn2search18turn11search1  
Migration path: You will likely outgrow SQLite operationally sooner than you outgrow the “pilot scale,” because the constraint is not MAU—it’s write patterns, locking behavior, and deployment topology. citeturn13search2turn13search1

## Outage behavior and money safety

Whether “users lose money when the DB goes down” is not primarily a hosting-provider question—it’s a custody question.

If you store spendable proofs server-side:

- A DB outage can prevent spending (immediate availability problem).
- A DB compromise can become a direct theft event because bearer tokens/proofs are the money. citeturn2search18turn2search10
- A restore-from-backup can roll back “spent/unspent” state and create complex reconciliation problems unless your wallet logic and mint interactions are designed for it (NUT-13 restore flows explicitly include checking proof spend state and deleting spent proofs; you would need equally careful handling in your own persistence). citeturn7view0

If you keep proofs client-side (recommended default):

- A DB outage breaks web/app functionality that depends on server data (merchant listings, sessions, community configs), but user funds remain on the client device. This matches the documented reality that bearer tokens are held in wallet storage, and losing that storage loses funds—so protecting that local vault and providing backups is key. citeturn2search18turn2search10
- You can provide robust recovery by adopting deterministic secret derivation and mnemonic restore patterns as specified in NUT‑13, where a wallet regenerates secrets and asks the mint to re-issue signatures to recover proofs. citeturn7view0
- For multi-device sync, designs like NIP‑60 show an approach where unspent proofs are stored in a sync medium but encrypted with the user’s key, again keeping the server/sync layer from holding plaintext spendable bearer assets. citeturn2search3

## Backup, restore, and operational maturity for a pilot

A pilot needs “I can recover fast from my own mistakes” more than it needs “perfect scalability.” In practice, the biggest sources of pilot outages are schema churn, accidental deletes, and misconfigurations—not raw load.

Managed services give you packaged recovery:

- Supabase: daily backups for paid plans and optional PITR with documented restore processes and retention windows, including guidance that restore makes the project inaccessible during the operation. citeturn18view1turn8view4
- Neon: instant restore via restore window (plan-dependent), plus snapshots and `pg_dump` workflows. citeturn17view3turn17view1turn17view0
- Railway: scheduled volume backups with explicit retention policies and restore flows. citeturn16view0

Self-hosted PostgreSQL can be totally acceptable for a pilot **if** you do two things consistently:

1. **Automate backups and test restores.** PostgreSQL’s documentation outlines multiple backup approaches; whichever you choose, the important part is that restore is practiced, not theoretical. citeturn1search8turn1search14  
2. **Harden connectivity and credentials.** If Postgres stays inside your Docker network (no public port), your attack surface is dramatically reduced versus internet-exposed managed endpoints. (This is a standard network-security principle; the specific “IP allowlist” analog in managed land is called out by Supabase and Neon as a security control for Postgres connections.) citeturn18view0turn19view2

## Recommendation for ArxMint and migration path

### Recommended pilot architecture

Use **self-hosted PostgreSQL in Docker Compose** for ArxMint’s application database, and make “proof custody” an explicit product decision, not an accidental database-table decision.

- **PostgreSQL (Compose) stores:** community configs, merchant profiles/listings, transaction metadata/history (non-spendable records), and user/session state. (These are ordinary relational workloads and align with why you chose PostgreSQL + Prisma.)  
- **Client-side vault stores:** Cashu proofs, encrypted locally. This matches Cashu’s model that wallet storage contains the bearer money data. citeturn2search18turn2search10  
- **Backup UX:** either (a) export/import proofs, or (b) implement deterministic mnemonic-backed restore as in NUT‑13 so that loss of local state is survivable if the mint supports the necessary restore flow. citeturn7view0

### When to switch from self-hosted to managed

Promote to managed Postgres when one of these becomes true:

- You need **stronger recovery guarantees** without being on-call for Postgres (PITR, managed monitoring, managed failover).
- You need **easier environment management** (branching, rapid clones, staging parity).
- You’re onboarding enough non-technical stakeholders that “DB went down” carrying an operational burden is no longer acceptable.

At that point, the managed pick depends on whether you ever store sensitive bearer data server-side:

- If there is **any scenario where plaintext spendable proofs can hit the server DB**, prefer **Supabase** among your listed options because it supports **IP restrictions** on direct Postgres/pooler access and has a very clear “prod checklist” posture around database access controls, plus daily backups and PITR. citeturn18view0turn18view1turn8view4  
- If your design remains **non-custodial (proofs never stored server-side)**, **Neon** becomes more attractive because cost can be very low at pilot traffic levels and it provides strong developer workflows (restore window, branching, snapshots). But do not ignore that IP Allow is Scale-plan-only; you’re relying heavily on credential secrecy and TLS for DB exposure. citeturn8view1turn17view3turn19view2turn19view0  
- Railway is best if you decide to **move the whole stack to Railway** and lean into their platform primitives (private networking inside Railway, volume backups). If your strategic direction is “Bitcoin infra lives on our VPS(es),” Railway is less aligned. citeturn14search2turn16view0turn15view3

### Strong feedback on SQLite for this use case

SQLite is excellent for local/mobile wallets (as seen in Minibits), but it’s a risky default for a multi-user web app on a VPS if you expect concurrent writes and/or multiple processes, and it does not provide encryption-at-rest by default. citeturn2search0turn13search2turn13search1turn11search1  
Given your stack and the fact that you’re already orchestrating multiple services, running PostgreSQL as a Compose service is the cleaner long-term move.

### Bottom line recommendation

- **Pilot (now):** self-host PostgreSQL in your Docker Compose on the VPS; keep Postgres non-public; implement automated backups + test restores; treat proofs as client-side encrypted wallet data with explicit backup/restore. citeturn1search8turn2search18turn7view0  
- **Production (later):** move app DB to Supabase (security controls + backups/PITR) unless you remain strictly non-custodial, in which case Neon is viable; avoid putting plaintext proofs in any server DB unless you intentionally take on custodial hot-wallet responsibility. citeturn18view0turn18view1turn19view2turn17view3turn2search18