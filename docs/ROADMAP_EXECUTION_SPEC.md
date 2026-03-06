# ArxMint Roadmap Execution Spec

**Version:** 0.1  
**Date:** March 6, 2026  
**Purpose:** Define how `docs/roadmap.md` should be upgraded from a mostly sequential roadmap into a canonical execution system for a parallel agent team.

---

## 1. Goal

ArxMint now has enough scope, parallel workstreams, and agent capacity that the roadmap must do more than describe phases. It must:

- remain the canonical source of truth
- support parallel execution across multiple agents
- preserve the public phase narrative
- define clear gates, statuses, and dependencies
- make enterprise polish explicit instead of implied
- provide a clean bridge from roadmap items to executable task docs

This document is the planning/spec for that upgrade.

---

## 2. Why Upgrade `docs/roadmap.md`

The current roadmap is strong as a product and architecture narrative, but it is still optimized for human reading more than coordinated execution.

Current strengths:

- clear phase-based story
- strong architectural grounding
- strong legal/non-custodial framing
- meaningful acceptance criteria for many major items
- direct links to research and audit evidence

Current execution gaps:

- phases are still presented mostly as a timeline, not as parallel work lanes
- status language does not cleanly separate code existence from proof
- enterprise polish is partially present but not modeled as a first-class delivery track
- roadmap items do not all use a uniform execution schema
- detailed task decomposition is mixed into the roadmap instead of cleanly delegated to epic docs
- the public roadmap page, canonical docs, and internal execution model are not yet fully aligned

The upgrade should solve those gaps without losing the clarity of the current phase model.

---

## 3. Guiding Principles

### 3.1 Canonical, Not Conversational

`docs/roadmap.md` should be the authoritative reference for what ArxMint is building, what is in progress, and what counts as done. It should not read like brainstorming notes.

### 3.2 Parallel by Default

The roadmap must assume multiple agents and contributors can work simultaneously. Organize delivery by lanes, dependencies, and gates rather than by one serial path.

### 3.3 Phases Are Narrative, Lanes Are Execution

Keep phases because they are useful for external storytelling, investor/grant communication, and user comprehension.

Add execution lanes because that is how the work will actually be managed.

### 3.4 Gates Over Vibes

Every significant roadmap item must have explicit exit criteria. Avoid vague labels like "done" when the actual meaning is "code exists but is not proven."

### 3.5 Evidence-Based Status

Status claims must reflect proof, not aspiration.

Prefer:

- `planned`
- `building`
- `implemented`
- `validated`
- `pilot-proven`
- `enterprise-ready`
- `blocked-upstream`

### 3.6 One Item, One Schema

Each epic should follow the same structure so agents can pick up work without re-learning how the roadmap is written.

### 3.7 Separate Roadmap From Backlog

The roadmap should define epics, dependencies, gates, and acceptance criteria.

The detailed task backlog should live in dedicated epic/task docs.

### 3.8 Preserve Legal Architecture

Enterprise polish must not drift the product away from the non-custodial design already defined in the spec and legal research.

### 3.9 Operational Polish Is Product Work

Release engineering, trust docs, support, audit prep, docs, and observability are product-shaping work. They belong in the roadmap as first-class items.

### 3.10 Public and Internal Views Must Reconcile

The website roadmap, `docs/roadmap.md`, and any internal epic docs must use the same IDs, names, and status meanings.

---

## 4. What the Upgraded Roadmap Should Become

The upgraded roadmap should have four layers.

### Layer 1: Executive View

This is the compact overview for humans:

- what ArxMint is
- current state
- current gates
- major phases
- current strategic priorities

### Layer 2: Execution Model

This is the operating system for the agent team:

- execution lanes
- status taxonomy
- gate definitions
- dependency rules
- evidence rules

### Layer 3: Canonical Epic Registry

This is the structured list of all roadmap items:

- every major item listed once
- standard metadata for every epic
- explicit dependencies
- explicit acceptance criteria
- epic doc path

### Layer 4: Traceability

This is the auditability layer:

- links to spec sections
- links to research
- links to audits
- links to epic docs
- links to proof/evidence

---

## 5. Recommended Structure for the New `docs/roadmap.md`

Rewrite the roadmap into this general structure:

1. Title / version / scope
2. Purpose of the roadmap
3. Current execution snapshot
4. Status model
5. Gate model
6. Parallel execution lanes
7. Phase overview
8. Canonical epic registry
9. Enterprise polish additions
10. Dependency map
11. Evidence and verification model
12. Research/spec/audit traceability
13. Appendix: epic doc format

