# Cashu Proof Persistence & Recovery Architecture for Web Wallets

## Why proof persistence is uniquely risky

Cashu is designed as a bearer-token ecash system: ecash “lives” in the wallet (client device) rather than in an account database, and transfers are intended to feel cash-like (instant and final). citeturn45view0 That property is exactly what makes proof persistence critical: the ecash value is embodied in the proof material itself, not in a server-side account ledger. citeturn45view0turn47view0

At the protocol level, a `Proof` contains at minimum `(amount, id, secret, C)`, where `secret` is the spender-chosen secret and `C` is the mint’s signature over that secret (unblinded). citeturn47view0 Anyone who obtains these bearer proofs can attempt to spend them; there is no inherent “account password reset” that can claw them back because the mint’s spent-book is keyed by secrets/proof-derived values, not by user identity. citeturn47view0turn49view0turn45view0

This leads to two non-negotiable invariants for your web app design:

You must assume “loss of local state” equals “loss of funds” unless you have a recovery path (protocol restore, backup export, or encrypted cloud backup). citeturn45view0turn46view0

You must assume “proof disclosure” equals “theft risk,” and in a browser the biggest practical disclosure vector is a successful XSS (or supply-chain script injection) that can read browser storage and/or live in-memory wallet state. citeturn36search7turn37search0turn42search11

## What existing Cashu wallets do in practice

The Cashu ecosystem already contains a range of persistence approaches—useful both as reference and as cautionary tales.

Cashu.me (web/PWA) persists its wallet state in browser storage. In its store code, it uses `useLocalStorage(...)` to persist items including the mint list and (critically) the proofs themselves (`cashu.proofs`, `cashu.spentProofs`). citeturn24view0 It also persists the wallet mnemonic and keyset counters via `useLocalStorage("cashu.mnemonic", ...)` and `useLocalStorage("cashu.keysetCounters", ...)`. citeturn21view1 Its `package.json` shows dependencies that include `dexie` (IndexedDB tooling) and `@gandlaf21/bc-ur` (often used for UR / animated QR payload transport), but the snapshot above demonstrates that the core proof store is at least capable of being localStorage-backed. citeturn14view0turn24view0

Minibits (mobile) explicitly prioritizes robust local persistence and recovery. Its documentation describes a multi-layer storage design: fast app state persisted in MMKV, and a local SQLite database as persistent storage for ecash notes / history, plus explicit “backup and recovery” features including (a) a local append-only backup database separate from primary wallet storage, (b) export/import of wallet backups including ecash + configuration, and (c) 12-word mnemonic recovery for lost-device scenarios. citeturn26view0 Its `package.json` also shows it uses `@cashu/cashu-ts` v3.x, `react-native-mmkv`, and a fast SQLite driver. citeturn26view1

eNuts (mobile, Expo-based) is (per its README) no longer maintained, but its dependency set is instructive: it includes `expo-secure-store` and `expo-sqlite`, which strongly suggests a split between “secure key material in OS-backed secure storage” and “structured wallet data in SQLite.” citeturn27view1turn29view0

Nutshell (CLI) is explicitly described as supporting PostgreSQL and SQLite database backends. citeturn35view0 While that’s not directly portable to the browser, it reflects a consistent pattern: serious wallets treat proofs as database assets, not ephemeral UI state. citeturn35view0

Coco (wallet toolkit) explicitly frames its core as storage-agnostic and provides “ready-to-use storage adapters” including SQLite3 and IndexedDB. citeturn13view0 This is significant for ArxMint because you’re already in a multi-mint context and Coco is built to model proof management, mint synchronization, and state updates across platforms. citeturn13view0

Boardwalk Cash (web) is harder to verify from primary sources in this research session because its web pages did not render in the crawler, but third-party writeups indicate it is a Cashu web wallet and cite Coco as an underlying component. citeturn12search7 Given Coco’s IndexedDB adapter, an IndexedDB-backed approach is plausible, but not confirmable here. citeturn13view0turn12search7

