# Zero-Knowledge Backups: How ArxMint Protects Merchant Funds It Never Touches

**Target publish date:** April 22, 2026
**Status:** DRAFT — manual review required before publish
**SEO keywords:** bitcoin node backup, lightning channel backup, non-custodial backup, zero knowledge encryption, merchant bitcoin recovery

---

When a merchant self-hosts their payment node, backups become life-or-death for their business. Lose your Lightning channel state and you might lose all your channel funds. Lose your Cashu mint database and you can't honor the ecash you've issued. Lose your config and you're rebuilding from scratch.

But here's the tension: if ArxMint stores your backups, and ArxMint can read them, then ArxMint has access to your financial data. That breaks the non-custodial model — and potentially crosses the money transmission line we designed the entire architecture to avoid.

The solution: zero-knowledge encrypted backups. ArxMint stores the data but literally cannot read it.

## Why Lightning Backups Are Different

Most backup systems run on a schedule. Daily dump at 3 AM. Weekly snapshot. That works for databases where yesterday's data is still valid today.

Lightning channels are different. A Lightning channel is a two-party contract with state that updates on every payment. If you restore an *old* channel state — one from before your most recent payments — your channel partner can prove you're trying to cheat. The Lightning protocol's penalty mechanism allows them to claim your entire channel balance.

Old channel state isn't just stale. It's toxic. Replaying it can cost you everything in that channel.

This is why ArxMint's LND Static Channel Backup (SCB) is event-driven, not scheduled. Every time a channel opens or closes, the backup fires immediately. Not every hour. Not every night. On every state-changing event. The backup always reflects the latest channel topology.

An SCB doesn't actually store channel state — it stores enough information to trigger a cooperative close with your channel partners if you need to recover. This is the safe way to recover Lightning channels: close everything cooperatively and start fresh, rather than trying to resume from potentially stale state.

## What Gets Backed Up

Four things, non-negotiable:

1. **LND Static Channel Backup** — Event-driven copy on every channel open/close. This is the minimum viable recovery artifact for Lightning funds.

2. **Cashu mint database + private key** — The mint database is the system of record for all issued ecash tokens. The `MINT_PRIVATE_KEY` is what signs new tokens. Lose either one, and the mint can't function. Lose the database, and you can't verify which tokens are valid — outstanding ecash becomes unspendable.

3. **Merchant configuration** — Webhook endpoints, API token hashes, checkout settings, business info, payment method preferences. Rebuilding this manually after a disaster is hours of work that should be seconds.

4. **Audit and event logs** — Transaction history, payment events, settlement records. Not strictly required for recovery, but essential for reconciliation after a restore.

## The Encryption Model

Here's how zero-knowledge backup encryption works:

1. The merchant sets up their node and writes down a seed phrase (BIP-39 standard, same as any Bitcoin wallet).

2. From that seed phrase, the node derives a backup encryption key using HKDF-SHA256 — a key derivation function that produces a cryptographically strong key from the seed material.

3. Before any backup leaves the merchant's VPS, it's encrypted locally using that derived key. The encrypted payload is then transmitted to ArxMint's backup storage.

4. ArxMint stores the encrypted blob in a cloud bucket. ArxMint does not have the seed phrase. ArxMint does not have the derived key. ArxMint cannot decrypt the backup. Period.

This preserves the non-custodial legal boundary. ArxMint is storing opaque data on behalf of the merchant, not holding financial records or keys. If ArxMint's backup storage were compromised, the attacker would get encrypted blobs they can't decrypt without each merchant's individual seed phrase.

## One-Click Restore

Disaster happens. VPS crashes. Disk dies. Provider goes down. Here's the recovery flow:

1. Provision a fresh host — via ArxMint's provisioning service or manually on any VPS provider
2. Install the ArxMint merchant stack at the latest known-good version
3. Merchant enters their seed phrase
4. The node derives the decryption key from the seed phrase
5. Fetches the encrypted backup from ArxMint's cloud storage
6. Decrypts locally and restores: Cashu mint database, merchant config, LND channels via SCB import
7. Post-restore health checks verify: mint database consistent, LND channels recovering via cooperative close, config loaded, checkout page reachable

The merchant needs exactly one thing to recover their entire business: their seed phrase. No support tickets. No waiting for ArxMint to "restore your account." The seed phrase *is* the account.

## Automated Restore Rehearsal

A backup you've never tested is a backup that doesn't work. ArxMint's backup system periodically runs automated "restore rehearsals" — spinning up a disposable environment, attempting to decrypt the latest backup, validating checksums, and checking database integrity.

The merchant's dashboard shows a "backup verified" status with the last successful rehearsal timestamp. If a rehearsal fails — maybe the backup is corrupted, maybe the encryption is broken — the merchant gets an alert before they actually need to recover.

This isn't a nice-to-have. It's the difference between "I think my backups work" and "I know my backups work because the system proved it yesterday."

## The Database Question

ArxMint supports two database backends for the Cashu mint:

**SQLite** — Single file. Simple to back up (use SQLite's Online Backup API for safe live copies). Good for most merchants. The backup is literally one file.

**PostgreSQL** — Better concurrency for high-traffic merchants. Backed up via `pg_dump` or `pg_basebackup`. More moving parts, but handles concurrent access without locking.

Both get the same zero-knowledge encryption treatment. The backup system doesn't care about the database engine — it encrypts whatever comes out.

## What This Means

Your funds sit on your node. Your backups sit on ArxMint's storage, encrypted with a key only you possess. If ArxMint disappears tomorrow, you still have your seed phrase and your node. If your node disappears tomorrow, you still have your seed phrase and ArxMint's encrypted backup.

The only scenario where you lose funds is if you lose your seed phrase *and* your node simultaneously. Write down the seed phrase. Store it somewhere safe. That's the only operational security requirement we can't automate away.