This preserves the current narrative while making the document executable.

---

## 6. Status Model

The current `done/current/pending` model is too coarse for a parallel team.

Use this status taxonomy:

| Status | Meaning |
|---|---|
| `planned` | scoped but not yet actively being built |
| `building` | actively under implementation |
| `implemented` | code or docs exist, but not yet sufficiently verified |
| `validated` | verified in tests or controlled environments |
| `pilot-proven` | proven with real merchants or real pilot usage |
| `enterprise-ready` | proven, operationally hardened, documented, and supportable |
| `blocked-upstream` | blocked on upstream protocol/library maturity |

Rules:

- `implemented` is not equal to `validated`
- `validated` is not equal to `pilot-proven`
- `pilot-proven` is not equal to `enterprise-ready`
- any item blocked by upstream dependency should say so explicitly

---

## 7. Gate Model

The roadmap should define shared gates once, then assign each epic to one or more gates.

### Gate 1: Buildable

An epic is `Buildable` when:

- scope is written
- dependencies are known
- deliverables are defined
- tasks can be derived

### Gate 2: Beta Ready

An epic is `Beta Ready` when:

- implemented end-to-end
- relevant tests exist
- relevant docs exist
- major edge cases are identified

### Gate 3: Pilot Proven

An epic is `Pilot Proven` when:

- used by real merchants or real pilot users
- metrics are being collected
- failure modes are known
- top issues are understood

### Gate 4: Enterprise Ready

An epic is `Enterprise Ready` when:

- operational controls are in place
- support/release expectations are defined
- scale assumptions are tested
- trust/audit/compliance materials are prepared
- evidence is published or internally recorded

---

## 8. Parallel Execution Lanes

Keep phase numbers as the public story, but add explicit execution lanes for delivery.

### Lane A: Merchant Core

Focus: the merchant-owned node and its core payment capabilities.

Includes:

- `5.1` local auth tokens + scoped macaroons
- `5.2` webhook engine
- `5.3` self-hosted checkout
- `5.4` payment status API
- `5.5` client SDK
- `5.6` LNURL-pay / Lightning Address
- `5.7` merchant dashboard
- `5.8a-d` provisioning / DNS / LSP / stack composition

### Lane B: Enterprise Polish

Focus: polish, reliability, usability, and supportability.

Includes:

- `5.10b` capacity, load, and failure testing
- `5.14` UX polish and conversion optimization
- `5.15` trust, release, and support ops

### Lane C: Credibility / Audit / Compliance

Focus: trust and procurement readiness without compromising the non-custodial model.

Includes:

- `5.16a` external security audit prep and execution
- `5.16b` merchant compliance documentation kit
- `5.16c` trust center and audit cadence

### Lane D: Docs / Adoption / Social Proof

Focus: developer adoption, merchant confidence, and public proof.

Includes:

- `4.6` developer portal and quickstarts
- `4.7` pilot case studies and social proof
- `4.8` merchant support channel and onboarding ops

### Lane E: Integrations

Focus: distribution through existing merchant ecosystems.

Includes:

- `5.17a` WooCommerce plugin
- `5.17b` Zapier / webhook templates
- `5.17c` Shopify app
- optional merchant-configured fiat-ramp guidance only

Constraint:

- all integrations must preserve the merchant-owned-node model
- no integration should silently collapse into custodial, ArxMint-hosted payment flow

---

## 9. Existing Epic Families That Stay

Do not discard the current phase structure. Preserve it and layer execution on top.

- Phase 0: Fortify
- Phase 1: Keystone
- Phase 2: Spire
- Phase 3: Aether
- Phase 4: Citadel
- Phase 5: Bazaar

The upgrade is not a replacement of phases. It is a change in how Phase 4 and Phase 5 work are represented and executed.

---

## 10. New Epic Families to Add

These are the major additions needed to make "enterprise polish" explicit and schedulable.

### 4.6 Developer Portal & Quickstarts

Purpose:

- create Stripe-quality onboarding for developers and integrators
- reduce activation friction
- give merchants and partners a stable docs surface

Scope:

- hosted docs site
- SDK quickstart
- webhook quickstart
- self-hosted merchant quickstart
- "5 minutes to first test payment" guide

### 4.7 Pilot Case Studies & Social Proof

Purpose:

- turn pilot evidence into adoption material
- create public proof that the system works

Scope:

- Glacier case study
- Teneo case study
- KPI snapshots
- merchant quotes
- migration stories

