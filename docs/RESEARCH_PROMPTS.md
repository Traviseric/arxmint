# ArxMint — Deep Research Prompts

Research prompts to lock in deployment and infrastructure decisions before overnight agents start building. Run these through Claude deep research or similar — each should produce a concrete recommendation with tradeoffs.

---

## 1. Database & Persistence Strategy

```
Research the best PostgreSQL hosting option for ArxMint, a Next.js 15 Bitcoin circular economy app that needs to persist: community configs, Cashu ecash proofs, merchant listings, transaction history, and user sessions.

Context:
- Stack: Next.js 15 App Router, TypeScript, Prisma ORM (planned)
- Current state: Everything in-memory via Zustand, lost on page refresh
- Deployment: Docker Compose locally, VPS for pilot (Longmont, CO)
- Data sensitivity: Cashu proofs are bearer instruments (like cash) — if the DB leaks, proofs can be spent by anyone
- Scale: Pilot target is 30 merchants, 300 monthly active users
- Budget: Bootstrap/grant-funded, cost matters

Compare these options with concrete pricing, setup complexity, and tradeoffs:
1. Supabase (free tier → pro) — managed Postgres, has auth built in, Row Level Security
2. Railway — managed Postgres, simple deploy, usage-based pricing
3. Neon — serverless Postgres, branching for dev/staging, free tier
4. Self-hosted Postgres in Docker Compose (add to existing stack)
5. SQLite (simpler, no separate service, but limited concurrency)

For each option evaluate:
- Can it run alongside the existing Docker Compose stack (LND, Fedimint, Cashu, Aperture)?
- Does it handle encrypted-at-rest for Cashu proof storage?
- What happens if the DB goes down — do users lose money?
- Backup/restore story for a pilot deployment
- Migration path from pilot to production scale

Also research: Should Cashu proofs be stored in the DB at all, or should they use a separate encrypted local vault (like how Bitcoin wallets store keys)? What do other Cashu wallet implementations do for proof persistence?

Deliver a concrete recommendation with rationale.
```

---

## 2. Pilot VPS & Deployment Architecture

```
Research the optimal VPS hosting setup for deploying ArxMint's full Docker Compose stack for a Bitcoin circular economy pilot in Longmont, CO.

The Docker stack includes these services (all must run on one machine for the pilot):
- LND v0.18.0-beta (Lightning node, testnet initially → mainnet)
- Cashu Nutshell mint (ecash mint connected to LND)
- 3x Fedimint guardians (v0.10.0, federated ecash)
- Aperture (L402 reverse proxy)
- Prometheus + Grafana (monitoring)
- Next.js web app (ArxMint frontend)
- PostgreSQL (if not using managed DB)

Requirements:
- Must handle Bitcoin node sync (even neutrino/light client needs bandwidth)
- LND needs persistent storage for channel state (losing this = losing funds)
- Fedimint guardians need reliable uptime (99.5% target)
- Must support Docker Compose
- Located in or near US (latency for Longmont users)
- Budget: $20-80/month for pilot phase
- Must be easy to SSH into for debugging
- Needs to handle testnet first, then mainnet transition

Compare these providers with concrete specs and pricing:
1. Hetzner (CPX31 or similar) — known for Bitcoin node hosting, cheap, EU-based
2. DigitalOcean (Droplet) — US regions, simple, slightly pricier
3. Vultr — US regions, hourly billing, good for experimentation
4. Linode/Akamai — solid reputation, US regions
5. Home server / mini-PC (NUC) — zero monthly cost, full control, ISP risk

For each evaluate:
- RAM needed (LND + 3 Fedimint guardians + Postgres + monitoring is RAM-heavy)
- Disk I/O for LND channel DB and Fedimint consensus
- Bandwidth for neutrino sync + Lightning gossip
- IP stability (Lightning node needs consistent public IP or Tor)
- Snapshot/backup support for disaster recovery
- What happens if the VPS provider goes down mid-transaction?

Also research:
- Should the 3 Fedimint guardians run on the same machine? (defeats federation trust model — is this OK for a pilot?)
- Tor vs clearnet for the LND node in a pilot context
- SSL/domain setup: Caddy vs nginx vs Traefik as reverse proxy for the web app
- Firewall rules: which ports actually need to be public vs internal-only

Deliver a concrete recommendation: provider, plan, estimated monthly cost, and a security checklist for hardening.
```

---

## 3. CDK vs Nutshell — Production Mint Decision