## Threat model and storage layer options in a browser

The browser gives you only a handful of viable persistent storage primitives. The right choice is less about “which is best” and more about “which risks you can realistically control.”

### Storage primitives and their security properties

**localStorage** is small and simple, but it is explicitly not recommended for sensitive data. It is constrained (commonly ~5 MiB per origin) and will throw `QuotaExceededError` when the limit is hit. citeturn36search6 More importantly, guidance from the entity["organization","OWASP","web app security nonprofit"] HTML5 Security Cheat Sheet recommends avoiding storing sensitive information in local storage (including where “authentication would be assumed”), because the underlying storage is not a strong security boundary. citeturn37search0

**IndexedDB** is the primary serious option for larger, structured client-side storage. It is origin-bound (same-origin policy) and is not accessible cross-origin, but any code running in the origin can access it—so XSS remains a first-class threat. citeturn42search6turn36search7turn42search11

**Browser storage in general (localStorage, IndexedDB, etc.) is an XSS amplifier**: OWASP’s browser-storage testing guidance flags authentication tokens and sensitive business data stored in localStorage/IndexedDB as a common issue, specifically because they are accessible via JavaScript and become exposed if an attacker achieves XSS. citeturn42search11 (Cashu proofs are strictly more sensitive than “business data,” because they are spendable bearer instruments. citeturn47view0turn45view0)

**Data eviction** is a real operational risk for offline-first/PWA wallets. Modern browsers can evict “best-effort” data under storage pressure, and the recommended mitigation is requesting a persistent storage bucket using `navigator.storage.persist()`. citeturn42search1turn42search4turn42search0

### The practical threat model for ArxMint

In a web wallet holding bearer proofs in-browser, the dominant threats generally fall into:

XSS / third-party script compromise: can read IndexedDB/localStorage and can also scrape decrypted proofs from memory when the wallet is unlocked. citeturn36search7turn37search0turn42search11

User/device loss or browser-data clearing: can wipe local proofs; recovery requires a protocol restore mechanism (NUT-13/NUT-09) and/or encrypted backups. citeturn46view0turn49view1turn45view0

Storage eviction / quota failure: can cause partial persistence and corruption-like UX; mitigated with IndexedDB + persistent storage requests + careful transactional writes. citeturn36search6turn42search1turn42search0

Therefore, “localStorage vs IndexedDB” is mostly a reliability/performance decision (IndexedDB wins), while “XSS hardening + encryption key management” is the security decision that actually determines whether the design is defensible. citeturn42search6turn37search0turn42search11

## Recovery primitives in the Cashu protocol

Cashu has explicit protocol-level restore and proof-state primitives that can be leveraged as your “money recovery” foundation.

### Deterministic secrets and seed phrase restore

NUT-13 describes deterministic secret generation designed specifically so that a wallet can recover its ecash balance using a familiar 12-word mnemonic seed phrase. citeturn46view0 The basic flow is: derive secrets deterministically, regenerate the same blinded outputs, and ask the mint to reissue previously generated blind signatures using NUT-09. citeturn46view0turn49view1

NUT-13 also provides concrete operational guidance: restore in batches (recommended size 100) until multiple consecutive batches return empty, and then set the counter accordingly. citeturn46view0 This is important because in real recovery the user often does not know the last-used counter. citeturn46view0

### Signature restore is mint-dependent

NUT-09 specifies the restore endpoint (`POST /v1/restore`) and is very explicit about what makes restore possible: mints must store each `BlindedMessage` and its corresponding `BlindSignature` at issuance time, and will only return signatures for previously signed outputs. citeturn49view1 In other words: NUT-13 recovery depends on mint support and mint implementation correctness, not just wallet implementation. citeturn46view0turn49view1

### Proof state checking supports crash recovery and safe cleanup

NUT-07 defines a mint endpoint to check proof state, with three states: `UNSPENT`, `PENDING`, and `SPENT`. citeturn49view0 It also gives two wallet-relevant use cases:

A wallet can mark proofs “pending” when preparing a send token and later query whether they were spent by the recipient, then safely delete spent proofs. citeturn49view0

A wallet that crashes or closes mid-Lightning melt can, on restart, check proofs marked pending to determine whether a payment is still in flight (`PENDING`), succeeded (`SPENT`), or failed (`UNSPENT`). citeturn49view0

Critically, NUT-07 states that mints MUST remember which proofs are currently pending to avoid reuse across concurrent transactions (example mechanism: a mutex keyed by the proof’s `Y`). citeturn49view0 This is the protocol-level analogue of your application-level “proof reservation/locking” requirement. citeturn49view0

### Token serialization formats constrain export design

NUT-00 defines token serialization. V3 tokens (`cashuA...`) are base64-encoded JSON and can include multiple mints, but are deprecated. citeturn47view0 V4 tokens (`cashuB...`) are CBOR-based and more space-efficient, but can only hold proofs from a single mint. citeturn48view1turn48view3 This directly impacts wallet export: a “full wallet export” is naturally a bundle of per-mint TokenV4 blobs, not one monolithic token. citeturn48view1turn48view3

### Payment requests are not proofs

NUT-26 defines an alternative encoding for Cashu payment requests using Bech32m + TLV: `creqb1{bech32m(...)}`. citeturn10view0 It explicitly positions itself as an alternative encoding for payment requests (depends on the NUT-18 request semantics) and includes tags such as `amount`, `unit`, and one or more `mint` URLs. citeturn10view0 This matters for your ArxMint model: payment requests should be persisted as “invoice/request metadata,” not as “bearer value,” and your storage layer should keep them in a separate collection/table from spendable proofs. citeturn10view0turn47view0

### Keyset ID hygiene is now a security requirement

NUT-02 recommends that wallets compute/verify keyset IDs themselves from public keys and warns that wallets should reject attempts to import new keysets whose IDs collide with previously added keysets. citeturn44view0

This is not theoretical. A January 2026 disclosure explains a practical attack against NUT-13 wallets using legacy keyset-ID-to-integer mapping: malicious mints can manipulate keyset IDs so their reduced integer representation collides with that of a target mint, leading to reuse of preimages/blinding factors across mints and enabling targeted theft under specific wallet behaviors. citeturn43view0 NUT-13 itself now labels the keyset-ID-to-integer mapping as “deprecated and unsafe” due to its small keyspace. citeturn46view0

For ArxMint, the actionable takeaway is: treat keyset version `01` (Keyset ID V2) and the HMAC-SHA256 deterministic derivation path as the default, and implement collision/validation checks as part of mint onboarding—especially in a multi-mint wallet where adversarial mints are in scope. citeturn44view0turn46view0turn43view0

### Multi-device mint configuration backup exists as a standard

NUT-27 defines a Nostr-based backup of mint lists using NIP-44 encryption and an addressable Nostr event (kind `30078`), with backup keys deterministically derived from the wallet mnemonic seed phrase. citeturn10view1 While it only covers mint configuration (not proofs), it’s directly relevant to your “multi-mint via Coco” and multi-device UX: you can standardize mint-list sync/restore without inventing your own format. citeturn10view1turn13view0

## Encryption and key management strategy

### What encryption at rest can and cannot do in a browser

Encrypting proofs at rest (in IndexedDB) meaningfully reduces risk from device theft, disk forensics, and accidental inclusion in “browser profile backup” or cloud sync of browser data. citeturn37search0turn42search11

It does **not** solve XSS: if malicious JavaScript runs in your origin, it can usually (a) read decrypted proofs from memory after unlock, and/or (b) call your own decryption routines while the wallet is unlocked. That’s why OWASP guidance treats “sensitive data stored in browser storage” as a high-impact issue in the presence of DOM-based XSS. citeturn42search11turn36search7

So the correct “defense in depth” stance is:

Use encryption at rest to reduce non-XSS leakage (lost laptop, stolen disk, backup exfil). citeturn37search0turn42search11