### 4.8 Merchant Support Channel & Onboarding Ops

Purpose:

- define how merchants actually get help
- reduce operator dependency on ad hoc direct communication

Scope:

- support channel setup
- onboarding concierge docs
- support intake rules
- escalation rules
- response-time expectations for managed ops

### 5.10b Capacity, Load, and Failure Testing

Purpose:

- define real scale targets
- verify behavior under stress and degraded conditions

Scope:

- concurrent checkout targets
- daily transaction targets
- webhook retry storm testing
- LND degradation testing
- scaling threshold documentation

### 5.14 UX Polish & Conversion Optimization

Purpose:

- improve merchant activation and checkout completion
- remove rough edges from the merchant-facing product

Scope:

- wizard UX pass
- checkout UX pass
- dashboard UX pass
- funnel instrumentation
- error/loading/empty state polish
- experiment framework

### 5.15 Trust, Release, and Support Ops

Purpose:

- convert scattered operational docs into explicit roadmap work
- make the product supportable and release-safe

Scope:

- staging / canary / rollback model
- SBOM and artifact signing
- request tracing and RED metrics
- SLA language for managed operations
- merchant support channel integration
- status / incident communication model

### 5.16 External Audit + Merchant Compliance Kit

Purpose:

- increase credibility with larger merchants and partner teams
- package the legal/security model for procurement review

Scope:

- external audit prep checklist
- third-party audit scope and remediation loop
- merchant compliance packet
- custody boundary diagrams
- data flow and operational controls docs

### 5.17 Commerce Integrations

Purpose:

- move from raw SDK to merchant-friendly integrations

Priority order:

1. WooCommerce
2. Zapier / webhook templates
3. Shopify

Constraint:

- all integrations must route to the merchant's own node
- optional fiat guidance may be documented, but not turned into ArxMint-managed flow

---

## 11. Recommended Internal Start Order

Because the team can work in parallel, this should not be managed as a single queue.

### Start Immediately

- `4.6` developer portal and quickstarts
- `5.8a-d` merchant deploy path
- `5.3` self-hosted checkout
- `5.4` payment status API
- `5.10b` load/failure testing design
- `5.15` trust/release/support docs and standards

### Start Once Merchant Node Flow Is Stable

- `5.5` SDK
- `5.7` merchant dashboard
- `5.14` UX polish
- `5.17a` WooCommerce
- `5.17b` Zapier

### Start Once Beta Merchants Are Live

- `4.7` case studies
- `4.8` merchant support channel and onboarding ops
- `5.16a` external audit prep
- `5.16b` compliance kit
- `5.17c` Shopify

---

## 12. Standard Epic Schema

Every roadmap item should use the same structure.

Recommended schema:

```md
## 5.14 UX Polish & Conversion Optimization

Lane
Enterprise Polish

Why
Improve merchant onboarding completion, checkout conversion, and overall product trust.

Scope
- Wizard UX pass
- Checkout UX pass
- Dashboard UX pass
- Funnel analytics
- Error, loading, and empty state polish
- Conversion experiments

Out of Scope
- Full brand redesign
- Native mobile app
- Hosted custodial checkout

Dependencies
- 5.3 Self-hosted checkout
- 5.4 Payment status API
- 5.7 Merchant dashboard

Deliverables
- UX audit
- Funnel instrumentation
- Funnel dashboard
- Redesigned high-friction flows
- Experiment framework
- Post-launch findings report

Acceptance Criteria
- Step-level funnel tracked
- Checkout completion tracked
- Top failure reasons visible
- Updated UX shipped across primary merchant flows

Gate
Beta Ready -> Pilot Proven

Evidence
- Metrics dashboard
- Screenshots
- Test coverage
- Pilot usage data

Epic Doc
docs/roadmap/epics/5.14-ux-polish.md
```

Required fields for every epic:

- `Lane`
- `Why`
- `Scope`
- `Out of Scope`
- `Dependencies`
- `Deliverables`
- `Acceptance Criteria`
- `Gate`
- `Evidence`
- `Epic Doc`

Optional fields:

- owner
- cost estimate
- upstream blockers
- rollout notes

---

## 13. Authoring Rules for the Rewritten Roadmap

These rules should govern the rewrite.

### 13.1 Keep IDs Stable

Do not renumber existing major roadmap items unless absolutely necessary. New items should slot into the existing numbering cleanly.

### 13.2 Keep Public Descriptions Short

The roadmap should remain readable. Deep execution detail belongs in the epic docs.

### 13.3 Every Epic Needs Dependencies

