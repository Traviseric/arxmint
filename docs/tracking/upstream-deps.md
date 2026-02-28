# Upstream Dependency Tracking

**Last reviewed:** 2026-02-28
**Maintained by:** ArxMint team — update this file when upstream signals change.

These five items are blocked on external events (protocol adoption, npm releases, Bitcoin consensus changes). Check the monitor links periodically. When a "Ready when" criterion is met, act on the associated "Impact" item.

---

## Summary Table

| # | Dependency | Status | Est. Timeline | Impact |
|---|------------|--------|---------------|--------|
| 1 | Ark SDK (`@arkade-os/sdk`) | Not published | 2026 H2 | Enable real Ark VTXOs |
| 2 | Programmable eCash (NUT-XX) | Protocol WIP | Unknown | Time-lock / escrow conditions |
| 3 | ZK Reissuance (Cashu) | Research phase | Unknown | Privacy token reissuance |
| 4 | CTV+CSFS soft-fork | Not activated | Unknown (years) | Ark non-interactive receive |
| 5 | CDK Maturity (cdk-mintd) | ALPHA | 2026 H1–H2 | Migrate Nutshell → CDK |

---

## 1. Ark SDK (`@arkade-os/sdk`)

**Current status:** `lib/ark-sdk.ts` is a stub implementation. The `@arkade-os/sdk` npm package does not yet exist.

**Monitor:**
- GitHub releases: https://github.com/arkade-os/arkd/releases
- npm package (watch for publication): https://www.npmjs.com/package/@arkade-os/sdk

**Ready when:**
- `@arkade-os/sdk` is published to npm with TypeScript type definitions
- Package includes client APIs for: VTXO creation, boarding, async receive, exit

**Impact on ArxMint:**
- Replace stub in `lib/ark-sdk.ts` with real SDK calls
- Enable real Ark VTXO balance display in wallet panel (`components/wallet-panel.tsx`)
- Unlock the `arkVtxoBalance` field in `WalletBalance` type (`lib/types.ts`)

**Estimated timeline:** 2026 H2 (based on arkd development pace as of Feb 2026)

**Action when ready:**
```
npm install @arkade-os/sdk
# Replace stub in lib/ark-sdk.ts
# Remove TODO comments referencing stub mode
```

---

## 2. Programmable eCash (NUT-XX)

**Current status:** `lib/cashu-sdk.ts` contains aspirational type definitions for spending conditions (time-locks, escrow, proof-of-service). The Cashu protocol has not adopted spending conditions. No NUT number assigned yet.

**Monitor:**
- Cashu NUTs repository PRs and issues: https://github.com/cashubtc/nuts
  - Filter by label: `programmable-ecash`, `spending-conditions`
  - Watch for any new NUT PR with "spending conditions" or "HTLC" or "time-lock" in title
- cashu-ts library releases: https://github.com/cashubtc/cashu-ts/releases

**Ready when:**
- A NUT proposal for spending conditions is merged to `main` in the cashu/nuts repo
- A reference implementation exists in cashu-ts (or another Cashu client library)

**Impact on ArxMint:**
- Replace aspirational type stubs in `lib/cashu-sdk.ts` with real spending condition APIs
- Enable real escrow / time-lock / proof-of-service conditions for merchant payments
- Unlock atomic L402 + eCash settlement flows

**Estimated timeline:** Unknown — protocol-level design discussions are early-stage as of Feb 2026.

**Action when ready:**
```
# Check cashu-ts version that implements the NUT
npm install @cashu/cashu-ts@<version>
# Implement real spending conditions in lib/cashu-sdk.ts
# Remove aspirational stub comments
```

---

## 3. ZK Reissuance (Cashu Protocol)

**Current status:** ZK proof support for token reissuance is a stub only. Requires ZK proof primitives to be added to the Cashu protocol, then implemented in cashu-ts.

**Monitor:**
- Cashu NUTs repository: https://github.com/cashubtc/nuts
  - Search for issues/PRs mentioning "ZK", "zero-knowledge", "reissuance", or "blind"
