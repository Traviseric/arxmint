# Bitcoin Grants Common Application — ArxMint

**Apply at:** https://grants.bitcoindevs.xyz/apply
**Status:** READY FOR REVIEW — submit after manual review
**Date prepared:** 2026-02-27
**Note:** One application reaches OpenSats, Spiral, Brink, Btrust, and Maelstrom. Submit this IN ADDITION to the direct OpenSats application (different form, both valid).

---

## Section 1: Organizations

**Select all that apply:**
- [x] OpenSats — Open-source Bitcoin/freedom tech
- [x] Spiral — Block's FOSS Bitcoin grants (privacy, security, UX)
- [x] Maelstrom — Bitcoin resilience, privacy, censorship resistance ($50K-$150K)
- [ ] Brink — Bitcoin Core protocol developers (not our focus)
- [ ] Btrust — Global South focus (consider if pilot expands internationally)

## Section 2: Project Details

**Project Name:** ArxMint

**One-line Summary:** Open-source toolkit that deploys complete Bitcoin circular economies — Fedimint, Cashu, Lightning, and privacy routing — from a single prompt.

**Detailed Description:**

ArxMint automates the deployment of private Bitcoin circular economies. Communities describe their needs in natural language, and ArxMint generates a complete Docker deployment: Fedimint federation, Cashu mint (Nutshell or CDK), Lightning gateway, privacy-aware spend router, monitoring, and governance docs.

The project integrates tools that OpenSats already funds (Cashu TS, CDK, Nutshell, Fedimint) into a single deployable system. Instead of requiring deep protocol expertise, ArxMint makes community Bitcoin accessible to non-technical organizers.

Key capabilities:
- Prompt-driven Docker Compose generator (Fedimint + Cashu + Lightning + monitoring)
- Dual ecash wallet with Fedimint and Cashu backends
- L402 + NUT-24 ecash paywalls for API and agent commerce
- Privacy dashboard with per-transaction scoring and spend routing
- AI agent wallets with TTL, balance limits, and audit trails
- Silent Payments (BIP-352) for private on-chain peg-outs
- Merchant onboarding with QR codes and POS guidance
- BCE health metrics with grant-ready export
- Multi-city federation networking

**How does this contribute to Bitcoin?**

ArxMint lowers the barrier to deploying the ecash and federation infrastructure that makes Bitcoin usable as daily money. By integrating Cashu, Fedimint, and Lightning into a turnkey deployment:
1. More communities adopt Bitcoin for real commerce (not just hodling)
2. The ecash tools funded by Bitcoin grants get real-world deployment and testing
3. Privacy-first payment infrastructure proves viable at community scale
4. AI agent commerce creates new Lightning and ecash transaction volume

**Category:** Infrastructure / Privacy / Developer Tooling

**Open Source License:** MIT

## Section 3: Source Code

**GitHub Repository:** https://github.com/arxmint/arxmint

**Tech Stack:**
- Next.js 15, TypeScript, Tailwind
- @fedimint/core 0.1.3 (WASM), cashu-ts 3.5.0, lnc-web 0.3.5-alpha
- Docker: Fedimint v0.10.0, CDK, Nutshell, arkd, Prometheus + Grafana

**Current State:**
- 14 routes (10 pages + 4 API endpoints)
- 0 type errors, successful builds
- 5 roadmap phases complete
- Active upstream engagement with cashu-ts and Fedimint

**Prior Work / Contributions:**
- [Link to docs/upstream-contributions.md as it grows]
- [Link to blog posts as published]

## Section 4: Timeline

**Proposed Start:** April 2026
**Proposed End:** September 2026 (6 months)

**Milestones:**

| Month | Deliverable |
|-------|-------------|
| 1 | Docker regtest integration tests (Nutshell, Fedimint). First upstream PRs. |
| 2 | NUT-24 paywall verified against real Cashu mint. L402 gateway bridge tested. |
| 3 | Longmont pilot launch: 30 merchants onboarded, monitoring live. |
| 4 | Pilot metrics: 300 MAU target, 98% success rate. Demo video published. |
| 5 | Replication playbook published. Production deployment guide. |
| 6 | v0.1.0 release tag. Final upstream PRs. Grant impact report. |

## Section 5: Budget

**Total Budget:** $50,000
**Amount Requested:** $50,000

**Breakdown:**

| Category | Amount | Details |
|----------|--------|---------|
| Developer time | $40,000 | Primary developer, 6 months |
| Infrastructure | $3,000 | VPS for regtest, pilot, monitoring |
| Pilot costs | $2,000 | Merchant onboarding materials, QR printing |
| Community/travel | $3,000 | Bitcoin conferences, meetups |
| Miscellaneous | $2,000 | Domain, tooling, design assets |

**Prior Funding:** None. Self-funded to date.

## Section 6: Applicant

**Name:** Travis Eric
**Email:** [your email]
**Location:** Longmont, Colorado, USA
**Pseudonymous:** No

**Background:** Full-stack developer building AI and Bitcoin infrastructure. ArxMint combines expertise in Next.js application development with deep integration of Bitcoin privacy protocols. Active in Longmont Bitcoin community.

**Links:**
- GitHub: [your github]
- Twitter: [your handle]
- Nostr: [your npub]
- Website: https://arxmint.com

## Section 7: References

**Reference 1:**
- Name: [name]
- Email: [email]
- Relationship: [e.g., "Bitcoin community member / developer colleague"]

**Reference 2:**
- Name: [name]
- Email: [email]
- Relationship: [e.g., "Local business owner in Longmont pilot"]

## Section 8: Review

Final check before submission.

---

## Positioning Notes by Organization

### For OpenSats Reviewers
Emphasize: ArxMint is the integration layer for tools you already fund (Cashu TS, CDK, Nutshell, Fedimint). More deployments = more users for these projects.

### For Spiral Reviewers
Emphasize: Privacy infrastructure and developer tooling. The spend router and L402 integration are reusable open-source components. Lightning transaction volume from agent commerce.

### For Maelstrom Reviewers
Emphasize: Censorship resistance and Bitcoin resilience. Fedimint federation model distributes trust. Ecash eliminates surveillance. Community self-custody without custodians.

---

## Submission Checklist

- [ ] Fill in contact email, social handles, references
- [ ] Ensure GitHub repo is public with MIT license
- [ ] Select organizations: OpenSats, Spiral, Maelstrom
- [ ] Submit at https://grants.bitcoindevs.xyz/apply
- [ ] Update TrendOS pipeline status to "submitted"
