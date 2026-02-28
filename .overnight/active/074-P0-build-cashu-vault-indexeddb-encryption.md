---
id: 74
title: "Build client-side encrypted Cashu vault (IndexedDB + AES-256-GCM)"
priority: P0
severity: critical
status: completed
source: overnight_tasks_id_2
file: lib/cashu-vault.ts
line: 1
created: "2026-02-28T06:00:00Z"
execution_hint: long_running
context_group: cashu_vault
group_reason: "Multi-file creation: cashu-vault.ts + crypto.ts + proof-repo.ts. NUT-13 seed backup (task 095) depends on this."
---

# Build client-side encrypted Cashu vault (IndexedDB + AES-256-GCM)

**Priority:** P0 (critical)
**Source:** OVERNIGHT_TASKS.md ID 2
**Location:** lib/cashu-vault.ts (new file), lib/crypto.ts (new file), lib/proof-repo.ts (new file)

## Problem

ArxMint is NON-CUSTODIAL — Cashu proofs must be stored CLIENT-SIDE ONLY. Currently `lib/cashu-sdk.ts` uses `localStorage` for proof storage, which has critical problems:
1. **localStorage is synchronous and quota-limited** (~5MB) — fails silently on storage full
2. **localStorage is not encrypted** — any XSS attack exposes all proof bearer tokens
3. **No crash recovery** — mid-payment crash can lose proofs permanently
4. **No counter persistence** — NUT-10 counter desync causes secret reuse vulnerability

Research #1 & #5 require:
- **IndexedDB** (not localStorage) for proof storage — larger quota, async, OWASP-recommended
- **AES-256-GCM encryption** via Web Crypto API — proofs encrypted at rest
- **Argon2id KDF** from user passphrase — key derivation per RFC 9106
- **Atomic counter writes** — counter must persist atomically with proof writes
- **NUT-13 seed phrase** — 12-word BIP39 mnemonic for primary recovery
- **Saga pattern** for crash recovery — mark proofs pending before operations, reconcile on restart

## How to Fix

### Create `lib/crypto.ts`

AES-256-GCM encryption + Argon2id KDF:

```typescript
// lib/crypto.ts
// AES-256-GCM encryption with Argon2id key derivation

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  // Use PBKDF2 as Argon2id WASM is not available in all environments
  // Fallback: PBKDF2-SHA256 with 600,000 iterations (OWASP 2023 minimum)
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(key: CryptoKey, data: string): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv, ciphertext };
}

export async function decrypt(key: CryptoKey, iv: Uint8Array, ciphertext: ArrayBuffer): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}
```

### Create `lib/proof-repo.ts`

Repository abstraction over IndexedDB:

```typescript
// lib/proof-repo.ts
// Repository abstraction — follows Coco's storage-agnostic pattern

export interface StoredProof {
  id: string;          // proof.secret hash
  mintUrl: string;
  keysetId: string;
  secret: string;      // encrypted
  C: string;           // encrypted
  amount: number;
  status: 'live' | 'pending' | 'spent';
  iv: Uint8Array;
  createdAt: number;
}

// IndexedDB adapter — wraps idb operations with typed methods
export class ProofRepo {
  static async open(): Promise<IDBDatabase> { /* open arxmint-vault IDB */ }
  static async put(proof: StoredProof): Promise<void> { /* IDB put */ }
  static async getAll(mintUrl: string): Promise<StoredProof[]> { /* IDB getAll by mintUrl index */ }
  static async markSpent(proofIds: string[]): Promise<void> { /* atomic update */ }
  static async getCounter(mintUrl: string, keysetId: string): Promise<number> { /* counter store */ }
  static async atomicWriteProofsAndCounter(proofs: StoredProof[], mintUrl: string, keysetId: string, counter: number): Promise<void> {
    // CRITICAL: single IDB transaction — prevents counter desync
  }
}
```

### Create `lib/cashu-vault.ts`

VaultManager lifecycle + integration with cashu-ts:

```typescript
// lib/cashu-vault.ts
'use client';

export class VaultManager {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  async create(passphrase: string): Promise<string[]> {
    // Generate mnemonic (12-word BIP39)
    // Derive salt + key from passphrase
    // Store salt in IDB (unencrypted — needed for re-derivation)
    // Set this.key (in-memory only while unlocked)
    // Request navigator.storage.persist()
    // Return mnemonic words for user backup
  }

  async unlock(passphrase: string): Promise<void> {
    // Read salt from IDB
    // Re-derive key from passphrase + salt
    // Set this.key
    // Start idle auto-lock timer
  }

  lock(): void {
    this.key = null;
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }

  isUnlocked(): boolean { return this.key !== null; }

  async storeProofs(proofs: Proof[], mintUrl: string, keysetId: string, counter: number): Promise<void> {
    if (!this.key) throw new Error('Vault locked');
    // Encrypt each proof's secret and C using this.key
    // Call ProofRepo.atomicWriteProofsAndCounter() — single IDB tx
    this.resetIdleTimer();
  }

  async getProofs(mintUrl: string): Promise<Proof[]> {
    if (!this.key) throw new Error('Vault locked');
    // Read StoredProof[] from ProofRepo
    // Decrypt secret and C for each
    // Return as Proof[] for cashu-ts
  }

  async restoreFromSeed(mnemonic: string, mintUrls: string[]): Promise<void> {
    // Derive key from mnemonic
    // For each mint: call NUT-09 /v1/restore in batches of 100
    // Store restored proofs in vault
  }

  async checkAndReconcile(mintUrl: string): Promise<void> {
    // On app start: find proofs with status='pending'
    // Call NUT-07 /v1/checkstate to verify
    // Mark confirmed or lost accordingly
  }
}

export const vault = new VaultManager();
```

### Update `lib/store.ts`

Replace localStorage proof storage with vault calls:
- `hydrateProofs()` → call `vault.getProofs(mintUrl)`
- `storeProofs()` → call `vault.storeProofs(proofs, mintUrl, keysetId, counter)`
- Add vault lock state to Zustand store

## Acceptance Criteria

- [ ] `lib/crypto.ts` created with `deriveKey()`, `encrypt()`, `decrypt()`, `generateSalt()`
- [ ] `lib/proof-repo.ts` created with `ProofRepo` class and IndexedDB adapter
- [ ] `lib/cashu-vault.ts` created with `VaultManager` class
- [ ] `vault.create()` generates mnemonic and derives encryption key
- [ ] `vault.unlock()` re-derives key from passphrase + stored salt
- [ ] `vault.lock()` zeroes key material from memory
- [ ] `vault.storeProofs()` encrypts proofs before writing to IndexedDB
- [ ] Counter writes are atomic with proof writes (single IDB transaction)
- [ ] `lib/store.ts` updated to use vault instead of localStorage for proofs
- [ ] `navigator.storage.persist()` is requested on vault creation
- [ ] `npm run build` passes

## Notes

_Generated from OVERNIGHT_TASKS.md ID 2. This is the largest single task — may require multiple iterations. NUT-13 seed backup UI (task 095) depends on this._
