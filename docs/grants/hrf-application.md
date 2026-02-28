# HRF Bitcoin Development Fund Application — ArxMint

**Apply at:** https://hrf.org/bdfapply (redirects to Monday.com form)
**Status:** READY FOR REVIEW — submit after manual review
**Date prepared:** 2026-02-27
**Note:** HRF reviews quarterly. Apply now for Q1 2026 cycle.

---

## Form Fields (copy-paste into Monday.com form)

### Applicant Information

**Are you applying as:** Individual

**Applicant Name:** Travis Eric

**Contact Email:** [your email]

**Contact Phone:** [optional]

**Mailing Address:** Longmont, CO [optional — add full if desired]

### Anonymity & References

**Are you a nym?:** No

**Social Media Handles:**
- Twitter: [your handle]
- Nostr: [your npub]
- GitHub: [your github]

**References:** [Name + email of two references — could be Bitcoin community members, other open-source developers, or local community organizers. If none available yet, note that references can be directed to bdf@hrf.org]

### Project Details

**Project Title:** ArxMint — Open-Source Bitcoin Circular Economy Deployment Toolkit

**Project Area of Focus:** Others

**Other (specify):** Bitcoin Privacy Infrastructure / Ecash / Community Self-Custody

**Short Project Description (1-2 sentences):**
ArxMint is an open-source toolkit that deploys complete private Bitcoin circular economies — Fedimint federations, Cashu ecash mints, Lightning gateways, and privacy-aware payment routing — from a single natural language prompt. It makes censorship-resistant community finance accessible to non-technical organizers.

**Detailed Project Description:**

**Problem:** Communities that want to operate outside the surveillance economy — whether for political reasons, economic sovereignty, or simply privacy — face enormous technical barriers. Setting up Fedimint guardian nodes, configuring Cashu mints, bridging to Lightning, and implementing privacy-preserving payment routing requires deep expertise in multiple Bitcoin protocols. Most communities never start.

**Solution:** ArxMint automates the entire stack. A community organizer describes their needs — member count, privacy requirements, services needed — and ArxMint generates a complete Docker Compose deployment. This includes:

- Fedimint federation with configurable guardian count and Byzantine fault tolerance
- Cashu mint (Nutshell for small/dev deployments, CDK for production at scale)
- Lightning gateway for external payments
- Privacy-aware spend router (ecash first, Lightning second, on-chain last)
- Silent Payments (BIP-352) for private on-chain peg-outs
- Prometheus + Grafana monitoring
- Governance documentation scaled to federation size

The toolkit also enables AI agent commerce via L402 and NUT-24 ecash paywalls — allowing machines to transact without identity infrastructure.

**Timeline:** 6 months
- Months 1-2: Docker regtest integration testing, upstream contributions to cashu-ts and Fedimint
- Months 3-4: Longmont, CO pilot deployment (30 merchants, 300 users target)
- Months 5-6: Production deployment guide, replication playbook for other communities

**Beneficiaries:** Communities seeking financial sovereignty — local circular economies, co-working spaces, markets, and any group wanting private, censorship-resistant payments. Also AI developers needing non-custodial payment rails for autonomous agents.

**Geographic Focus:** Global (open-source), with pilot in Longmont, Colorado, USA

**Project History:** ArxMint has been in active development since late 2025. The codebase includes 14 routes, dual ecash wallet (Fedimint + Cashu), Lightning integration, L402/NUT-24 paywalls, privacy dashboard, merchant onboarding, agent marketplace, BCE health metrics, programmable ecash, Silent Payments support, and multi-city federation networking. All five roadmap phases are complete.

### Project Goals & Outcomes

**How does this relate to HRF's mission?**

Financial privacy is a human right. ArxMint directly enables it by:

1. **Eliminating surveillance:** Chaumian ecash (Fedimint and Cashu) provides cryptographic unlinkability. The mint cannot connect issuance to redemption. There is no on-chain trail for the vast majority of transactions.

2. **Distributing trust:** Fedimint's federated custody model means no single entity controls the community's funds. Even if one guardian is compromised or coerced, the federation continues operating.

3. **Censorship resistance:** The entire stack runs on self-hosted infrastructure. No platform can deplatform a community's payment system. Fedimint supports Tor for network-level privacy.

4. **Lowering barriers:** The communities that need financial privacy most — those under authoritarian regimes, marginalized groups, activists — are often the least technically equipped to deploy complex Bitcoin infrastructure. ArxMint's prompt-driven deployment makes this accessible.

HRF has already invested in the components (Cashu, KVAC, Fedimint, Bitsacco). ArxMint is the integration layer that makes them deployable by the communities HRF serves.

**Why should HRF fund this project?**

1. ArxMint integrates the ecash tools HRF already funds into a deployable system
2. The privacy-first architecture (ecash by default, Silent Payments for peg-outs, Tor support) aligns directly with HRF's financial freedom mission
3. The "BCE in a box" replication playbook means one grant creates infrastructure reusable by dozens of communities worldwide
4. The pilot in Longmont provides measurable real-world evidence of community Bitcoin adoption
5. AI agent commerce via ecash creates a new category of censorship-resistant machine payments

**Success Metrics:**
- Short-term (3 months): 50+ commits, 3 upstream PRs merged, Docker regtest passing, 5 blog posts published, 20+ GitHub stars
- Medium-term (6 months): Longmont pilot live with 30 merchants and 300 monthly active users, 98% transaction success rate, replication playbook published
- Long-term (12 months): 3+ communities deploying ArxMint independently, upstream contributions cited in Cashu/Fedimint release notes

**Deliverables:**
1. Production-ready Docker deployment with regtest-verified Cashu and Fedimint integration
2. Upstream PRs to cashu-ts, CDK, and Fedimint (documentation, tests, bug fixes)
3. Deployment guide and video walkthrough
4. Longmont pilot report with adoption metrics
5. "BCE in a Box" replication playbook (10 sections: infra, guardians, merchants, monitoring, governance, launch)
6. 5 educational blog posts on Bitcoin circular economies, ecash, and privacy infrastructure

**Expected Outcomes:**
- Non-technical communities can deploy private Bitcoin economies without protocol expertise
- Increased real-world adoption of Fedimint and Cashu through turnkey deployment
- Documented evidence of Bitcoin circular economy viability for other grant organizations
- Open-source tooling that any community worldwide can fork and deploy

### Budget & Funding

**Total Project Budget:** $50,000

**Amount Requested from HRF:** $50,000

**What will funding cover:**
- Developer time (6 months, primary developer): $40,000
- Infrastructure (VPS for regtest, pilot deployment, monitoring): $3,000
- Longmont pilot merchant onboarding (QR materials, documentation): $2,000
- Travel to Bitcoin conferences for community engagement: $3,000
- Miscellaneous (domain, tooling, design): $2,000

**Prior Funding History:** No prior grants received. Self-funded development to date.

### Technical Details

**Is this project Free and Open Source?:** Yes

**Project Links:**
- GitHub: https://github.com/arxmint/arxmint
- Website: https://arxmint.com
- Upstream contributions: [link to docs/upstream-contributions.md]

### Timeline

**Project Proposed Start Date:** 2026-04-01

**Project Proposed End Date:** 2026-09-30

---

## Submission Checklist

- [ ] Add real contact email, phone, references
- [ ] Add social media handles (Twitter, Nostr, GitHub)
- [ ] Get 2 references (name + email)
- [ ] Ensure GitHub repo is public
- [ ] Submit at https://hrf.org/bdfapply
- [ ] Update TrendOS pipeline status to "submitted"
