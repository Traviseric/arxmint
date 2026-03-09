# Guardian Recruitment & DKG

> **Fedimint deployments only.** If you're running a Cashu (CDK) mint, guardians are not required — skip this document and proceed to [Merchant Onboarding](./merchant-onboarding-kit.md).

A Fedimint federation requires 3+ trusted guardians. Each guardian runs their own `fedimintd` node. The federation can tolerate failures of up to ⌊(n-1)/3⌋ guardians — with 4 guardians, 1 can be offline; with 7, 2 can be.

---

## How Many Guardians?

| Community size | Recommended guardians | Fault tolerance |
|---------------|----------------------|-----------------|
| < 30 members | 3 | 0 (use Cashu instead) |
| 30–100 members | 3 | 0 (upgrade to 4 when ready) |
| 100–500 members | 4 | 1 |
| 500+ members | 7 | 2 |

**Minimum viable federation:** 3 guardians (0-fault-tolerant, not recommended for production). Target 4+ for production safety.

---

## Guardian Selection Criteria

Guardians are the custodians of the community's funds. Select carefully:

### Required

- [ ] **Community investment** — 3+ months active community involvement
- [ ] **Identity verification** — Known in person, via Nostr, or via PGP-signed attestation
- [ ] **Technical baseline** — Can run a Linux server (or willing to learn with support)
- [ ] **Availability commitment** — Can maintain 95%+ uptime for their guardian node
- [ ] **Stake in the community** — Business owner, employer, or active member

### Preferred

- [ ] **Geographic diversity** — Guardians in different physical locations (natural disaster protection)
- [ ] **Organizational diversity** — Not all from the same business or employer
- [ ] **Backup contact** — Alternate contact method if primary is unavailable
- [ ] **PGP key** — For signing governance decisions

### Disqualifying

- Guardian controlling > 40% of voting power in any single organization
- Guardian with business interests that conflict with community neutrality
- Guardian unable to maintain required uptime

---

## Guardian Recruitment Process

### Step 1: Identify Candidates

Start with the founding merchant/meetup group. Look for:
- Business owners in the network (high stake)
- Technical community members (can maintain infrastructure)
- Long-standing community members (trusted, known)

Post a public call in your community channel:
> "We're forming a Guardian Council for [Community] Fedimint. Guardians hold the community's Bitcoin in multi-sig. We need 4 trusted members willing to run a server. Apply by [date]."

### Step 2: Evaluation

For each candidate:

1. **In-person or video meeting** — Explain guardian responsibilities
2. **Technical assessment** — Can they install Docker and keep a server running?
3. **Background check** — Cross-reference with other trusted community members
4. **Commitment confirmation** — Get written agreement to uptime and governance requirements

### Step 3: Onboarding

Once selected:

1. **Key ceremony prep** — Send guardian setup guide (link to Fedimint docs)
2. **Server provisioning** — Each guardian provisions their own server (see [Infrastructure Setup](./infrastructure-setup.md))
3. **Communication channel** — Set up Signal group for guardian coordination
4. **Governance document** — Sign the community governance policy (see Governance section)

---

## DKG (Distributed Key Generation) Ceremony

The DKG ceremony creates the federation's threshold signing keys. All guardians must be online simultaneously.

**Schedule the ceremony in advance** — allow 1 week notice so all guardians can be available.

### Pre-ceremony checklist

Each guardian must complete:

- [ ] `fedimintd` running and reachable at their P2P URL
- [ ] Server clock synchronized (NTP) — critical for consensus
- [ ] Stable internet connection (no VPN or Tor during DKG)
- [ ] Backup of pre-DKG state (empty at this point — just note the server details)

### Ceremony steps

```
1. Lead guardian starts the ceremony:
   fedimintd generate-invite --federation-name "[Community] Federation"

2. Lead guardian shares connection info with all other guardians:
   P2P URL: wss://guardian-0.yourcommunity.com:8173
   API token: <token>

3. Each other guardian connects:
   fedimintd join --invite <invite_code>

4. All 4 guardians accept the DKG parameters (in Signal group: "READY")

5. DKG runs automatically — completes in ~30 seconds

6. Lead guardian extracts the federation invite code:
   fedimintd invite-code
   → fedimint11... (share this with community members)

7. Each guardian backs up their guardian state data:
   cp -r ~/.fedimintd/guardians/[id]/ /opt/backups/guardian-state/
```

### Post-ceremony

- [ ] Federation invite code distributed to community members
- [ ] All guardians verify they can sign a test transaction
- [ ] Guardian state backups stored securely (not on the same server)
- [ ] Governance document updated with guardian public keys

---

## Guardian Responsibilities

### Day-to-day

- Keep `fedimintd` running with 95%+ uptime
- Monitor node health (set up Grafana alerts — see [Monitoring Runbook](./monitoring-runbook.md))
- Respond to governance pings within 24 hours
- Check Signal group daily for urgent issues

### Monthly

- Review federation health metrics in Grafana
- Attend monthly guardian check-in call
- Verify backup is current and restorable

### Emergency response

- **Guardian offline >24h:** Other guardians attempt contact via all channels
- **Guardian offline >72h:** Begin rotation procedure (requires quorum)
- **Security incident:** Convene emergency quorum, freeze if necessary

---

## Guardian Rotation

Guardians should serve fixed terms to prevent key-person concentration.

**Recommended rotation policy:**
- Maximum term: 12 months
- Cooldown before re-election: 3 months
- Maximum simultaneous rotations: 1 (never rotate 2 guardians at once)
- Handover period: 14 days overlap (outgoing and incoming both online)

### Rotation steps

1. Recruit and verify replacement guardian
2. Schedule key rotation (requires quorum approval)
3. New guardian joins federation (DKG re-run for key shares)
4. Old guardian key share is revoked
5. Verify federation is healthy with new guardian set

---

## Governance Document Template

Have all guardians sign this before DKG:

```markdown
# [Community] Federation Guardian Agreement

Date: [DATE]
Federation: [COMMUNITY] Federation

## Guardians
- [NAME] | Nostr: npub... | Signal: @...
- [NAME] | Nostr: npub... | Signal: @...
- [NAME] | Nostr: npub... | Signal: @...
- [NAME] | Nostr: npub... | Signal: @...

## Quorum Rules
- Standard consensus: 3 of 4 guardians
- Emergency actions: 3 of 4 guardians
- Treasury spends > 100K sats: 3 of 4 guardians

## Uptime Commitment
Each guardian commits to maintaining 95%+ uptime for their fedimintd node.

## Term
12-month maximum term. Re-election after 3-month cooldown.

## Incident Response
- Respond to emergency pings within 4 hours (daytime) / 12 hours (overnight)
- Participate in monthly guardian sync calls

## Acknowledgment
By signing (Nostr event or PGP), each guardian confirms they:
1. Understand their role and the custody of community funds
2. Have read and agree to this governance agreement
3. Will maintain the technical requirements
4. Will notify the community before stepping down

Signatures:
[Guardian 1 Nostr signature]
[Guardian 2 Nostr signature]
[Guardian 3 Nostr signature]
[Guardian 4 Nostr signature]
```