No major item should exist without dependency information. Agents need to know what can start now.

### 13.4 Every Epic Needs Acceptance Criteria

If a team cannot tell when something is done, the roadmap item is not yet usable.

### 13.5 Every Epic Needs Out-of-Scope Boundaries

This prevents agents from expanding the work indefinitely.

### 13.6 Every Status Claim Needs Evidence

If an item is `validated`, `pilot-proven`, or `enterprise-ready`, the roadmap should point to evidence.

### 13.7 Enterprise Additions Must Respect Non-Custodial Boundaries

Do not let enterprise ambitions rewrite the legal model.

### 13.8 Avoid "Someday" Items

If an item has no defined gate, no dependency information, and no clear reason to exist now, it should not be in the canonical roadmap.

---

## 14. How to Upgrade `docs/roadmap.md`

Use this order of operations.

### Step 1: Freeze the Roadmap Role

Decide that `docs/roadmap.md` is the canonical execution registry.

Decide that detailed tasking lives elsewhere.

### Step 2: Define Shared Metadata

Before rewriting item-by-item, lock:

- status taxonomy
- gate taxonomy
- execution lanes
- epic schema
- evidence rules

### Step 3: Re-map Existing Items

Take the current roadmap and re-express existing items in the new schema.

### Step 4: Add Missing Enterprise-Polish Epics

Add:

- `4.6`
- `4.7`
- `4.8`
- `5.10b`
- `5.14`
- `5.15`
- `5.16`
- `5.17`

### Step 5: Add Dependency and Concurrency Rules

Clearly mark:

- what can start now
- what depends on merchant-node stability
- what depends on pilot data

### Step 6: Add Evidence Expectations

Define what counts as proof for each gate and status class.

### Step 7: Split Detailed Execution Into Epic Docs

Create one epic file per major item.

### Step 8: Sync the Public Roadmap Page

The app page should reflect the same IDs, names, and statuses, but with compressed presentation.

---

## 15. Recommended Supporting Docs

To make this system usable by an agent team, create:

- `docs/roadmap.md`
  - canonical roadmap registry
- `docs/roadmap/README.md`
  - how to use the roadmap system
- `docs/roadmap/gates.md`
  - shared gate definitions
- `docs/roadmap/status-model.md`
  - shared status semantics
- `docs/roadmap/epics/*.md`
  - one file per epic

Suggested first epic docs:

- `docs/roadmap/epics/4.6-developer-portal.md`
- `docs/roadmap/epics/4.7-case-studies.md`
- `docs/roadmap/epics/4.8-support-ops.md`
- `docs/roadmap/epics/5.10b-scale-testing.md`
- `docs/roadmap/epics/5.14-ux-polish.md`
- `docs/roadmap/epics/5.15-trust-release-support.md`
- `docs/roadmap/epics/5.16-audit-compliance.md`
- `docs/roadmap/epics/5.17-integrations.md`

---

## 16. Core Enterprise-Polish Interpretation

For ArxMint, "enterprise polish" should not mean becoming a custodial SaaS clone.

It should mean:

- easier onboarding
- stronger operator trust
- clearer support model
- better release engineering
- better observability
- stronger audit posture
- better procurement-friendly documentation
- better integration surfaces

It should not mean:

- centralizing custody
- weakening the self-hosted model
- turning ArxMint into a compliance-heavy managed processor
- stuffing speculative SaaS work into the roadmap without gates

---

## 17. Questions the New Roadmap Must Answer

For any epic, an agent should be able to answer these six questions immediately:

1. What is this?
2. Why does it matter?
3. What does it depend on?
4. What exactly gets delivered?
5. How do we know it is done?
6. Where does the task breakdown live?

If the rewritten roadmap does not answer those six questions, it is not yet ready for a multi-agent team.

---

## 18. Recommended Next Actions

The next concrete work should be:

1. Rewrite `docs/roadmap.md` using this spec.
2. Create `docs/roadmap/` support docs for gates and status semantics.
3. Create the first batch of epic docs for the new enterprise-polish work.
4. Sync `app/roadmap/page.tsx` to the new status model and epic set.
5. Use epic docs as the source for agent task generation.

---

## 19. Summary

The roadmap upgrade should preserve the current phase story while adding a real execution model.

In short:

- keep phases
- add lanes
- add gates
- standardize epic schema
- separate roadmap from tasks
- make enterprise polish explicit
- require evidence for status claims
- make the roadmap usable by parallel agents

That is the standard ArxMint should use going forward.
