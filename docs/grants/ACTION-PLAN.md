# Grant Application Action Plan

**Date:** 2026-02-27
**Goal:** Submit 3 applications this week, set up FBCE for Round 3

---

## IMMEDIATE (This Week)

### 1. OpenSats General Grant — HIGHEST PRIORITY
- **Why now:** 16th wave (Feb 4) just funded Cashu TS, CDK, Coco, Nutshell, Noah (Ark). They are actively investing in the exact stack ArxMint integrates.
- **URL:** https://opensats.org/apply/grant
- **Draft:** `docs/grants/opensats-application.md`
- **Time to complete:** 30 minutes (fill form, paste from draft)
- **Action items:**
  - [ ] Make GitHub repo public with MIT license
  - [ ] Add contact email to draft
  - [ ] Review and tighten to ~1 page
  - [ ] Submit form
  - [ ] Update TrendOS pipeline: `python scripts/grant_pipeline.py update --grant-id opensats_general_arxmint --status submitted`

### 2. HRF Bitcoin Development Fund
- **Why now:** Rolling applications, Q1 2026 announcements coming. HRF funded Cashu, KVAC, Fedimint, Bitsacco in Q4 2025.
- **URL:** https://hrf.org/bdfapply
- **Draft:** `docs/grants/hrf-application.md`
- **Time to complete:** 45 minutes (longer form, more fields)
- **Action items:**
  - [ ] Get 2 references (name + email)
  - [ ] Add social handles (Twitter, Nostr, GitHub)
  - [ ] Fill Monday.com form from draft
  - [ ] Submit
  - [ ] Update TrendOS pipeline: `python scripts/grant_pipeline.py update --grant-id hrf_bdf_arxmint --status submitted`

### 3. Bitcoin Grants Common Application
- **Why now:** One form reaches OpenSats + Spiral + Maelstrom. No deadline.
- **URL:** https://grants.bitcoindevs.xyz/apply
- **Draft:** `docs/grants/common-app-application.md`
- **Time to complete:** 45 minutes (8-section form)
- **Action items:**
  - [ ] Same references as HRF
  - [ ] Select orgs: OpenSats, Spiral, Maelstrom
  - [ ] Submit
  - [ ] Update TrendOS pipeline: `python scripts/grant_pipeline.py update --grant-id common_app_arxmint --status submitted`

## NEXT WEEK

### 4. FBCE Round 3 Preparation
- **Why:** Round 2 awarded 42 projects in Nov 2025. Round 3 timing unknown.
- **Action items:**
  - [ ] Email admin@fbce.io: "Hi, I'm building ArxMint — a BCE deployment toolkit. Is Round 3 announced? We'd like to apply with our Longmont pilot."
  - [ ] Create Geyser.fund profile for ArxMint (required for FBCE)
  - [ ] Update TrendOS pipeline with response

### 5. Maelstrom Direct Application (Optional)
- **Why:** Separate from Common App, $50K-$150K range
- **URL:** https://forms.gle/erLqw98d8PDzM7dv7
- **Note:** If Common App already includes Maelstrom, this may be redundant. Submit only if Common App doesn't reach them or you want to double-down.

---

## BEFORE SUBMITTING — Required Prep

1. **GitHub repo must be public** — https://github.com/Traviseric/arxmint
2. **MIT license file** — Verify LICENSE file exists in repo root
3. **README** — Should clearly describe what ArxMint does (grant reviewers will check)
4. **Live demo** — https://arxmint.vercel.app (link in all applications)
5. **Contact info** — Real email you check regularly
6. **References** — 2 people who can vouch. Options:
   - Bitcoin community members
   - Other open-source developers
   - Local Longmont business owners
   - If nobody available yet, HRF says references can email bdf@hrf.org directly

---

## KEY TALKING POINTS (use across all applications)

### The Integration Story
"OpenSats funds Cashu TS, CDK, Nutshell, and Fedimint as individual tools. ArxMint makes them work together as a deployable system. More ArxMint deployments = more users for every ecash project you've funded."

### The Privacy Story (HRF angle)
"Ecash provides cryptographic unlinkability — the mint can't connect issuance to redemption. Fedimint distributes custody across multiple guardians. Silent Payments prevent address reuse on-chain. ArxMint deploys all three layers from a single prompt."

### The Practical Story
"A community of 30 people can go from zero to a running Bitcoin circular economy in one afternoon. No protocol expertise needed. Docker compose up, onboard merchants with QR codes, monitor with Grafana."

### The Agent Commerce Story (unique angle)
"AI agents need bearer payment instruments. ArxMint's L402 and ecash paywalls let agents pay for APIs and services without identity, accounts, or custody infrastructure. This creates real Lightning and ecash transaction volume."

---

## TIMELINE

| Date | Action |
|------|--------|
| Feb 27-28 | Make repo public, submit OpenSats |
| Mar 1-2 | Submit HRF + Common App |
| Mar 3 | Email FBCE, create Geyser profile |
| Mar 3-7 | First upstream issue/PR (strengthens applications in review) |
| Mar 10+ | Blog posts go live (shows active development) |
| Apr-May | Expect responses (2-8 weeks typical) |

---

## GRANT AMOUNTS (context)

- OpenSats: Variable (recent ecash grants range $5K-$50K+)
- HRF: Variable (recent: Fedimint $50K, typical $10K-$50K)
- Spiral: $50K-$150K/year (very selective)
- Maelstrom: $50K-$150K/year
- FBCE: 500K-5M sats (~$250-$2,500 at current prices, but strategic value)

**Total potential if all hit:** $50K-$200K+ across multiple funders
**Realistic expectation:** $25K-$75K from 1-2 funders (still life-changing for the project)