Treat XSS prevention and dependency minimization as the primary theft prevention control. citeturn36search7turn37search0turn42search11

### Recommended cryptography building blocks

For authenticated encryption of stored wallet blobs, AES-GCM is a standard AEAD mode. citeturn38search1turn38search8 AES-GCM is directly supported in the Web Crypto API surface used by browsers (SubtleCrypto). citeturn38search0turn38search8

For deriving a storage key from a human passphrase, modern practice strongly prefers memory-hard functions. RFC 9106 provides Argon2 recommendations. citeturn38search2 OWASP’s Password Storage guidance states Argon2id is the best choice, with scrypt as the fallback when Argon2 is not available. citeturn39search0 The scrypt KDF is standardized in RFC 7914. citeturn39search2 PBKDF2 is standardized in RFC 8018, and is widely available (including through WebCrypto), but is not memory-hard. citeturn39search1turn39search3

A pragmatic browser implementation approach therefore looks like:

Preferred: Argon2id via a well-maintained WASM library (because WebCrypto does not natively expose Argon2). citeturn38search2turn39search0turn38search0

Fallback: scrypt (often also via WASM/JS, but standardized and widely implemented). citeturn39search2turn39search0

Last resort: PBKDF2 via WebCrypto if you cannot ship a memory-hard KDF, with high iteration counts and robust salting. citeturn39search1turn39search3

### Nostr-based keying: what’s realistic

NIP-07 defines a `window.nostr` capability that provides functions like `getPublicKey()` and signing/encryption helpers, but it does not provide a “give me the private key” API. citeturn36search0 This has a direct architectural implication: if ArxMint uses Nostr auth via a browser extension, you generally cannot deterministically derive a symmetric storage key from the Nostr private key, because the private key is intentionally retained inside the signer boundary. citeturn36search0

NIP-44 defines how a conversation key is derived via ECDH and HKDF, and then used for encryption. citeturn36search5 NUT-27 provides a concrete “self-encryption” pattern over Nostr using NIP-44, with keys derived from the wallet mnemonic seed, not from NIP-07’s hidden signer key. citeturn10view1

So, for ArxMint you realistically have three options:

User passphrase → derive storage key client-side (strongest cross-device portability, no dependency on signer availability). citeturn39search0turn39search2turn39search1

Random master key generated on first run → store it wrapped/encrypted using a Nostr signer’s encryption primitives (convenient if users already have NIP-07 everywhere, but fragile if they don’t). citeturn36search0turn36search5

Mnemonic-based deterministic derivation (Cashu-style) → use NUT-13’s BIP39 mnemonic as the fundamental root secret for recovery, and optionally use NUT-27 for mint-list sync. citeturn46view0turn10view1

## Recommended architecture for ArxMint

This section is the concrete “what to build” recommendation, optimized for a Next.js web wallet that holds ecash in-browser across multiple mints, supports payment requests, and also runs AI agents with different persistence rules.

### Storage layer choice and rationale

Primary storage: encrypted IndexedDB “wallet vault.”

Use IndexedDB for proofs and wallet state because it is designed for structured, larger storage and is the standard browser database. citeturn42search6turn42search21 localStorage’s quota (~5 MiB) and synchronous semantics make it a poor fit for a multi-mint wallet that can accumulate many proofs and metadata. citeturn36search6turn37search0

Treat localStorage as “non-sensitive settings only.” OWASP guidance recommends not storing sensitive data in localStorage. citeturn37search0 (Cashu.me’s demonstrated approach of storing proofs in localStorage is informative as an ecosystem baseline, but it is not the direction you want for a security-focused application. citeturn24view0turn37search0)

Request persistent storage after the user “opts in” to storing value in the browser. Use `navigator.storage.persist()` so the browser is less likely to evict your wallet state under storage pressure. citeturn42search1turn42search4turn42search0

Use an explicit transactional repository layer. Coco’s architecture already treats proof management as storage-agnostic with web-friendly adapters (IndexedDB) and transaction-friendly repositories; even if you don’t fully adopt Coco internals, mirror its separation between wallet core logic and persistence adapter. citeturn13view0

