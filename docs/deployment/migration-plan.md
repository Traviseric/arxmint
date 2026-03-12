# ArxMint â€” Mainnet Migration Plan

**Version:** 1.0
**Status:** Active planning document
**Last updated:** 2026-02-28
**Audience:** Guardian operators, ArxMint team, grant reviewers

> **Hard rule (from `docs/operations/trust-statement.md`):** No mainnet fund acceptance before guardian distribution is complete. This document defines when and how each migration phase is executed.

---

## Table of Contents

1. [Pre-Mainnet Acceptance Criteria](#1-pre-mainnet-acceptance-criteria)
2. [Guardian Distribution Process](#2-guardian-distribution-process)
3. [Nutshell to CDK Mint Migration](#3-nutshell-to-cdk-mint-migration)
4. [LND Channel Migration](#4-lnd-channel-migration)
5. [User Communication Timeline](#5-user-communication-timeline)
6. [Rollback Criteria and Emergency Procedure](#6-rollback-criteria-and-emergency-procedure)

---

## 1. Pre-Mainnet Acceptance Criteria

All of the following gates must be satisfied before the system accepts real mainnet Bitcoin. Each gate is binary: either it is cleared or it is not. No partial credit.

### Gate 1 â€” Longmont Pilot KPIs at Green Level

Reference: [`docs/operations/pilot-kpis.md`](../operations/pilot-kpis.md) â€” Section 5.2 "Proceed-to-Mainnet Gate"

All Q4 KPIs must be met at **Green level (â‰¥ 90% of each target):**

| KPI | Target | Green Threshold | Source |
|-----|--------|-----------------|--------|
| Merchants onboarded | 30 | â‰¥ 27 | `LONGMONT_KPI_TARGETS.merchantsTarget` |
| Monthly Active Users (MAU) | 300 | â‰¥ 270 | `LONGMONT_KPI_TARGETS.mauTarget` |
| Payment success rate | 98% | â‰¥ 88.2% | `LONGMONT_KPI_TARGETS.successRateTarget` |
| Federation / mint uptime | 99.5% | â‰¥ 89.6% | `LONGMONT_KPI_TARGETS.uptimeTarget` |
| Spend velocity | 2 tx/user/mo | â‰¥ 1.8 | `LONGMONT_KPI_TARGETS.spendVelocityTarget` |
| BCE Health Score | 80/100 | â‰¥ 72 | `computeHealthScore()` in `lib/bce-metrics.ts` |

**How to verify:** Run `computeBCEMetrics()` + `evaluatePilotKPIs()` from `lib/pilot-deployment.ts`. All returned `KPIEvaluation` entries must show `status: 'green'`.

### Gate 2 â€” Zero Confirmed Fund Losses

No user has experienced a confirmed loss of funds at any point during the pilot (including losses within value caps). A fund loss event triggers an automatic gate failure regardless of other KPI status.

**How to verify:** Review the incident log in `docs/operations/incident-response.md` and confirm zero `fund_loss` incidents are marked `confirmed`.

### Gate 3 â€” Security Audit Pass

A self-audit against the security checklist (at minimum) must be completed with no P0 or P1 findings open.

The security checklist covers:
- L402 agent route auth bypass (task 107)
- Settlement POST authentication (task 108)
- Session secret hardening (task 109)
- Macaroon root key presence check (task 110)
- Payment verification enabled in production (`SKIP_PAYMENT_VERIFY` is empty)
- Rate limiting active on all API endpoints
- Input validation on all user-facing forms

**How to verify:** The relevant security items in `AGENT_TASKS.md` are marked complete and reflected in the repo. The `.env` file has `SKIP_PAYMENT_VERIFY=` (empty).

### Gate 4 â€” Guardian Distribution Complete

The single-host custodial guardian arrangement must be replaced by an independent, geographically distributed guardian set before mainnet acceptance. See Section 2 of this document for the full procedure.

**How to verify:** Three independent operators are running guardian nodes on separate hardware in distinct locations. DKG ceremony is complete. Federation invite code is issued from the new distributed federation.

### Gate 5 â€” Disaster Recovery Drill on Testnet

At least one full disaster recovery drill must be completed on testnet, covering:
- Federation guardian key recovery from backup
- LND channel recovery from `channel.backup` file
- Postgres database restore from backup snapshot
- Service restart and health verification

The drill must succeed end-to-end before mainnet. No undocumented manual steps are acceptable.

**How to verify:** A dated drill report exists documenting the drill execution, any issues encountered, and their resolutions.

### Gate 6 â€” Value Caps Configured for Mainnet Risk Profile

The testnet pilot caps (`MAX_WALLET_BALANCE_SATS=50000`, `MAX_SINGLE_TX_SATS=10000`) must be explicitly reviewed and reset for mainnet by guardian vote. New caps must be documented and intentional â€” not the pilot defaults carried forward.

**How to verify:** `.env` on the production server has explicitly set mainnet value caps reviewed and signed off by the guardian council (documented in a guardian vote record).

### Mainnet Readiness Checklist

Before flipping `BITCOIN_NETWORK=bitcoin` in production:

- [ ] Gate 1: All Q4 KPIs at Green level
- [ ] Gate 2: Zero confirmed fund losses during pilot
- [ ] Gate 3: Security audit complete, no P0/P1 open findings
- [ ] Gate 4: Guardian distribution complete (3 independent operators)
- [ ] Gate 5: Disaster recovery drill completed and documented
- [ ] Gate 6: Mainnet value caps reviewed and set by guardian vote
- [ ] `SKIP_PAYMENT_VERIFY` is empty in `.env`
- [ ] `CASHU_PRIVATE_KEY` is a fresh cryptographically random 64-hex-char value
- [ ] LND command updated to `--bitcoin.mainnet` with mainnet neutrino peers
- [ ] Macaroon path updated to `mainnet/admin.macaroon` in docker-compose config
- [ ] Channel backups tested and running via `scripts/watch_channel_backup.sh`
- [ ] Postgres backups tested and running via `scripts/backup_postgres.sh`
- [ ] Monitoring alerts configured in Grafana for fund-safety thresholds

---

## 2. Guardian Distribution Process

This section documents the step-by-step procedure for transitioning from the Longmont pilot's single-host guardian arrangement to a trust-distributed federation with three independent operators.

**Prerequisite:** All gates in Section 1 must be cleared before beginning this procedure.

### Phase 2.1 â€” Pre-Migration Snapshot

**Objective:** Secure a complete, verified backup of the current federation state.

1. **Stop accepting new deposits** on the pilot federation:
   - Disable minting in the Cashu mint config (set `MINT_LIGHTNING` to disabled or use Nutshell's rate-limit feature to block new mint quotes)
   - Announce maintenance window to users (see Section 5 for communication protocol)

2. **Snapshot guardian key material:**
   ```bash
   # On the pilot VPS, create a snapshot of all guardian data
   docker compose exec fedimint-guardian-0 fedimint-cli backup
   docker compose exec fedimint-guardian-1 fedimint-cli backup
   docker compose exec fedimint-guardian-2 fedimint-cli backup
   ```

3. **Export Postgres database:**
   ```bash
   ./scripts/backup_postgres.sh /backups/pre-migration-snapshot
   ```
   Verify the backup file is non-empty and restores cleanly on a separate test environment.

4. **Record current federation state:**
   - Federation public key
   - Current consensus height
   - List of all active wallet proofs (from Postgres `WalletProof` table)
   - LND channel state (see Section 4)

5. **Confirm all guardian backups are intact** and stored in at least two geographically separate locations before proceeding.

### Phase 2.2 â€” Guardian Operator Recruitment

**Objective:** Identify and onboard three independent guardian operators.

**Operator requirements:**
- Distinct individuals or organizations (not ArxMint employees or contractors)
- Geographically separated (different cities or regions â€” ideally different states)
- Each operator controls their own hardware: a VPS or dedicated server meeting the minimum requirements from `docs/deployment/deploy.md` Section 1 (2 vCPUs, 4 GB RAM, 50 GB SSD)
- Each operator must be reachable via a reliable communication channel (Signal, email with PGP)
- Each operator signs the guardian governance document committing to quorum rules and key custody responsibilities

**Governance document must specify:**
- Guardian availability SLA (response time for signing ceremonies)
- Key custody procedure (hardware security, offline backups)
- Process for operator replacement if a guardian becomes unavailable
- Quorum rules: 2-of-3 threshold required for all signing operations

### Phase 2.3 â€” New Guardian Infrastructure Setup

**Objective:** Each new operator deploys a guardian node before the key ceremony.

For each new operator (repeat on each of three independent servers):

1. Follow `docs/deployment/deploy.md` Sections 1â€“4 to set up the server and clone the repository.

2. Install Docker and start only the guardian service (do NOT start the full stack yet):
   ```bash
   docker compose up -d fedimint-guardian-0   # or guardian-1, guardian-2 per operator
   ```

3. Verify the guardian service is healthy:
   ```bash
   docker compose ps fedimint-guardian-0
   docker compose logs fedimint-guardian-0
   ```

4. Each operator generates their guardian key material **on their own hardware**. ArxMint must not hold copies of any new guardian private keys.

### Phase 2.4 â€” DKG Ceremony

**Objective:** Perform the distributed key generation ceremony to establish the new distributed federation.

The DKG ceremony requires all three guardian operators to participate simultaneously (in person or via a verifiable remote protocol with synchronized key exchange).

1. **Pre-ceremony verification:**
   - Verify each operator's guardian node is running and healthy
   - Confirm each operator has their hardware security setup in place
   - Verify communication channels between all operators

2. **Run the DKG:**
   ```bash
   # On each operator's guardian node (run concurrently)
   docker compose exec fedimint-guardian-0 fedimint-cli dkg run
   ```
   Each operator runs this on their own machine. The DKG protocol coordinates automatically.

3. **Verify DKG success:**
   - All three guardians should report a successful DKG completion
   - A new federation invite code is generated
   - Test a multi-sig signing operation to confirm all three guardians are participating

4. **Record:**
   - New federation public key
   - New federation invite code
   - DKG ceremony date and participating operators (for audit trail)

### Phase 2.5 â€” Parallel Run and Fund Migration

**Objective:** Run the old and new federations in parallel while existing users migrate.

1. **Bring the new distributed federation online** (do NOT decommission the old one yet):
   - Start the full stack on the new federation
   - Point a new domain or subdomain to the new deployment
   - Configure ArxMint with the new federation invite code

2. **Fund migration via Lightning:**
   - Users with ecash balances in the old federation: instruct them to melt proofs to Lightning and mint new proofs in the new federation
   - This is the standard Cashu multi-mint swap: `melt (old mint) â†’ Lightning â†’ mint (new mint)`
   - Provide in-app guidance for this flow

3. **Drain period:** Allow a minimum 14-day drain period for users to migrate:
   - Keep the old federation's redemption paths active (users can still melt and receive Lightning)
   - Disable new issuance on the old federation
   - Monitor Postgres `WalletProof` table for outstanding balance
   - Send reminders per the communication schedule in Section 5

4. **Verification threshold:** The parallel run period ends when outstanding pilot federation balance drops below an acceptable residual (e.g., less than 1,000 sats total across all users â€” below this threshold, ArxMint can cover any remaining claims from operating funds).

### Phase 2.6 â€” Decommission Pilot Federation

**Objective:** Safely shut down the single-host pilot federation.

1. **Final snapshot:** Take a final Postgres backup and guardian state export from the pilot federation.

2. **Verify zero residual balance:** Confirm the outstanding ecash balance on the pilot federation is below the residual threshold.

3. **Decommission:**
   ```bash
   # On the pilot VPS
   docker compose down
   ```
   Do not delete the pilot VPS data volumes immediately â€” retain them for 90 days in case of claims.

4. **Update documentation:**
   - Update `docs/operations/trust-statement.md` to reflect the new distributed guardian setup
   - Publish a public announcement to users confirming the migration is complete

### Rollback Points in Guardian Distribution

| Phase | Rollback Trigger | Rollback Action |
|-------|-----------------|-----------------|
| 2.1 Pre-migration snapshot | Backup fails or cannot be verified | Do not proceed; fix backup first |
| 2.3 Operator infrastructure | Any operator's node fails health check | Delay ceremony; debug operator setup |
| 2.4 DKG ceremony | DKG fails or any guardian reports key compromise | Abort ceremony; rotate all keys; restart from 2.2 |
| 2.5 Parallel run | New federation has payment failures | Keep old federation active; debug new federation |
| 2.6 Decommission | Unexpected fund claims after shutdown | Restore pilot VPS from retained volume |

---

## 3. Nutshell to CDK Mint Migration

The ArxMint pilot runs Nutshell as the Cashu mint implementation because it is the reference implementation and more widely deployed for real mints today (per Research #3). CDK (`cdk-mintd`) is planned for production once it drops its "ALPHA" warning.

**Trigger condition:** The CDK repository explicitly removes its "ALPHA" / "use only amounts you don't mind losing" warning, or CDK is assessed as production-ready by the ArxMint team with documented evidence.

**Architecture note:** Cashu token proofs are mint-specific (each mint has its own keys). There is no in-place migration path â€” the transition requires a two-mint Lightning swap procedure.

### Phase 3.1 â€” Pre-Migration Verification

1. Confirm CDK trigger condition is met (ALPHA warning removed from CDK repository).
2. Verify CDK Docker image availability:
   ```bash
   docker pull cashubtc/cdk-mintd:latest
   ```
3. Test CDK deployment on a staging environment using `docker/docker-compose.cdk.yml` before any production change.
4. Verify CDK accepts LND connections and issues test proofs on testnet.
5. Take a Postgres backup of the current Nutshell mint state:
   ```bash
   ./scripts/backup_postgres.sh /backups/pre-cdk-migration
   ```

### Phase 3.2 â€” Deploy CDK Alongside Nutshell

Deploy the CDK mint in addition to (not replacing) the existing Nutshell mint:

```bash
# Start CDK mint alongside the existing stack
docker compose -f docker-compose.yml -f docker/docker-compose.cdk.yml up -d
```

The `docker/docker-compose.cdk.yml` override file deploys `cashubtc/cdk-mintd` on port `3338` (same service name as Nutshell: `cashu-mint`), but the compose override replaces the service definition. During the parallel phase, run CDK on a different internal port (e.g., `3339`) and update the override file accordingly.

**Required CDK environment variables** (from `docker/docker-compose.cdk.yml`):
```yaml
CDK_MINT_URL: http://0.0.0.0:3339         # different port during parallel run
CDK_LND_ADDRESS: https://lnd:8080
CDK_LND_CERT_PATH: /root/.lnd/tls.cert
CDK_LND_MACAROON_PATH: /root/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
CDK_MINT_INFO_NAME: ${MINT_NAME:-ArxMint Community}
```

### Phase 3.3 â€” Route New Deposits to CDK

Once CDK is verified healthy on testnet/staging:

1. **Update ArxMint configuration** to route new mint requests to the CDK mint URL:
   - Set `CASHU_MINT_URL` to the CDK mint endpoint in `.env`
   - New deposits and new proof issuance flow through CDK

2. **Keep Nutshell running** for existing proof redemptions:
   - Nutshell remains active with redemption (melt) paths still open
   - Disable new minting on Nutshell (set Nutshell to melt-only mode)
   - Existing Nutshell proofs remain valid and redeemable

3. **Monitor CDK health** via Prometheus:
   - CDK exposes `/metrics` endpoint natively (advantage over Nutshell)
   - Verify Prometheus is scraping CDK metrics at `docker/prometheus.yml`
   - Check Grafana for CDK payment success rate and error rates

### Phase 3.4 â€” Drain Nutshell Balance

During this phase, Nutshell handles only redemptions as existing users spend their Nutshell proofs.

1. Monitor the Nutshell balance via Postgres:
   ```sql
   SELECT SUM(amount) FROM "WalletProof" WHERE "mintUrl" LIKE '%nutshell%';
   ```
   (Adjust query to match your actual Nutshell mint URL)

2. Track the drain in weekly snapshots. Communicate progress to users per Section 5.

3. When balance drops below residual threshold (< 1,000 sats), consider ArxMint covering remaining claims to accelerate decommission.

### Phase 3.5 â€” Announce Nutshell End-of-Life

**Minimum 30-day notice required** before Nutshell is decommissioned.

Communication must include:
- The date Nutshell will stop serving redemptions
- Step-by-step instructions for users to swap Nutshell proofs to the CDK mint via Lightning
- In-app notification, Nostr DM to registered users, and public announcement
- Clear statement that proofs not redeemed before the EOL date will be permanently unclaimable

**Risk:** Users who do not redeem before the EOL date lose their Nutshell proof value. The communication plan in Section 5 is the primary mitigation. Maintain the 30-day minimum notice as a non-negotiable floor.

### Phase 3.6 â€” Decommission Nutshell

After the EOL date and confirmation that all non-negligible outstanding proofs have been redeemed:

1. Stop the Nutshell service:
   ```bash
   docker compose stop cashu-mint-nutshell   # name depends on your service config
   docker compose rm cashu-mint-nutshell
   ```

2. Retain Nutshell data volume for 90 days for audit purposes before deletion.

3. Update `docker-compose.yml` to remove the Nutshell service definition and make CDK the canonical `cashu-mint` service:
   ```bash
   docker compose -f docker-compose.yml -f docker/docker-compose.cdk.yml up -d
   # Then consolidate into a single docker-compose.yml with CDK as the mint
   ```

4. Update `docs/deployment/deploy.md` to reflect CDK as the default mint.

### CDK Migration Rollback

If CDK shows payment failures or proof issuance errors after going live:

1. Switch `CASHU_MINT_URL` back to the Nutshell endpoint (Nutshell should still be running)
2. Re-enable minting on Nutshell
3. Investigate CDK logs: `docker compose logs -f sf-cdk-mint`
4. Do not decommission Nutshell until CDK has run without issues for at least 30 days

---

## 4. LND Channel Migration

If guardian operators move to new machines, LND channel state must be migrated cleanly. The preferred path is always cooperative channel close and reopen. Force close is a last resort.

### Preferred Path: Cooperative Channel Close and Reopen

**When to use:** Moving LND to a new server, upgrading hardware, or changing VPS providers.

1. **Pre-migration: notify channel peers**
   - Contact peer operators before migrating
   - Coordinate migration timing to minimize disruption
   - Allow pending HTLCs to resolve before starting

2. **Enable continuous channel backup** (run this before migration starts):
   ```bash
   # Start the channel backup watcher if not already running
   chmod +x scripts/watch_channel_backup.sh
   LND_DATA_DIR=/var/lib/docker/volumes/arxmint_lnd_data/_data \
     nohup ./scripts/watch_channel_backup.sh /backups/lnd >> /var/log/arxmint-channel-backup.log 2>&1 &
   ```
   Verify the backup is being updated: `ls -la /backups/lnd/`

3. **Stop accepting new payments** during the migration window:
   - Disable invoice generation in ArxMint temporarily
   - Allow any in-flight payments to settle (wait 10â€“15 minutes after last payment)

4. **Cooperative close all channels:**
   ```bash
   # List all channels
   docker exec -it sf-lnd lncli --network=mainnet listchannels

   # Close each channel cooperatively (replace CHANNEL_POINT with actual values)
   docker exec -it sf-lnd lncli --network=mainnet closechannel --chan_point CHANNEL_POINT
   ```
   Wait for each close to confirm on-chain before proceeding.

5. **Transfer LND wallet to new machine:**
   - Copy `lnd-data` Docker volume to the new server
   - Or restore from the 24-word seed phrase on the new server (channel funds settle on-chain after cooperative close)

6. **Reopen channels with peers:**
   - Fund the new LND wallet from on-chain funds received from channel closes
   - Open new channels with the same peers at appropriate sizes
   - Coordinate with peers for balanced channel opens (push_amount)

7. **Resume operations:**
   - Re-enable invoice generation in ArxMint
   - Monitor first payments carefully: `docker compose logs -f lnd`

### Last Resort: Force Close

**Only use force close if:** cooperative close is impossible (peer is permanently offline and unresponsive) and funds would otherwise be permanently unreachable.

**Consequences of force close:**
- Funds are time-locked for 144â€“2016 blocks (roughly 1â€“14 days)
- Peer may broadcast a penalty transaction if they detect outdated state
- Higher on-chain fees
- Reputational cost with channel peers

**Force close procedure:**
```bash
# Force close a channel (DANGER: only if cooperative close is impossible)
docker exec -it sf-lnd lncli --network=mainnet closechannel --chan_point CHANNEL_POINT --force
```

Wait for the time-lock to expire before funds are spendable. Monitor: `docker exec -it sf-lnd lncli --network=mainnet pendingchannels`

### Channel Backup Verification

Before any server migration, verify channel backups are current and restorable:

```bash
# Check backup file exists and is recent (within last 24 hours)
ls -la /backups/lnd/channel.backup
stat /backups/lnd/channel.backup

# Verify the backup is valid (LND will reject corrupt backups)
docker exec -it sf-lnd lncli --network=mainnet verifychanbackup --single_backup $(cat /backups/lnd/channel.backup | base64)
```

If the backup file is older than 24 hours, investigate whether `scripts/watch_channel_backup.sh` is running and whether `inotifywait` (inotify-tools) is installed.

---

## 5. User Communication Timeline

All migration phases affecting users require advance notice. The following timeline is mandatory â€” not a guideline.

### Communication Schedule by Migration Phase

| Migration Phase | Notice Period | Communication Channels |
|-----------------|---------------|------------------------|
| Value cap changes (any increase or decrease) | **30 days** | In-app notification + Nostr DM |
| Mint migration (Nutshell â†’ CDK) | **30 days for EOL, 14 days for routing change** | In-app notification + Nostr DM + public announcement |
| Guardian migration (pilot â†’ distributed) | **14 days for parallel run start, 7 days for old federation shutdown** | In-app notification + Nostr DM |
| Scheduled maintenance (any downtime > 15 min) | **7 days** | In-app notification |
| Federation changes (value cap lift, governance update) | **7 days** | In-app notification + Nostr DM |
| Emergency maintenance (critical security patch) | Best-effort (minimum 2 hours if possible) | In-app notification + Nostr DM |

### Communication Templates

**30-day advance notice (mint migration):**
> "We are migrating to a new mint on [DATE]. Your existing ecash proofs will remain valid until [EOL DATE + 30 days]. After that date, proofs not redeemed will be permanently unclaimable. To migrate your balance: open your wallet â†’ tap 'Swap Mint' â†’ follow the instructions. Questions? Contact [support channel]."

**14-day notice (value cap change):**
> "On [DATE], the maximum wallet balance will change from [OLD_CAP] sats to [NEW_CAP] sats. If your current balance exceeds the new limit, you will be asked to send the excess via Lightning before the change takes effect."

**7-day notice (federation change):**
> "On [DATE], we are upgrading the Fedimint federation to [description of change]. Please back up your wallet seed phrase before this date. Your existing balance will be migrated automatically. Instructions: [link]."

### Nostr DM Implementation

ArxMint sends DMs to registered users via Nostr (NIP-04 encrypted direct messages). For each required notice:

1. Query Postgres for all users with a registered Nostr public key
2. Send encrypted DM using the ArxMint Nostr identity key
3. Log sent DMs in Postgres to avoid duplicates
4. Verify delivery by checking that the event was published to at least 3 relays

**Fallback:** If a user does not have a registered Nostr public key, ensure in-app notifications are displayed on every page load during the notice period.

---

## 6. Rollback Criteria and Emergency Procedure

### Rollback Triggers

Any of the following events requires an immediate halt to the migration in progress:

| Trigger | Response |
|---------|----------|
| Guardian key material suspected or confirmed compromised | Halt DKG / migration; rotate keys; security incident procedure |
| Unexpected fund movement (any unrecognized outgoing transaction) | Freeze all deposits; audit transaction history; security incident procedure |
| LND channel failure (force close initiated by peer) | Freeze new invoices; wait for timelock expiry; open replacement channels |
| CDK mint payment failure rate > 5% in any 1-hour window | Revert to Nutshell; stop CDK; investigate logs |
| New federation fails to produce valid threshold signatures | Keep old federation running; debug DKG; re-run ceremony |
| Postgres backup fails or corruption detected | Halt all migrations; restore from last known-good backup |

### Emergency Freeze Procedure

To stop accepting new deposits without disrupting existing users:

1. **Disable new invoice generation:**
   - Set `SKIP_PAYMENT_VERIFY=true` temporarily on the test endpoint (NOT production)
   - For production: configure the Cashu mint to disable new mint quotes:
   ```bash
   # Nutshell: set mint max balance to current balance (no new minting)
   docker compose exec cashu-mint mintd --max-mint-amount=0
   ```

2. **Keep redemption paths open:**
   - Users can still melt (redeem) their existing proofs
   - Do NOT stop the `cashu-mint` service until all outstanding proofs are addressed

3. **Notify users immediately:**
   - Push in-app notification: "Deposits temporarily paused for maintenance. Your existing balance is safe and fully redeemable."
   - Post Nostr DM to all registered users

4. **Engage guardian operators:**
   - Send alert to guardian operator contact list
   - Establish incident call within 1 hour

### Emergency Recovery Commands

```bash
# Stop all services (use only if security incident requires isolation)
docker compose down

# Restore to a previous version (roll back docker-compose.yml changes)
git checkout HEAD~1 -- docker-compose.yml
docker compose up -d

# Restore from a specific snapshot (replace with actual backup path)
docker compose exec postgres pg_restore -U arxmint -d arxmint /backups/postgres/arxmint_YYYYMMDD_HHMMSS.sql.gz

# Restart individual services without full restart
docker compose restart cashu-mint
docker compose restart lnd
docker compose restart web
```

### Guardian Operator Contact List

The contact list must be maintained in a secure, access-controlled location separate from this repository. It must include:

- Primary contact method for each guardian operator (Signal preferred)
- Backup contact method (email with PGP)
- Expected response time SLA (e.g., within 4 hours for non-emergency, within 1 hour for fund-safety incidents)
- Escalation path if primary contact is unreachable

**Template location:** The guardian governance document (signed by all operators at DKG ceremony) includes the contact list. Store in an encrypted file accessible to all guardian operators but not publicly committed to this repository.

### Relationship to Incident Response

This rollback procedure covers migration-specific emergencies. For ongoing operational incidents (payment failures, service outages, security breaches), see [`docs/operations/incident-response.md`](../operations/incident-response.md) for the complete incident response runbook.

---

## Appendix A: Migration Phase Summary

| Phase | Prerequisite | Estimated Duration | Risk Level |
|-------|--------------|--------------------|------------|
| Pre-mainnet gate verification | All pilot KPIs Green | 1â€“2 days | Low |
| Guardian operator recruitment | Pilot KPIs met | 2â€“4 weeks | Medium |
| Guardian infrastructure setup | Operators recruited | 1 week | Low |
| DKG ceremony | Infrastructure verified | 1 day (ceremony) | High |
| Parallel run + fund migration | DKG complete | 14â€“30 days | Medium |
| Pilot federation decommission | Drain complete | 1 day | Medium |
| CDK pre-migration testing | CDK ALPHA warning removed | 1â€“2 weeks | Low |
| CDK parallel deployment | CDK tested on staging | 1 day | Medium |
| Nutshell drain period | CDK routing active | 30â€“60 days | Low |
| Nutshell decommission | EOL notice served + drain complete | 1 day | Low |
| LND channel migration | Peer coordination complete | 1â€“3 days per node | High |

## Appendix B: Reference Files

| File | Relevance |
|------|-----------|
| `docs/deployment/deploy.md` | Deployment procedures and docker-compose commands |
| `docker/docker-compose.cdk.yml` | CDK mint override compose file |
| `docker/Caddyfile` | Reverse proxy configuration |
| `docker/prometheus.yml` | Monitoring scrape config |
| `lib/replication-playbook.ts` | `generateReplicationPlaybook()`, `exportPlaybookMarkdown()` |
| `lib/pilot-deployment.ts` | `LONGMONT_KPI_TARGETS`, `evaluatePilotKPIs()` |
| `lib/bce-metrics.ts` | `computeBCEMetrics()`, `computeHealthScore()` |
| `docs/operations/pilot-kpis.md` | Full KPI framework and measurement methodology |
| `docs/operations/trust-statement.md` | Guardian distribution timeline and trust model |
| `docs/operations/incident-response.md` | Full incident response runbook |
| `scripts/backup_postgres.sh` | Postgres backup automation |
| `scripts/watch_channel_backup.sh` | LND channel backup watcher |
