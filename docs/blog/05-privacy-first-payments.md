# Privacy-First Payments: Silent Payments, Ecash, and the Sovereign Stack

**Target publish date:** April 1, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** bitcoin privacy, silent payments bip352, ecash privacy, sovereign bitcoin stack

---

Privacy in Bitcoin is not about hiding. It's about not creating data that can be used against you or your community. Every on-chain transaction is permanent, public, and increasingly surveilled. Ecash and Silent Payments fix this at different layers.

## The Privacy Problem

A typical Bitcoin payment reveals:
- Sender address (linked to previous transactions)
- Receiver address (reusable = trivially trackable)
- Amount
- Timing

Chain analysis firms build profiles from this data. For a community running a local economy, this means every coffee purchase and every member contribution is permanently recorded on a public ledger.

## Layer 1: Ecash (Transaction Privacy)

Chaumian ecash provides **unlinkability**. When you spend an ecash token:

- The mint signs your token with a blind signature
- The mint cannot connect the issuance event to the redemption event
- The recipient gets a valid token without knowing who sent it
- There is no on-chain footprint at all

This is fundamentally stronger than mixing or CoinJoin. There's no blockchain data to analyze because the transaction never touches the blockchain.

**In ArxMint:**
- Fedimint ecash: Signed by the federation consensus, redeemable by any federation member
- Cashu ecash: Signed by the mint operator, transferable via token string or NUT-26 QR
- The spend router prefers ecash for all transactions where both parties support it

## Layer 2: Silent Payments (On-Chain Privacy)

BIP-352 Silent Payments solve the address reuse problem. Instead of publishing a static address (which links all payments to one identity), you publish a Silent Payment address. Each sender derives a unique one-time address that only the receiver can detect.

**Properties:**
- No interaction required between sender and receiver
- Each payment goes to a unique address
- Only the receiver (with their scan key) can identify incoming payments
- An observer cannot link a Silent Payment address to any on-chain transaction

**In ArxMint:**
- SP support via `silent-payments.ts` with BIP-352 scanning and key delegation
- BIP-392 descriptor generation for hardware wallet compatibility
- SP indexer in the Docker deployment for efficient scanning
- Used for on-chain peg-outs when ecash isn't an option

## Layer 3: Fedimint Over Tor (Network Privacy)

Even with ecash, your IP address can reveal your identity. Fedimint guardians can run as Tor hidden services. Client connections route through Tor, so the guardian federation doesn't know the IP addresses of its members.

## The Sovereign Stack

Combining all three layers gives you the sovereign stack:

| Layer | Technology | What It Protects |
|-------|-----------|-----------------|
| Transaction | Ecash (Cashu/Fedimint) | Who paid whom, how much |
| On-chain | Silent Payments (BIP-352) | Address linkability for peg-outs |
| Network | Tor + Fedimint | IP address and location |
| Custody | Fedimint federation | No single custodian has all keys |

ArxMint's privacy dashboard scores each transaction across these layers. A fully private transaction (ecash over Tor to a federation member) scores 100. An on-chain transaction to a reused address scores much lower.

## For AI Agents

Agent privacy matters too. An AI agent making API calls via L402 shouldn't leave a trail of Lightning payments that can be correlated. ArxMint's ephemeral agent wallets use Cashu ecash by default — the mint can't link the agent's identity to its spending patterns, and the tokens are destroyed when the agent's TTL expires.

## Practical Implications

For a community running ArxMint:
- **Daily transactions** (coffee, lunch, services) use ecash — zero on-chain footprint
- **Peg-outs** (when someone needs on-chain bitcoin) use Silent Payments — no address reuse
- **External payments** use Lightning — fast but with some privacy tradeoffs
- **Guardian communication** can run over Tor — network-level privacy

The result is a payment system where the only public information is the aggregate federation balance on-chain. Individual transactions are invisible.

## What's Next

ArxMint is applying for an OpenSats grant to continue development on:
- Hardware wallet Silent Payment integration (BIP-392 descriptors)
- Programmable ecash conditions (time-locks, escrow, proof-of-service)
- ZK reissuance for auditable-but-private agent spending
- Multi-city federation networking

If you're building on Fedimint, Cashu, or Silent Payments, check out the [ArxMint repo](https://github.com/arxmint/arxmint) and the upstream projects we contribute to.

---

*This is the final post in our 5-part series on building sovereign Bitcoin infrastructure. See [upstream-contributions.md](../upstream-contributions.md) for our open-source engagement log.*