### Data model

Store at least these logical collections (implementation as tables/object stores):

Proofs: one record per proof `(mint_url, unit, keyset_id, amount, secret, C, state, created_at, updated_at, tags…)`, but store `secret` and `C` only encrypted at rest. citeturn47view0turn38search1

Proof state metadata: a non-sensitive index for selection and locking (e.g., amount, mint, unit, keyset id, and local `state` = available/reserved/pending/spent). NUT-07 semantics should inform state transitions. citeturn49view0

Deterministic counters per keyset: cashu-ts v3 has deterministic counters and explicitly emits an event when counters are atomically reserved so apps can persist the “next” value. citeturn41search0turn46view0 This must be persisted transactionally with proof updates to avoid “counter rollback” and accidental secret reuse across restarts. citeturn41search0turn46view0turn43view0

Operation log (“saga/outbox”): persist in-flight operations (mint quote, melt quote, send, receive, swap) with enough information to recover after crash. NUT-07 explicitly addresses restart recovery for pending melts, and CDK release notes show a mature “saga pattern” plus two-phase prepare/confirm flows to support crash resilience. citeturn49view0turn40search0

Payment requests: store `creqA...`/`creqb...` request objects separately from proofs. NUT-26 defines the request encoding and fields; these are not spendable bearer instruments themselves. citeturn10view0turn47view0

### Encryption scheme

Use AES-256-GCM for encrypting wallet blobs and proof secrets at rest. citeturn38search1turn38search8 Encrypt-then-store to IndexedDB. Keep the master key in memory only while the wallet is “unlocked.” citeturn38search0turn42search11

Key derivation:

Default: user passphrase → Argon2id-derived storage key. RFC 9106 provides Argon2id parameter guidance, and OWASP recommends Argon2id as best choice. citeturn38search2turn39search0 In practice, you will tune parameters below the RFC’s “2 GiB RAM” baseline to fit typical devices, but still aim for memory hardness. citeturn38search2turn39search0

Fallback: scrypt (RFC 7914) if Argon2id is not feasible. citeturn39search2turn39search0

Last resort: PBKDF2 via WebCrypto if you cannot ship memory-hard KDF code, with high iteration counts. citeturn39search1turn39search3

Nostr support:

Do not assume you can derive keys from a Nostr private key when using NIP-07; NIP-07 exposes signing/encryption methods but not the private key. citeturn36search0 If you want a “Nostr login unlocks wallet key” experience, use the signer to wrap/unwrap a randomly generated wallet master key, or use a mnemonic-derived Cashu seed as the root secret (NUT-13 / NUT-27 patterns). citeturn36search0turn46view0turn10view1

### Backup and restore UX flow

Provide a tiered recovery model, because different users have different tolerance for friction.

Primary recovery: NUT-13 seed phrase.

If you mint deterministically, NUT-13 is explicitly designed to allow recovery with a 12-word BIP39 mnemonic. citeturn46view0 Implement it as your canonical “device loss” path, with per-mint restore loops and NUT-07 checkstate filtering of spent proofs. citeturn46view0turn49view0turn49view1

Practical impact: users who lose their browser storage can still restore as long as (a) they kept the mnemonic and (b) their mints support the NUT-09 restore endpoint and have retained the blinded-message/signature database required by NUT-09. citeturn46view0turn49view1 Your UI must communicate that mint support matters (detectable via mint info settings described in NUT-09 and NUT-07). citeturn49view1turn49view0

Secondary recovery: encrypted export snapshot.

Offer an “Export backup” that produces a single encrypted file (or encrypted blob) containing:

Wallet metadata (version, creation time, app version).

Mint list + units.

Deterministic counters for keysets (so restore doesn’t need to scan from counter 0 if you choose to optimize). citeturn46view0turn41search0

Proofs, serialized as a set of TokenV4 blobs (one per mint) because TokenV4 is single-mint by design. citeturn48view1turn48view3

