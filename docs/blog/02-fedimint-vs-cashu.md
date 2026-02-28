# Fedimint vs Cashu: Choosing the Right Ecash Backend

**Target publish date:** March 11, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** fedimint vs cashu, ecash comparison, community mint, chaumian ecash bitcoin

---

Both Fedimint and Cashu give you ecash — blinded bearer tokens backed by bitcoin. But they make very different trust tradeoffs. This post breaks down when to use each and why ArxMint supports both.

## The Trust Model Difference

**Fedimint** distributes trust across a federation of guardians. If you have 4 guardians, any 3 can process transactions. One guardian going offline or malicious doesn't affect the system. This is Byzantine fault tolerance applied to community custody.

**Cashu** is a single-mint model. One operator runs the mint server, issues tokens, and processes redemptions. Simpler to deploy, but the mint operator is a single point of trust (though not a single point of *knowledge* — blinded signatures mean the mint can't see who spent what).

## When to Use Fedimint

- **Community custody**: 10+ people pooling bitcoin with no single trusted party
- **Long-term savings**: The federation model is more resilient to operator failure
- **Guardian governance**: You want rotation policies, uptime monitoring, quorum rules
- **Larger communities**: 30+ members where the coordination cost of multiple guardians is justified

Fedimint requires running `fedimintd` on each guardian node. ArxMint generates the Docker config for all guardians and handles the invite code flow.

## When to Use Cashu

- **Quick deployments**: A single `nutshell` or CDK mint on one VPS
- **Merchant payments**: Low-latency token swaps for point-of-sale
- **AI agent wallets**: Ephemeral tokens with TTL and balance limits — agents don't need federation governance
- **Interoperability**: Cashu tokens follow the NUT spec and work across any compliant wallet
- **Privacy-first**: Even simpler privacy model — the mint literally cannot trace token flows

Cashu is also where the NUT-24 ecash paywall spec lives, which ArxMint uses for API access control.

## Running Both

ArxMint's architecture supports both backends simultaneously:

- **Fedimint** handles community savings and high-value transfers
- **Cashu** handles daily spending, merchant payments, and agent commerce
- **Lightning** bridges the two and connects to the outside world
- **The spend router** automatically picks the best backend based on amount, privacy requirements, and recipient capabilities

This isn't theoretical — the wallet panel shows both balances and the privacy dashboard scores each transaction path.

## Technical Comparison

| Feature | Fedimint | Cashu |
|---------|----------|-------|
| Trust model | Federated (m-of-n) | Single mint |
| Setup complexity | Higher (multiple guardians) | Lower (one server) |
| Latency | Sub-second (consensus round) | Near-instant (single signature) |
| Privacy | Mint federation can't link spender to receiver | Mint can't link spender to receiver |
| Best for | Community custody, savings | Payments, agents, paywalls |
| SDK | @fedimint/core + @fedimint/transport-web (WASM) | cashu-ts v3 (pure TS) |
| ArxMint integration | Full wallet + peg-in/out | Full wallet + NUT-24 + NUT-26 |

## The Bottom Line

Start with Cashu for speed. Add Fedimint when your community grows and needs distributed custody. ArxMint's community generator asks the right questions and configures both.

---

*Next week: Building AI Agent Commerce with L402 and Ecash Paywalls*