- cashu-ts releases: https://github.com/cashubtc/cashu-ts/releases
- Cashu community Telegram / Nostr discussions for ZK reissuance proposals

**Ready when:**
- A NUT for ZK reissuance is merged to `main` in the cashu/nuts repo
- cashu-ts implements the corresponding API

**Impact on ArxMint:**
- Enable privacy-preserving token reissuance (users can reissue proofs without linking old and new tokens)
- Strengthens privacy story for `lib/privacy-defaults.ts` scoring (currently ZK reissuance score is 0)
- Upgrade `lib/cashu-sdk.ts` ZK stub to real implementation

**Estimated timeline:** Unknown — ZK proof support for Cashu is research-phase as of Feb 2026.

---

## 4. CTV+CSFS Bitcoin Soft-Fork

**Current status:** Neither BIP-119 (CTV / CheckTemplateVerify) nor BIP-348 (CSFS / CheckSigFromStack) are activated on Bitcoin mainnet. Both are at proposal stage.

**Monitor:**
- BIP-119 (CTV): https://github.com/bitcoin/bips/blob/master/bip-0119.mediawiki
- BIP-348 (CSFS): https://github.com/bitcoin/bips/blob/master/bip-0348.mediawiki
- Activation signals: https://utxos.org/signals/
- Ark protocol blog for activation dependency updates: https://arkdev.info

**Ready when:**
- CTV (BIP-119) and CSFS (BIP-348) are both activated on Bitcoin mainnet
- Ark protocol releases non-interactive receive support dependent on these opcodes

**Impact on ArxMint:**
- Enable Ark non-interactive receive in `lib/ark-sdk.ts` (currently requires interactive online step)
- Improves Ark VTXO liquidity and usability for ArxMint users
- Reduces round-trip for Ark boarding transactions

**Estimated timeline:** Unknown — Bitcoin soft-fork activation requires broad consensus. CTV has been proposed since 2020. No activation timeline is predictable.

**Note:** This item requires no code changes until after activation. Monitor only.

---

## 5. CDK Maturity (cdk-mintd)

**Current status:** The CDK (Cashu Development Kit) README contains an "ALPHA" warning. ArxMint's pilot deployment uses Nutshell as the production Cashu mint. CDK is preferred long-term for its active development and LDK Lightning backend.

**Monitor:**
- CDK GitHub README: https://github.com/cashubtc/cdk — watch for removal of "ALPHA" / "NOT PRODUCTION READY" warning
- CDK GitHub releases: https://github.com/cashubtc/cdk/releases — watch for a `v1.0.0` or "stable" tag
- CDK changelog for breaking changes that would affect migration

**Ready when:**
- The "ALPHA" / "NOT PRODUCTION READY" warning is removed from the CDK README
- A stable release is tagged (e.g., `v1.0.0`)

**Impact on ArxMint:**
- Migrate from Nutshell → CDK as the production Cashu mint
- Follow the migration procedure documented in **`docs/MIGRATION_PLAN.md`** (two-mint Lightning swap procedure)
- CDK provides better Lightning backends (LDK), more active maintenance, and a roadmap toward spending conditions

**Estimated timeline:** 2026 H1–H2 based on CDK development cadence as of Feb 2026.

**Action when ready:**
1. Read `docs/MIGRATION_PLAN.md` fully before starting
2. Run migration on testnet first
3. Follow the two-mint Lightning swap procedure (drain Nutshell → fund CDK)
4. Update `docker-compose.yml` to replace `nutshell` service with `cdk-mintd`
5. Update mint URL in ArxMint community configs

---

## How to Use This Document

1. **Monthly check:** Visit each monitor link and scan for the "ready when" signal.
2. **When a signal fires:** Open the referenced file (e.g., `lib/ark-sdk.ts`) and implement the change described in "Impact".
3. **Update this file:** Change the status in the summary table and add a "Resolved" note with the date.
4. **Archive resolved items** by moving them to a `## Resolved` section at the bottom of this file.

---

*Generated 2026-02-28. Next review: 2026-05-01 or when an upstream event is detected.*
