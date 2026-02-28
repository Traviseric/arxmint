# FBCE Round 3 — Outreach Email & Geyser.fund Profile

**Status:** Draft — ready for human review and submission
**Related:** `docs/grants/ACTION-PLAN.md` → NEXT WEEK section
**Pilot data source:** `docs/PILOT_KPIS.md`, `docs/GRANT_DOSSIER.md`

---

## Part 1: Outreach Email to admin@fbce.io

**To:** admin@fbce.io
**Subject:** ArxMint — BCE Deployment Toolkit, Interested in Round 3

---

Hi FBCE team,

I'm building ArxMint — an open-source toolkit that lets any community deploy a complete Bitcoin circular economy from a single prompt (Fedimint federation + Cashu mint + Lightning L402 commerce rails, one Docker command). We've been following Round 2 closely — congratulations on funding 42 projects in November 2025, including several in the Fedimint and Cashu ecosystem we're building on top of.

We're preparing to launch a pilot in Longmont, CO (targeting 30 merchants, 300 monthly active spenders, 98%+ payment success rate within 6 months) and would love to apply when Round 3 opens. Has a timeline been announced? We're happy to share more details or a Geyser profile whenever you're ready.

Thanks for what you're doing for circular economies.

— Travis
ArxMint | https://github.com/[your-github-handle]/arxmint

---

## Part 2: Geyser.fund Profile

### Title

**ArxMint — Deploy Your Bitcoin Circular Economy in One Prompt**

### Short Description (1–2 sentences, for Geyser listing)

ArxMint is open-source infrastructure that generates a complete Bitcoin circular economy configuration from a natural-language prompt — Fedimint federation, Cashu ecash mint, and Lightning L402 commerce rails — deployable with a single Docker command. Humans and AI agents share the same private, non-custodial payment infrastructure.

### Full Description

#### The Problem

Running a local Bitcoin circular economy requires coordinating three separate protocol stacks — Fedimint for federated custody, Cashu for private ecash, and Lightning for settlement — each with its own deployment complexity, configuration format, and maintenance burden. Most community builders don't have the multi-protocol expertise to set this up, and even those who do spend weeks on infrastructure instead of onboarding merchants.

The result: almost no circular economies exist outside of a handful of technically sophisticated pilot cities. Bitcoin's potential for community-scale financial sovereignty is bottled up behind a configuration wall.

#### The Solution

ArxMint collapses weeks of infrastructure work into one afternoon. A community builder types a plain-English description of their economy — size, privacy level, merchant types, payment preferences — and ArxMint generates the complete deployment configuration. One Docker command brings up LND, a Cashu mint, a Fedimint federation, Aperture L402 proxy, Prometheus, and Grafana, all pre-wired together.

The same infrastructure serves human members (ecash proofs, Lightning payments) and AI agents (L402 paywalls, NUT-24 ecash HTTP 402). Privacy is on by default: ecash proofs never leave the client browser, are stored in an AES-256-GCM encrypted local vault, and no user identity is linked to payment activity. No custodial risk: the server never holds user funds.

#### The Longmont Pilot

The first production deployment targets the Longmont, CO Bitcoin community with clear, measurable goals:

- **30 merchants** onboarded with Numo NFC cards and QR payment terminals
- **300 monthly active spenders** transacting in ecash within 6 months
- **98%+ payment success rate** maintained from day one
- **99.5%+ federation uptime** with Prometheus/Grafana monitoring
- BCE Health Score ≥ 80/100 at the 6-month evaluation gate

Success triggers the replication playbook release — a fully documented, open-source guide for any community to deploy their own ArxMint without needing to contact us.

#### What This Funding Enables

1,000,000–5,000,000 sats covers:
- Server infrastructure for the Longmont pilot (6-month VPS, Lightning channel funding)
- Numo NFC cards and merchant onboarding materials for initial cohort (5–10 merchants)
- Community events to drive organic adoption and user onboarding
- Dedicated time to produce and publish the replication playbook

All code is MIT-licensed and live on GitHub. Grant funds go to infrastructure, not proprietary development.

### Goal

**1,000,000 – 5,000,000 sats**

(Equivalent to approximately $250–$2,500 at current prices. FBCE Round 2 ask range.)

### Tags

`bitcoin` `ecash` `fedimint` `cashu` `circular-economy` `lightning` `l402` `privacy` `open-source` `community`

### Media / Visual Identity

See `docs/brand.md` for the full ArxMint visual identity:
- **Colors:** Dark background (`#0a0a0a`), Bitcoin orange accent (`#F7931A`)
- **Energy:** Fortress, vault, citadel — sovereign infrastructure
- **Hero image:** Dark-themed screenshot of the ArxMint community generator UI
- **Logo:** ArxMint wordmark with the Arx (fortress arch) motif

### Links

- **GitHub:** https://github.com/[your-github-handle]/arxmint _(make public before submission)_
- **Technical scope:** `docs/GRANT_DOSSIER.md` (section 2: Technical Scope)
- **Pilot KPI framework:** `docs/PILOT_KPIS.md`
- **Full grant application:** `docs/grants/opensats-application.md`
- **Roadmap:** `docs/roadmap.md`

---

## Submission Notes — Human Action Required

FBCE requires an active Geyser.fund account to submit. The following steps must be completed by a human:

1. **Create Geyser.fund account** at https://geyser.fund
   - Use a Bitcoin-focused identity (Nostr key, Lightning address, or email)
   - Username: suggest `arxmint` or `arxmint-project`

2. **Create new project** using the profile content above
   - Copy title, short description, and full description from Part 2
   - Set goal to **3,000,000 sats** (midpoint of range; adjustable)
   - Add tags from the Tags section above
   - Upload hero image from the ArxMint UI (screenshot the `/create` page)

3. **Make GitHub repo public** before creating the Geyser profile
   - Grant reviewers will check the repo
   - Verify MIT `LICENSE` file is in root

4. **Send the email** from Part 1 to admin@fbce.io
   - Include Geyser profile link once created
   - Update ACTION-PLAN.md and TrendOS pipeline with response:
     `python scripts/grant_pipeline.py update --grant-id fbce_r3_arxmint --status outreach_sent`

5. **Timeline:** Per `docs/grants/ACTION-PLAN.md`, target March 3, 2026 for email + Geyser profile creation.

---

_Generated by overnight agent pipeline on 2026-02-28. Source data from `docs/PILOT_KPIS.md`, `docs/GRANT_DOSSIER.md`, `docs/brand.md`, and `human_tasks.md` (item: "FBCE Round 3 monitoring"). Review and personalize before sending — especially the GitHub URL and Travis's last name in the closing._