```
Research whether ArxMint should use Cashu Development Kit (CDK) or Nutshell as its production ecash mint for a Bitcoin circular economy pilot.

Context:
- ArxMint generates Bitcoin community configs via prompt → Docker Compose
- Current local stack uses `cashubtc/nutshell:latest` connected to LND
- The community generator code can output CDK configs for "production" deployments
- Pilot target: 30 merchants, 300 MAU, real money (small amounts, likely <$50/user)
- Mint must connect to LND for Lightning funding/melting

Compare CDK vs Nutshell on these dimensions:
1. **Stability**: Which is more battle-tested for real-money operations? What's the risk of losing user funds due to mint bugs?
2. **Performance**: Token issuance latency, concurrent user handling, database backend options
3. **Monitoring**: Prometheus metrics exposure — which has better observability out of the box?
4. **NUT support**: Which supports more of the Cashu NUT specifications? Specifically: NUT-24 (HTTP payment), NUT-26 (payment requests), NUT-13 (deterministic secrets), NUT-28 (P2BK)
5. **Operational complexity**: Docker setup, configuration, backup/restore, key rotation
6. **Community/maintenance**: Which has more active development? Who maintains each?
7. **Multi-mint**: Which better supports the multi-mint/Coco path for inter-community commerce?

Also research:
- What do other Cashu-based products use in production? (Minibits, eNuts, Boardwalk Cash, Cashu.me)
- Has anyone reported fund loss incidents with either?
- What's the recommended migration path if we start with Nutshell and want to switch to CDK later?
- Can both run behind Aperture for L402 proxying?

Deliver a concrete recommendation for the pilot phase and a separate recommendation for production scale.
```

---

## 4. Authentication Strategy — Nostr vs Alternatives

```
Research the best authentication strategy for ArxMint, a Bitcoin-native web app where users manage ecash wallets, merchant listings, and community configs.

Context:
- Current state: No auth at all — anyone can access everything
- Existing scaffolding: `lib/nostr-auth.ts` and `components/nostr-login.tsx` exist with NIP-07/NIP-98 flow
- Target users: Bitcoin community members (likely have Nostr keys), merchants (may not), AI agents (need API keys)
- The app handles bearer instruments (Cashu proofs) — auth isn't just access control, it's fund security
- Stack: Next.js 15 App Router, no backend auth framework installed yet

Evaluate these auth approaches:
1. **Nostr-only (NIP-07 browser extension + NIP-98 HTTP auth)**
   - Pros: Sovereign identity, no email/password, aligns with Bitcoin ethos
   - Cons: Users need a Nostr extension (nos2x, Alby), merchants may not have one
   - How does session management work? JWT from signed Nostr event?

2. **Nostr + email/password fallback (for merchants without Nostr)**
   - What's the simplest way to add email/password alongside Nostr?
   - NextAuth.js / Auth.js with custom Nostr provider?

3. **Supabase Auth (if using Supabase for DB)**
   - Built-in email, magic link, OAuth — plus custom Nostr provider possible
   - How well does it integrate with Next.js 15 App Router?

4. **LNURL-auth (Lightning-based login)**
   - Sign a challenge with Lightning wallet — no accounts needed
   - Popular in Bitcoin community (Stacker News, etc.)
   - Does it work with LNC-Web? Can agents authenticate this way?

5. **API keys for agents (separate from human auth)**
   - Agents need programmatic access to L402 and NUT-24 endpoints
   - Scoped API keys with rate limits and spending caps
   - How to issue, rotate, and revoke agent keys?

For each approach evaluate:
- User friction (how many clicks to first login?)
- Security model (what happens if auth is compromised — can attacker spend proofs?)
- Session management with Next.js 15 (server components, route handlers, middleware)
- How to protect wallet operations (proof spending should require re-auth?)
- Mobile support (Nostr extensions don't exist on mobile — what's the fallback?)

Also research:
- What auth do other Bitcoin web apps use? (Mutiny Wallet, Start9, Umbrel, BTCPay Server)
- Is there a standard for "wallet-aware auth" where the auth is tied to the wallet's keys?
- NIP-46 (Nostr Connect / remote signing) as an alternative to NIP-07 browser extensions

Deliver: A phased recommendation — what to ship for pilot (simplest secure option) and what to build toward for production.
```

---

## 5. Cashu Proof Persistence & Recovery Architecture

