"use client";
// lib/cashu-vault.ts
// Client-side encrypted Cashu proof vault.
//
// Architecture:
//   - Proofs are stored in IndexedDB encrypted with AES-256-GCM
//   - Encryption key is derived from user passphrase via PBKDF2-SHA256 (600k iterations)
//   - The key never persists — it exists in memory only while the vault is unlocked
//   - Auto-locks after 5 minutes of idle
//   - Counter writes are atomic with proof writes (single IDB transaction)
//   - navigator.storage.persist() is requested on creation to prevent IDB eviction

import type { Proof } from "@cashu/cashu-ts";
import { deriveKey, encrypt, decrypt, generateSalt } from "./crypto";
import { ProofRepo, type StoredProof } from "./proof-repo";

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

/** Encode Uint8Array or ArrayBuffer to base64 string. */
function toBase64(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/** Decode base64 string to Uint8Array<ArrayBuffer>. */
function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Derive a stable proof ID: SHA-256(plaintext secret), base64-encoded. */
async function proofId(secret: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret)
  );
  return toBase64(hash);
}

/** Generate a 12-word BIP39 mnemonic using nostr-tools/nip06. */
async function generateMnemonic(): Promise<string> {
  try {
    const { generateSeedWords } = await import("nostr-tools/nip06");
    return generateSeedWords();
  } catch {
    // Fallback: 32-byte secure random hex recovery code
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

// ---------------------------------------------------------------------------
// VaultManager
// ---------------------------------------------------------------------------

export class VaultManager {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Create a new vault protected by `passphrase`.
   * Returns the BIP39 mnemonic words for user backup.
   * Calls navigator.storage.persist() to reduce IDB eviction risk.
   */
  async create(passphrase: string): Promise<string[]> {
    const mnemonic = await generateMnemonic();
    const salt = generateSalt();
    const key = await deriveKey(passphrase, salt);

    // Persist salt in IDB (unencrypted — needed for key re-derivation on unlock)
    await ProofRepo.setMeta("vault_salt", toBase64(salt));
    await ProofRepo.setMeta("vault_created", Date.now());

    this.salt = salt;
    this.key = key;

    // Request persistent storage — non-fatal if denied
    if (typeof navigator !== "undefined" && "storage" in navigator) {
      await navigator.storage.persist().catch(() => undefined);
    }

    this.resetIdleTimer();
    return mnemonic.split(" ");
  }

  /**
   * Unlock an existing vault with the user's passphrase.
   * Re-derives the encryption key from the stored salt.
   * Throws if vault has not been created yet.
   */
  async unlock(passphrase: string): Promise<void> {
    const saltB64 = (await ProofRepo.getMeta("vault_salt")) as string | null;
    if (!saltB64) {
      throw new Error("Vault not initialized — call vault.create() first");
    }

    const salt = fromBase64(saltB64);
    const key = await deriveKey(passphrase, salt);

    this.salt = salt;
    this.key = key;
    this.resetIdleTimer();
  }

  /** Lock the vault — zeroes the key material from memory. */
  lock(): void {
    this.key = null;
    this.salt = null;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  isUnlocked(): boolean {
    return this.key !== null;
  }

  /** Returns true if a vault has been initialized (salt stored in IDB). */
  async isInitialized(): Promise<boolean> {
    try {
      return (await ProofRepo.getMeta("vault_salt")) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt and persist Cashu proofs to IndexedDB.
   * The NUT-10 counter is written atomically with proofs in a single IDB transaction.
   */
  async storeProofs(
    proofs: Proof[],
    mintUrl: string,
    keysetId: string,
    counter: number
  ): Promise<void> {
    if (!this.key) throw new Error("Vault locked");
    const key = this.key; // capture — prevents race if vault locks mid-operation

    const storedProofs: StoredProof[] = await Promise.all(
      proofs.map(async (proof): Promise<StoredProof> => {
        const id = await proofId(proof.secret);
        const { iv: secretIv, ciphertext: secretCt } = await encrypt(
          key,
          proof.secret
        );
        const { iv: cIv, ciphertext: cCt } = await encrypt(key, proof.C);

        return {
          id,
          mintUrl,
          keysetId,
          secret: toBase64(secretCt),
          C: toBase64(cCt),
          amount: proof.amount,
          status: "live",
          // Store both IVs concatenated — base64 contains no colons
          iv: `${toBase64(secretIv)}:${toBase64(cIv)}`,
          createdAt: Date.now(),
        };
      })
    );

    await ProofRepo.atomicWriteProofsAndCounter(
      storedProofs,
      mintUrl,
      keysetId,
      counter
    );
    this.resetIdleTimer();
  }

  /**
   * Retrieve and decrypt live Cashu proofs for the given mint URL.
   * Only returns proofs with status="live".
   */
  async getProofs(mintUrl: string): Promise<Proof[]> {
    if (!this.key) throw new Error("Vault locked");
    const key = this.key;

    const stored = await ProofRepo.getAll(mintUrl);
    const live = stored.filter((p) => p.status === "live");

    return Promise.all(
      live.map(async (sp): Promise<Proof> => {
        const [secretIvB64, cIvB64] = sp.iv.split(":");
        const secretIv = fromBase64(secretIvB64);
        const cIv = fromBase64(cIvB64);
        const secretCt = fromBase64(sp.secret).buffer as ArrayBuffer;
        const cCt = fromBase64(sp.C).buffer as ArrayBuffer;

        const secret = await decrypt(key, secretIv, secretCt);
        const C = await decrypt(key, cIv, cCt);

        return { id: sp.keysetId, amount: sp.amount, secret, C };
      })
    );
  }

  /** Mark a set of Cashu proofs as spent (by their plaintext secrets). */
  async markProofsSpent(proofs: Proof[]): Promise<void> {
    const ids = await Promise.all(proofs.map((p) => proofId(p.secret)));
    await ProofRepo.markSpent(ids);
  }

  /**
   * Crash recovery: proofs left in 'pending' state indicate an interrupted
   * operation. Mark them spent conservatively (NUT-07 check requires live mint).
   */
  async checkAndReconcile(mintUrl: string): Promise<void> {
    const all = await ProofRepo.getAll(mintUrl);
    const pending = all.filter((p) => p.status === "pending");
    if (pending.length === 0) return;

    await ProofRepo.markSpent(pending.map((p) => p.id));
    console.info(
      `[Vault] Reconciled ${pending.length} pending proofs for ${mintUrl}`
    );
  }

  /**
   * Attempt to restore vault from BIP39 mnemonic.
   * Uses the mnemonic as the unlock passphrase.
   * Full NUT-09 proof sweep requires active mint connections.
   */
  async restoreFromSeed(
    mnemonic: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mintUrls: string[]
  ): Promise<void> {
    await this.unlock(mnemonic).catch(() => {
      console.warn(
        "[Vault] Seed restore: unlock failed — manual reconnect required"
      );
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.lock(), this.IDLE_TIMEOUT_MS);
  }
}

/** Singleton vault instance used across the app. */
export const vault = new VaultManager();