Then encrypt the entire export with the same AES-GCM master key used for at-rest encryption. citeturn38search1turn38search8

This export is not a replacement for NUT-13; it is a convenience snapshot that restores immediately without mint restore calls.

Optional: server-side “cloud backup” of encrypted snapshots.

If you want multi-device convenience, store the encrypted export blob server-side, keyed by an identifier (e.g., Nostr pubkey). This is “zero-knowledge” only if your server never sees an unwrap key and only stores ciphertext. citeturn37search0turn42search11

Use NUT-27 for mint list sync.

Even if you don’t sync proofs via Nostr, NUT-27 gives a standard way to back up and restore the mint list across devices using NIP-44 encryption and mnemonic-derived keys. citeturn10view1 This reduces one of the most common restore failure modes: restoring proofs but missing the mint URLs needed to contact the correct mints.

### Multi-device sync and double-spend risk

A multi-device wallet is effectively managing a set of spendable “UTXO-like objects” (proofs). Two devices can race to spend the same proofs; one will win, one will fail, and the losing device must reconcile. NUT-07’s `PENDING` and `SPENT` semantics are built exactly to support this reconciliation post-crash or post-race. citeturn49view0

Implement a three-layer locking strategy:

Local reservation: maintain a local `reserved` state so coin selection never reuses proofs within one device session. (This mirrors NUT-07’s wallet behavior recommendations for marking proofs pending in the wallet database.) citeturn49view0

Server-coordinated reservations (recommended if you add sync): when a device begins a spend/melt/send, it “leases” the chosen proof identifiers for a short TTL so other devices avoid selecting them. This prevents most user-confusing races without requiring the server to hold plaintext proofs. citeturn49view0turn42search11

Mint truth checks: before finalizing a spend, and on recovery from any interruption, call `/v1/checkstate` and interpret `UNSPENT/PENDING/SPENT` as the source of truth for spendability. citeturn49view0

Crash resilience should be treated as a first-class feature, not an edge case. CDK’s recent wallet release highlights “wallet sagas” and a two-phase prepare/confirm pattern for melts specifically to support robust error recovery and scenarios where a pending melt can be awaited later or recovered via background mechanisms. citeturn40search0 While you’re using cashu-ts, you can still borrow the *pattern*: persist operation state transitions and implement compensating actions if a step fails.

### Agent wallet persistence and separation

Your agent wallets have different requirements than the human wallet: they are intended to be scoped and ephemeral, but they still must not cause user fund loss if a process crashes mid-transaction.

Recommended separation model:

Human wallet vault: persists proofs (encrypted) in IndexedDB, with user-driven backups and recovery. citeturn42search6turn38search1turn46view0

Agent wallet vault: separate namespace and separate key material. Do not mix agent proofs with the human proof pool. OWASP guidance about sensitive data in browser storage becomes even more relevant if agent code has broader tool access and a larger dependency surface. citeturn42search11turn36search7

Agent persistence rule:

Default: agent proofs are in-memory only (true ephemerality).

Exception: persist only the minimum “operation log” and “pending proof set” for crash recovery with a short TTL, then wipe. NUT-07 explicitly motivates checking pending proofs after crash to determine whether payments succeeded, failed, or are still pending. citeturn49view0

Optional stronger safety: fund agents with locked proofs.

If agents must hold value but you want to reduce theft risk from simple bearer-proof leakage, consider allocating funds to agents via locked proofs (Pay-to-Pubkey), so spending requires a signature witness rather than just possession. NUT-11 describes that P2PK proofs require Schnorr signatures in `Proof.witness` to spend. citeturn12search11 Minibits explicitly implements user-facing “lock ecash to receiver wallet key (P2PK)” and lock expiry for recovery—evidence that this pattern is practical in real wallets. citeturn26view0

This gives you a clean model: agents can only spend within their scoped key control, and if an agent crashes, you can allow the lock to expire and recover funds back into the human wallet based on your policy. citeturn12search11turn26view0

### Mandatory protocol safety checks for multi-mint