```
Research how to safely persist and recover Cashu ecash proofs in a web application context.

This is critical because Cashu proofs are bearer instruments — whoever holds them can spend them. Losing proofs = losing money. Leaking proofs = theft.

Context:
- ArxMint is a Next.js web app where users hold Cashu ecash in-browser
- Currently proofs live only in Zustand (in-memory) — page refresh loses everything
- Using `@cashu/cashu-ts` v3 SDK
- Users may have proofs across multiple mints (multi-mint via Coco)
- Some proofs are NUT-26 payment requests, some are regular bearer proofs
- AI agents also hold proofs (ephemeral, scoped, auto-expiring per CLAUDE.md rules)

Research questions:
1. **How do existing Cashu wallets persist proofs?**
   - Cashu.me (web wallet) — localStorage? IndexedDB?
   - Minibits (mobile) — SQLite? Encrypted storage?
   - eNuts (mobile) — how do they handle backup/restore?
   - Boardwalk Cash (web) — what storage layer?

2. **What's the right storage layer for a web app?**
   - localStorage (simple, 5MB limit, no encryption, survives refresh)
   - IndexedDB (more storage, structured, still client-side)
   - Server-side encrypted DB (Postgres with encrypted column for proof data)
   - Hybrid: localStorage for speed + server backup for recovery
   - What's the threat model for each? (XSS can steal localStorage proofs)

3. **Encryption at rest:**
   - Should proofs be encrypted with the user's key before storage?
   - If using Nostr auth, can we derive an encryption key from the Nostr private key?
   - What encryption scheme? AES-256-GCM with key from Nostr nsec?
   - Key derivation: PBKDF2 vs Argon2 vs scrypt for deriving storage key

4. **Backup & restore flow:**
   - What format for proof export? (JSON? encrypted blob? NUT-XX standard?)
   - QR code backup (like Lightning seed words but for ecash)?
   - Automatic cloud backup (encrypted, user holds key)?
   - NUT-13 deterministic secrets — can proofs be re-derived from a seed?

5. **Multi-device sync:**
   - If user logs in from phone + laptop, how do proofs sync?
   - Double-spend risk: if two devices try to spend the same proof
   - Locking mechanism: mark proofs as "pending" during spend

6. **Agent wallet persistence (different rules):**
   - Agent wallets are ephemeral by design (CLAUDE.md rule)
   - Should agent proofs NEVER be persisted? Or persisted with auto-expiry?
   - What happens if the agent process crashes mid-transaction?

Deliver: A concrete architecture recommendation with:
- Storage layer choice and rationale
- Encryption scheme
- Backup/restore UX flow
- Agent vs human wallet separation
- Migration path from current Zustand-only to the recommended architecture
```

---

## 6. Grant Application Strategy & Timing

```
Research the current landscape for Bitcoin/ecash grants that ArxMint could apply to, and recommend an application strategy.

ArxMint is an open-source AI-first Bitcoin circular economy builder. It generates Fedimint federations, Cashu mints, and L402 agent commerce rails from a natural language prompt. MIT licensed. Pilot target: Longmont, CO.

Key differentiators for grant applications:
- Combines Fedimint + Cashu + Lightning L402 in one integrated stack
- AI agent commerce via L402 paywalls (agents buy/sell data for sats)
- Community-first: prompt → deploy → onboard merchants → track BCE metrics
- Privacy-focused: spend routing, silent payments support, security tiers
- Open-source replication playbook for other communities

Research these grant programs:
1. **OpenSats** — Current wave status, priorities, what they fund, typical grant size, reporting requirements. Do they fund Cashu/Fedimint projects? What Wave are they on now?
2. **FBCE (Free Bank of the Commons Endowment)** — Round 3 status, what they prioritize, how to apply. Are they still active?
3. **Fedi grants** — Do they fund projects that integrate Fedimint SDK? Application process?
4. **Human Rights Foundation (HRF)** — Bitcoin Development Fund, do they fund circular economy tools?
5. **Spiral (Block/Square)** — Do they fund application-layer Bitcoin projects or only protocol work?
6. **Brink** — Bitcoin open-source grants, scope?
7. **Bitcoin Mechanic / other individual grants**

For each active program:
- Application deadline or rolling basis?
- Typical grant size ($5K? $50K? $200K?)
- What stage do they expect? (idea vs prototype vs pilot vs production)
- Do they require proof of user traction?
- Reporting cadence and requirements
- Do they fund AI-related Bitcoin work specifically?

Also research:
- What successful Cashu/Fedimint grant applications have been funded recently?
- Is "AI agent commerce on Bitcoin rails" a compelling narrative for grantmakers right now?
- Should the Longmont pilot be running before applying, or is the prototype enough?
- Can ArxMint apply to multiple programs simultaneously?
- What KPI targets make a grant application competitive? (ArxMint targets 30 merchants, 300 MAU)

Deliver: A prioritized list of 3-5 grants to apply to, with recommended timing (apply now vs after pilot), estimated funding amounts, and a brief outline of what each application should emphasize.
```

---

## How to Run These Prompts

Each prompt is designed for Claude deep research mode or similar long-context research tools. They should produce:
- A concrete recommendation (not "it depends")
- Tradeoffs acknowledged but a clear winner identified
- Actionable next steps that can become overnight tasks

After running, update `human_tasks.md` with the decisions and add any new implementation tasks to `OVERNIGHT_TASKS.md`.
