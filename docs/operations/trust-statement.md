# ArxMint â€” Pilot Trust Statement

**Version:** 1.0
**Applies to:** Longmont, CO pilot deployment
**Last updated:** 2026-02-28

---

## 1. What This Is

The Longmont pilot is an engineering proof-of-concept. Its purpose is to demonstrate that a Bitcoin circular economy â€” merchants accepting ecash payments, users transacting privately, and AI agents accessing commerce rails via L402 â€” works end-to-end in a real community.

To keep operations simple during this phase, all three Fedimint guardians run on a single VPS. This was a deliberate choice: get the circular economy working first, then distribute the trust before accepting real savings.

The pilot runs for six months, targeting 30 merchants and 300 monthly active spenders. Full KPI targets are documented in [`docs/operations/pilot-kpis.md`](./pilot-kpis.md).

---

## 2. What This Is NOT

**Three guardians on one machine is not a trust-distributed federation.**

Fedimint's security model requires that guardian keys are held by independent operators in separate locations. That's not what the pilot does. All three guardian private keys live on the same server. A single server compromise â€” OS exploit, supply chain attack, malicious host â€” could expose all three keys simultaneously.

In plain terms: **the pilot is effectively custodial at the infrastructure level.** It is not meaningfully different from a single-operator mint for the purpose of trust. ArxMint is the operator. You are trusting ArxMint to not lose, steal, or have compromised the server.

We are telling you this directly because our brand is built on honesty. Anyone who uses this pilot deserves to know exactly what trust model they're in.

---

## 3. Value Caps in Effect During Pilot

To limit financial exposure while the system is in its custodial phase, the following hard caps are enforced by [`lib/value-caps.ts`](../lib/value-caps.ts):

| Limit | Default | Environment Variable |
|-------|---------|----------------------|
| Maximum wallet balance | **50,000 sats** (~$50 USD) | `MAX_WALLET_BALANCE_SATS` |
| Maximum single transaction | **10,000 sats** (~$10 USD) | `MAX_SINGLE_TX_SATS` |
| Maximum daily volume per user | **100,000 sats** (~$100 USD) | `MAX_DAILY_VOLUME_SATS` |

These caps are enforced server-side and cannot be bypassed by client behavior. The system will reject any operation that would exceed them.

The caps will remain in place for the duration of the pilot phase. They will only be raised after the guardian distribution milestone described below.

---

## 4. What Users Should Use This For

The pilot is built for:

- **Learning.** Understanding how Fedimint + Cashu works by actually using it. Getting your first ecash wallet. Sending your first private payment.
- **Community-scale commerce.** Buying coffee, food, or services from participating Longmont merchants. Small transactions that fit comfortably under the caps.
- **Experimentation.** Trying AI agent commerce via L402. Exploring what a circular economy feels like from the inside.
- **Feedback.** Telling us what breaks, what's confusing, what's missing.

This is exactly the right environment for small-value community transactions where the learning is more valuable than the amount at stake.

---

## 5. What Users Should NOT Use This For

Do not use the pilot for:

- **Savings.** Do not store significant value here. The wallet cap is 50,000 sats, but staying well below it is the safer choice during a custodial pilot.
- **Business treasury.** Merchants should not accumulate large balances in the pilot federation. Cash out via Lightning regularly.
- **Any transaction where a server compromise would be catastrophic.** If losing the funds would hurt you, this is not the right system yet.
- **High-frequency automated payments.** The pilot infrastructure is not sized for production load.

When you're ready for higher-value custody, use a fully-distributed Fedimint federation where guardians are organizationally and geographically separated. That's what we're building toward.

---

## 6. Guardian Distribution Timeline

The transition from custodial pilot to a real trust-distributed federation happens in a defined sequence tied to KPI milestones. We do not accept mainnet funds until this is done.

### Stage 1 â€” Pilot Phase (months 1â€“6)

All three guardians run on the ArxMint-operated VPS. Value caps enforced. This document in effect.

**Exit criteria:** All Longmont pilot KPIs met as defined in [`docs/operations/pilot-kpis.md`](./pilot-kpis.md):
- 30 merchants onboarded
- 300 monthly active spenders
- 98%+ payment success rate
- 99.5%+ federation uptime
- 2+ spend events per user per month

### Stage 2 â€” Guardian Recruitment (month 6â€“7)

Once KPI targets are met, recruit three independent guardian operators:
- Distinct individuals or organizations (not ArxMint employees)
- Geographically separated (different cities or regions)
- Each operator runs their own hardware â€” no shared VPS
- Each operator signs the guardian governance document and commits to the quorum rules

### Stage 3 â€” Key Ceremony (month 7â€“8)

A distributed key generation (DKG) ceremony is performed with all three independent operators present (in person or via verifiable remote protocol). The new guardian keys are generated and held by the independent operators. ArxMint does not retain copies.

After the key ceremony:
- The pilot federation is decommissioned
- The new distributed federation is stood up
- Funds are migrated via Lightning (melt from pilot â†’ mint into new federation)
- This trust statement is updated to reflect the new guardian setup

### Stage 4 â€” Mainnet Acceptance

After the key ceremony and successful federation stand-up, value caps are evaluated for removal. Only at this point is the system appropriate for meaningful savings or business treasury.

**Hard rule: No mainnet fund acceptance before guardian distribution is complete.**

---

## 7. Responsible Disclosure

If you find a security issue in the ArxMint pilot â€” a bug in the mint, a vulnerability in the L402 rails, a problem with the federation config, or anything else that could affect user funds â€” report it directly.

**Security contact:** Open an issue on the ArxMint GitHub repository marked `[SECURITY]`, or contact the ArxMint team directly via the community support channel. Do not post vulnerability details publicly until we've had a chance to patch and communicate to users.

We commit to:
- Acknowledging your report within 48 hours
- Keeping you updated on remediation progress
- Crediting you in the disclosure if you want credit

If a security incident does occur during the pilot that affects user funds, we will communicate it publicly to all affected users within 24 hours of confirmation, including what happened, what was affected, and what we're doing about it. See [`docs/operations/incident-response.md`](./incident-response.md) for our full incident response runbook.

---

*This document is part of ArxMint's commitment to honest disclosure. The pilot is valuable precisely because it's honest about what it is. We're building the infrastructure to earn trust â€” not claiming trust we haven't earned yet.*