Given the 2026 disclosure around deterministic secret derivation collisions and keyset ID manipulation, implement the following as mint onboarding gates:

Compute/verify keyset IDs per NUT-02 (don’t blindly trust mint-provided IDs). citeturn44view0turn43view0

Reject keyset ID collisions with previously known keysets, as NUT-02 explicitly warns. citeturn44view0

Prefer Keyset ID V2 (`01...`) and HMAC-SHA256 deterministic derivation per NUT-13; treat legacy `00...` as higher-risk, and consider UI warnings or refusal depending on your threat model. citeturn44view0turn46view0turn43view0

Avoid “auto-add mint and auto-swap” behaviors for received tokens from unknown mints, because the disclosed attack requires the victim wallet to interact with attacker-controlled mints and then spend/swaps. citeturn43view0

## Migration path from Zustand-only to the recommended architecture

A safe migration is incremental: first stop losing proofs on refresh, then harden storage, then add recovery UX, then add sync.

### Introduce a persistence adapter behind your wallet state

Create a repository interface (ProofRepo, CounterRepo, OperationRepo) and move all proof mutations (add/remove/reserve/unreserve/mark-pending/spent) behind it. Coco’s architecture demonstrates the value of separating wallet logic from the storage adapter and provides web-friendly IndexedDB adapter patterns you can imitate. citeturn13view0

Initially, run the repo in “plaintext IndexedDB” mode to validate correctness and avoid data loss during rollout (you can keep the encryption feature-flagged). IndexedDB is the right primitive for a structured proof database. citeturn42search6turn42search21

### Add deterministic counter persistence correctly

If you are using NUT-13-style deterministic outputs/counters (common in cashu-ts v3), persist counters atomically. cashu-ts documentation states deterministic outputs reserve per-keyset counters atomically and emit an event so apps can persist the “next” value. citeturn41search0 Make that event write (counter update + resulting proof writes) a single IndexedDB transaction. This is not just reliability—it is a security requirement to avoid secret reuse pathways that deterministic designs are explicitly trying to control. citeturn46view0turn43view0turn41search0

### Add encryption at rest and an unlock lifecycle

Once correctness is validated, add:

A vault unlock flow (passphrase-based KDF).

AES-GCM encryption for proofs-at-rest. citeturn38search1turn38search8

Auto-lock on idle and wipe in-memory key material (defense-in-depth against opportunistic attacks; it does not negate XSS risk but reduces exposure windows). citeturn42search11turn36search7

Request persistent storage after the user opts into storing value, to reduce eviction risk. citeturn42search1turn42search4

### Implement recovery UX in the order that reduces “money loss” fastest

NUT-13 seed phrase backup/restore should be implemented early because it directly addresses catastrophic loss (device/browser wipe). citeturn46view0turn49view1

Then add “encrypted export snapshot” as a convenience restore option, using TokenV4 per mint. citeturn48view1turn48view3turn38search1

Then optionally add:

Encrypted cloud backup (ciphertext only).

NUT-27 mint list backup via Nostr, which standardizes one key piece of multi-device restore. citeturn10view1

### Add pending-operation recovery and locking before multi-device sync

Even on a single device, you need crash recovery for melts and sends. Use NUT-07’s flow: mark proofs pending, on restart check `UNSPENT/PENDING/SPENT`, and reconcile. citeturn49view0

Once that is stable, multi-device sync becomes an incremental step: add server-coordinated leases/locks and an event-driven refresh mechanism, but always defer to NUT-07 checkstate as the ultimate truth. citeturn49view0turn42search11

### Split agent wallets last, once the core vault is stable

Finally, implement “human vault vs agent vault” separation:

Separate stores and keys.

Agent TTL enforcement.

Persist only minimal pending-operation logs for crash recovery per NUT-07. citeturn49view0turn42search11

If needed, graduate to P2PK-locked allowances for agents (supported by protocol semantics in NUT-11 and evidenced by Minibits’ practical implementation). citeturn12search11turn26view0