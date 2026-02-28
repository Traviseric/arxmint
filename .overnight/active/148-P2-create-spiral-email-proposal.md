---
id: 148
title: "Create Spiral email proposal draft"
priority: P2
severity: medium
status: completed
source: root-human-tasks
file: docs/grants/spiral-email.md
created: "2026-02-28T18:00:00"
execution_hint: parallel
context_group: grant_docs
group_reason: "Same docs/grants/ area as tasks 150"
---

# Create Spiral Email Proposal Draft

**Priority:** P2 (medium)
**Source:** root-human-tasks
**Location:** docs/grants/spiral-email.md (new file)

## Problem

`human_tasks.md` has an unchecked item: **"Submit Spiral email proposal"** — Spiral (Block's FOSS Bitcoin grants) accepts direct email proposals rather than only form-based applications. The common-app at grants.bitcoindevs.xyz covers Spiral via their form, but Spiral's team also welcomes short direct email pitches, especially for developer tooling and UX improvements. No email template exists yet.

ArxMint is an exact fit for Spiral's focus areas: **UX/developer-experience improvements for Bitcoin adoption**. The email should be tight: 2-3 paragraphs, lead with the UX/developer tooling angle, reference the open-source infrastructure (L402, ecash paywall, spend router) as reusable components, and note the Lightning transaction volume created by agent commerce.

## How to Fix

Create `docs/grants/spiral-email.md` with a ready-to-send email proposal:

1. **Subject line**: Something specific and compelling, e.g. "ArxMint — Deployment Toolkit for Cashu/Fedimint/Lightning (Open-Source, MIT)"
2. **Para 1**: One-sentence pitch + what exists today (prompt-to-Docker, dual ecash wallet, L402/NUT-24, spend router, privacy dashboard)
3. **Para 2**: Spiral-specific angle — UX for non-technical communities, developer tooling (reusable L402 + ecash paywall SDK), Lightning volume from agent commerce
4. **Para 3**: Ask — grant amount range ($50K–$150K), GitHub link, offer a call
5. Include submission note: "Send to grants@spiral.xyz or hello@spiral.xyz" (check spiral.xyz/grants for current email)
6. Add submission checklist at bottom (verify email, make repo public, update TrendOS pipeline)

Use `docs/GRANT_DOSSIER.md` for technical details and `docs/grants/common-app-application.md` for the Spiral-specific positioning notes at the bottom of that file.

## Acceptance Criteria

- [ ] `docs/grants/spiral-email.md` created with ready-to-send email content
- [ ] Subject line is compelling and specific
- [ ] Email is concise: 3 paragraphs max + signature
- [ ] Spiral-specific angle emphasized (UX, developer tooling, Lightning volume)
- [ ] Submission checklist included at the bottom
- [ ] Amount ask clearly stated ($50K–$150K)
- [ ] GitHub and website links included

## Notes

_Generated from root-human-tasks synthesis. human_tasks.md item: "Submit Spiral email proposal"._
_Previous sessions created OpenSats and HRF application drafts (docs/grants/opensats-application.md, hrf-application.md)._
_Common app at grants.bitcoindevs.xyz also covers Spiral — this is the direct email channel._
