# ArxMint — Human Tasks

Tasks that require human decision-making, credential access, or external coordination. Agents cannot resolve these — Travis reviews on his schedule.

---

## URGENT — Grant Deadlines

- [ ] **Submit OpenSats General Grant application** — HIGHEST priority grant. Rolling intake, apply before next quarterly close. Narrative: "developer-experience + deployment infrastructure for ecash + L402." Commit to monthly reports → quarterly public writeups. Estimated ask: $75K–$200K. See `docs/research/6-Grant Application Strategy.md`.
- [ ] **Submit HRF Bitcoin Development Fund application** — Year-round intake, quarterly announcements, 4–6 week follow-up. Narrative: "freedom-tech deployment for vulnerable communities" + threat model. Estimated ask: $25K–$100K.
- [ ] **Submit Spiral email proposal** — No fixed deadline. Narrative: "UX/developer-experience improvement for Bitcoin adoption." Estimated ask: $50K–$200K.
- [x] **Prepare shared grant dossier** — Executive summary, technical scope, budget, team bios, open-source licensing statement, threat model. Reusable across OpenSats/HRF/Spiral applications. **DONE by agent — see `docs/GRANT_DOSSIER.md`.**

## Decisions LOCKED by Research (for reference)

These decisions are resolved. Agents should implement accordingly:

| Decision | Answer | Source |
|----------|--------|--------|
| **Database** | Self-hosted PostgreSQL in Docker Compose (no public port, internal network only). Supabase is graduation target. | Research #1 |
| **Cashu proof storage** | Client-side only (IndexedDB + WebCrypto encryption). Proofs NEVER in server DB. Non-custodial. | Research #1 |
| **VPS provider** | Vultr 16GB/6-core ($80/mo). Alternative: DigitalOcean 8GB ($48/mo). Hetzner needs written ToS approval for node hosting. | Research #2 |
| **Reverse proxy** | Caddy (automatic HTTPS, Let's Encrypt). Not nginx, not Traefik. | Research #2 |
| **3 guardians on 1 machine** | OK for pilot. Must message as "engineering pilot, not trust-distributed." Cap values. Plan migration to independent guardians before mainnet. | Research #2 |
| **Tor vs clearnet** | Hybrid (clearnet + Tor) for stable VPS. Tor-only if home server. | Research #2 |
| **Production mint** | Nutshell for pilot (reference implementation, battle-tested). Migrate to CDK when it drops "ALPHA" warning (6–12 months). Migration is two-mint Lightning swap, not in-place. | Research #3 |
| **Auth strategy** | Auth.js framework + Nostr NIP-98 primary + email magic link fallback for merchants. L402 for agents only (separate track). Step-up reauth for wallet operations. | Research #4 |

## Credential & Infrastructure Setup

- [ ] **Provision Vultr VPS** — 16GB/6-core plan ($80/mo). Set up SSH keys, disable password auth, configure UFW firewall (allow 22/80/443/9735 only). Research #2 confirmed specs. Step-by-step provisioning checklist in `docs/VPS_SETUP.md` (covers SSH hardening, UFW rules, Docker install).
- [ ] **Register domain + point DNS** — Need domain for Caddy HTTPS. Agents can configure Caddy but can't provision DNS records.
- [ ] **LND wallet creation** — After VPS is up, run `docker exec sf-lnd lncli create` to create wallet + save seed phrase OFFLINE. Agents must never handle seed phrases.
- [ ] **Generate Cashu mint private key** — Run `openssl rand -hex 32` and add to `.env` as `CASHU_PRIVATE_KEY`. Never use the deadbeef test key. **(Script: run `scripts/generate-secrets.sh` to generate all four secrets at once — writes to `.env`, prompts before overwriting, shows masked output. Added by task 145.)**
- [ ] **Generate NEXTAUTH_SECRET** — Run `openssl rand -base64 32` for Auth.js session encryption. **(Script: `scripts/generate-secrets.sh` generates this automatically.)**
- [ ] **Generate MACAROON_ROOT_KEY** — Run `openssl rand -hex 32` for L402 macaroon signing. **(Script: `scripts/generate-secrets.sh` generates this automatically.)**
- [ ] **Set GRAFANA_PASSWORD** — Strong random password for monitoring dashboard. **(Script: `scripts/generate-secrets.sh` generates this automatically.)**
- [ ] **Configure off-host backup destination** — Encrypted SSH key to secure server, S3-compatible storage, or offline USB rotation. For LND channel.backup + Postgres dumps + Fedimint guardian keys. Backup scripts ready: `scripts/backup_postgres.sh` (daily pg_dump + 7-day retention) and `scripts/watch_channel_backup.sh` (channel.backup sync on change). Human action needed: set destination path/SSH key in scripts. (Scripts added by task 089.)

## Upstream Dependencies (Blocked — Track Externally)

- [ ] **Ark SDK release** — `lib/ark-sdk.ts` is stub mode. Waiting on `@arkade-os/sdk` npm release. Track their GitHub.
- [ ] **Programmable eCash (NUT-XX)** — Cashu protocol hasn't adopted spending conditions. Track Cashu protocol repo.
- [ ] **ZK reissuance** — Requires Cashu protocol support for ZK proofs in token reissuance.
- [ ] **CTV+CSFS for Ark non-interactive receive** — Requires Bitcoin soft-fork. Long-term track.
- [ ] **CDK maturity** — Monitor cdk-mintd for "ALPHA" warning removal. Triggers migration from Nutshell.

## Grant & Community Coordination

- [ ] **Longmont Bitcoin meetup outreach** — Pilot requires real merchants and community members. Human relationship-building.
- [ ] **FBCE Round 3 monitoring** — Apply when Round 3 opens with Longmont traction data. Estimated ask: 1–5M sats. Narrative: "circular economy proof-of-work."
- [x] **Define Longmont pilot KPIs** — Lock target metrics (30 merchants, 300 MAU, repeat-spend %) to quarterly milestones for grant credibility. **DONE by agent — see `docs/PILOT_KPIS.md`.**
- [x] **Single-host federation trust statement** — Write public statement: 3 guardians on 1 VPS = custodial pilot, not distributed federation. Set value caps. Plan guardian distribution timeline. **DONE by agent — see `docs/TRUST_STATEMENT.md`.**

## Pilot Operations (Post-Deploy)

- [ ] **Disaster recovery drill on testnet** — Spin new VPS, restore volumes + env, verify LND + Fedimint transact. Do this BEFORE mainnet. Drill checklist ready in `docs/DR_DRILL.md`. (Checklist added by task 146.)
- [x] **Mainnet migration plan** — Define when guardians split to independent operators. Don't accept real mainnet funds until this is documented. **DONE by agent — see `docs/MIGRATION_PLAN.md`.**
