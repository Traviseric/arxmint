# Spiral Email Proposal — ArxMint

**Status:** READY TO SEND — verify email address at spiral.xyz/grants before sending
**Send to:** grants@spiral.xyz (check spiral.xyz/grants for current address)
**Date prepared:** 2026-02-28

---

## Email

**Subject:** ArxMint — Open-Source Deployment Toolkit for Cashu/Fedimint/Lightning UX (MIT)

---

Hi Spiral team,

ArxMint is an open-source toolkit that collapses the multi-protocol complexity of deploying a Bitcoin circular economy into a single prompt and one Docker command. Today, a community organizer types a description of their economy; ArxMint generates a complete, ready-to-run Docker Compose stack: Fedimint federation configs, Cashu mint settings, Lightning gateway, L402 agent commerce rails, a privacy-aware spend router, and Prometheus/Grafana monitoring — non-custodial by default, MIT-licensed, live on GitHub. The first pilot target is a 30-merchant, 300-MAU circular economy in Longmont, CO.

The work that should interest Spiral most is the reusable developer tooling layer. The L402 + NUT-24 ecash paywall SDK (`lib/cashu-paywall.ts`, `lib/lightning-agent.ts`) can be dropped into any Next.js application to add HTTP 402 payment gating in minutes — no Aperture instance required for basic flows. The spend router (`lib/spend-router.ts`) selects between Cashu, Lightning, and Fedimint based on policy (amount, privacy score, backend availability) and is independently extractable as a library. Both components are currently powering AI agent commerce rails: agents pay for data and compute via L402, humans transact in ecash, and both share the same Lightning-connected private infrastructure. That shared rail creates real Lightning transaction volume from agent commerce that would not otherwise exist. On the UX side, ArxMint's privacy dashboard gives non-technical users a clear, scored view of their transaction's privacy posture — a pattern that's been absent from Bitcoin UX toolkits.

We're seeking $50K–$150K to complete production hardening (Phases A–E: Postgres/Auth.js, vault encryption, real LND wiring, regtest E2E tests, rate limiting), fund the Longmont pilot for six months, and publish a replication playbook so any community can deploy from it. The full codebase is at https://github.com/arxmint/arxmint. Happy to jump on a call to walk through the architecture — Travis Eric, travis@arxmint.com, Longmont CO.

Travis Eric
ArxMint
https://arxmint.com
https://github.com/arxmint/arxmint

---

## Submission Checklist

- [ ] Verify current Spiral grant email at spiral.xyz/grants (address may have changed)
- [ ] Ensure GitHub repo is public and MIT license file is present in root
- [ ] Fill in real contact email before sending (replace travis@arxmint.com if different)
- [ ] Also submit common-app at grants.bitcoindevs.xyz — Spiral is included there
- [ ] Update docs/grants/ACTION-PLAN.md submission tracking after sending
- [ ] Note submission date in OVERNIGHT_TASKS.md or human_tasks.md

## Notes

Spiral's focus areas per their website: privacy, security, and UX improvements for Bitcoin adoption. The pitch above leads with the developer tooling angle (L402 SDK, spend router, privacy dashboard UX) rather than the community-builder angle — that's the strongest fit with Spiral's stated priorities. The Lightning volume from agent commerce is a secondary hook since Spiral cares about Lightning ecosystem growth.

The common-app at grants.bitcoindevs.xyz also reaches Spiral reviewers — this email is the direct channel in addition to that form, not a replacement.

Amount ask ($50K–$150K) matches Spiral's typical grant range for infrastructure projects. Maelstrom also overlaps this range; HRF grants tend to be smaller but are already covered separately.
